/*
 * Copyright (c) 2013 - present Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

define(function (require, exports, module) {
    "use strict";

    var DocumentManager     = require("document/DocumentManager"),
        VideoViewTemplate   = require("text!htmlContent/video-view.html"),
        ProjectManager      = require("project/ProjectManager"),
        PreferencesManager  = require("preferences/PreferencesManager"),
        LanguageManager     = require("language/LanguageManager"),
        MainViewFactory     = require("view/MainViewFactory"),
        Strings             = require("strings"),
        StringUtils         = require("utils/StringUtils"),
        FileSystem          = require("filesystem/FileSystem"),
        BlobUtils           = require("filesystem/impls/filer/BlobUtils"),
        FileUtils           = require("file/FileUtils"),
        _                   = require("thirdparty/lodash"),
        Mustache            = require("thirdparty/mustache/mustache"),
        Image               = require("editor/Image");


    var _viewers = {};

    // Get a Blob URL out of the cache
    function _getVideoUrl(file) {
        return BlobUtils.getUrl(file.fullPath);
    }

    /**
     * Whether or not this is an image, or an SVG image (vs SVG XML file).
     */
    function isVideo(fullPath) {
        var lang = LanguageManager.getLanguageForPath(fullPath);
        var id = lang.getId();
        return id === "video";
    }

    /**
     * ImageView objects are constructed when an image is opened
     * @see {@link Pane} for more information about where ImageViews are rendered
     *
     * @constructor
     * @param {!File} file - The image file object to render
     * @param {!jQuery} container - The container to render the image view in
     */
    function VideoView(file, $container) {
        this.file = file;

        this.$el = $(Mustache.render(VideoViewTemplate, {
            videoUrl: _getVideoUrl(file),
            Strings: Strings
        }));

        console.log("Before timeout");
        console.log(_getVideoUrl(file));
        var that = this;

        setTimeout(function(){
            console.log("After timeout");
            console.log(_getVideoUrl(file));
            that.$videoEl.attr("src", _getVideoUrl(that.file));
        }, 1000);

        $container.append(this.$el);

        this._naturalWidth = 0;
        this._naturalHeight = 0;

        this.relPath = ProjectManager.makeProjectRelativeIfPossible(this.file.fullPath);

        // this.$imagePath = this.$el.find(".image-path");
        this.$videoEl = this.$el.find("video");
        this.$videoData = this.$el.find(".video-data");

        this.$videoEl.on("canplay", _.bind(this._onVideoLoaded, this));
        this.$videoEl.on("error", _.bind(console.error, console));

        _viewers[file.fullPath] = this;
    }

    /**
     * DocumentManger.fileNameChange handler - when an image is renamed, we must
     * update the view
     *
     * @param {jQuery.Event} e - event
     * @param {!string} oldPath - the name of the file that's changing changing
     * @param {!string} newPath - the name of the file that's changing changing
     * @private
     */
    VideoView.prototype._onFilenameChange = function (e, oldPath, newPath) {
        /*
         * File objects are already updated when the event is triggered
         * so we just need to see if the file has the same path as our image
         */
        if (this.file.fullPath === newPath) {
            this.relPath = ProjectManager.makeProjectRelativeIfPossible(newPath);
        }
    };

    /**
     * <video>.on("canplay") handler - updates content of the image view
     *                             initializes computed values
     *                            installs event handlers
     * @param {Event} e - event
     * @private
     */
    VideoView.prototype._onVideoLoaded = function (e) {
        this._naturalWidth = e.target.videoWidth;
        this._naturalHeight = e.target.videoHeight;

        var extension = FileUtils.getFileExtension(this.file.fullPath);
        var stringFormat = Strings.IMAGE_DIMENSIONS;
        var dimensionString = StringUtils.format(stringFormat, this._naturalWidth, this._naturalHeight);

        this.$videoData.html(dimensionString);

        DocumentManager.on("fileNameChange.VideoView", _.bind(this._onFilenameChange, this));
    };

    /**
     * View Interface functions
     */

    /*
     * Retrieves the file object for this view
     * return {!File} the file object for this view
     */
    VideoView.prototype.getFile = function () {
        return this.file;
    };

    /*
     * Updates the layout of the view
     */
    VideoView.prototype.updateLayout = function () {
        return;
    };

    /*
     * Destroys the view
     */
    VideoView.prototype.destroy = function () {
        delete _viewers[this.file.fullPath];
        DocumentManager.off(".ImageView");
        this.$image.off(".ImageView");
        this.$el.remove();
    };

    /*
     * Refreshes the image preview with what's on disk
     */
    VideoView.prototype.refresh = function () {
        // Update the DOM node with the src URL
        this.$videoEl.attr("src", _getVideoUrl(this.file));
    };

    /*
     * Creates an image view object and adds it to the specified pane
     * @param {!File} file - the file to create an image of
     * @param {!Pane} pane - the pane in which to host the view
     * @return {jQuery.Promise}
     */
    function _createVideoView(file, pane) {
        var view = pane.getViewForPath(file.fullPath);

        if (view) {
            pane.showView(view);
        } else {
            view = new VideoView(file, pane.$content);
            pane.addView(view, true);
        }
        return new $.Deferred().resolve().promise();
    }

    /**
     * Handles file system change events so we can refresh
     *  image viewers for the files that changed on disk due to external editors
     * @param {jQuery.event} event - event object
     * @param {?File} file - file object that changed
     * @param {Array.<FileSystemEntry>=} added If entry is a Directory, contains zero or more added children
     * @param {Array.<FileSystemEntry>=} removed If entry is a Directory, contains zero or more removed children
     */
    function _handleFileSystemChange(event, entry, added, removed) {
        // this may have been called because files were added
        //  or removed to the file system.  We don't care about those
        if (!entry || entry.isDirectory) {
            return;
        }

        // Look for a viewer for the changed file
        var viewer = _viewers[entry.fullPath];

        // viewer found, call its refresh method
        if (viewer) {
            viewer.refresh();
        }
    }

    /*
     * Install an event listener to receive all file system change events
     * so we can refresh the view when changes are made to the image in an external editor
     */
    FileSystem.on("change", _handleFileSystemChange);

    /*
     * Initialization, register our view factory
     */
    MainViewFactory.registerViewFactory({
        canOpenFile: function (fullPath) {
            return isVideo(fullPath);
        },
        openFile: function (file, pane) {
            return _createVideoView(file, pane);
        }
    });

    /*
     * This is for extensions that want to create a
     * view factory based on ImageViewer
     */
    exports.VideoView = VideoView;
});
