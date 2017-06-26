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

    var DocumentManager     = brackets.getModule("document/DocumentManager"),
        ProjectManager      = brackets.getModule("project/ProjectManager"),
        Strings             = brackets.getModule("strings"),
        StringUtils         = brackets.getModule("utils/StringUtils"),
        FileSystem          = brackets.getModule("filesystem/FileSystem"),
        UrlCache            = brackets.getModule("filesystem/impls/filer/UrlCache"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        _                   = brackets.getModule("thirdparty/lodash"),
        Mustache            = brackets.getModule("thirdparty/mustache/mustache"),
        PDFViewTemplate     = require("text!htmlContent/pdf-view.html");

    // Get a URL out of the cache
    function _getPDFUrl(path) {
        return encodeURIComponent(UrlCache.getUrl(path));
    }

    /**
     * PDFView objects are constructed when a PDF file is opened
     * @see {@link Pane} for more information about where PDFViews are rendered
     *
     * @constructor
     * @param {!File} file - The PDF file object to render
     * @param {!jQuery} container - The container to render the image view in
     */
    function PDFView(file, $container) {
        this.file = file;
        var fullPath = file.fullPath;
        this.relPath = ProjectManager.makeProjectRelativeIfPossible(fullPath);

        this.$container = $container;
        this.$el = $(Mustache.render(PDFViewTemplate, {
            pdfUrl: _getPDFUrl(fullPath),
            locale: brackets.getLocale()
        }));
        $container.append(this.$el);

//        this.$imagePath = this.$el.find(".image-path");
//        this.$imagePreview = this.$el.find(".image-preview");
//        this.$imageData = this.$el.find(".image-data");
//
//        this.$image = this.$el.find(".image");
//        this.$imageScale = this.$el.find(".image-scale");
//        this.$imagePreview.on("load", _.bind(this._onImageLoaded, this));
//        this.$imagePreview.on("error", _.bind(console.error, console));
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
    PDFView.prototype._onFilenameChange = function (e, oldPath, newPath) {
        /*
         * File objects are already updated when the event is triggered
         * so we just need to see if the file has the same path as our image
         */
        if (this.file.fullPath === newPath) {
            this.relPath = ProjectManager.makeProjectRelativeIfPossible(newPath);
        }
    };

    /**
     * <img>.on("load") handler - updates content of the image view
     *                            initializes computed values
     *                            installs event handlers
     * @param {Event} e - event
     * @private
     */
    PDFView.prototype._onImageLoaded = function (e) {
        // TODO: figure this out...

        // make sure we always show the right file name
        //DocumentManager.on("fileNameChange.PDFView", _.bind(this._onFilenameChange, this));
    };

    /**
     * View Interface functions
     */

    /*
     * Retrieves the file object for this view
     * return {!File} the file object for this view
     */
    PDFView.prototype.getFile = function () {
        return this.file;
    };

    /*
     * Updates the layout of the view
     */
    PDFView.prototype.updateLayout = function () {
        var $container = this.$container;

        var pos = $container.position(),
            iWidth = $container.innerWidth(),
            iHeight = $container.innerHeight(),
            oWidth = $container.outerWidth(),
            oHeight = $container.outerHeight();

        // $view is "position:absolute" so
        //  we have to update the height, width and position
        this.$el.css({
            top: pos.top + ((oHeight - iHeight) / 2),
            left: pos.left + ((oWidth - iWidth) / 2),
            width: iWidth,
            height: iHeight
        });
    };

    /*
     * Destroys the view
     */
    PDFView.prototype.destroy = function () {
        this.$el.remove();
    };

    /*
     * Refreshes the image preview with what's on disk
     */
    PDFView.prototype.refresh = function () {
        console.log("refresh");
        // Update the DOM node with the src URL
        // TODO
        //this.$imagePreview.attr("src", _getPDFUrl(this.file));
    };

    /*
     * Creates a PDF view object and adds it to the specified pane
     * @param {!File} file - the file to create an image of
     * @param {!Pane} pane - the pane in which to host the view
     * @return {jQuery.Promise}
     */
    function create(file, pane) {
        var view = pane.getViewForPath(file.fullPath);
        if (view) {
            console.log("found view, showing", file);
            pane.showView(view);
        } else {
            console.log("no view found, creating", file);
            view = new PDFView(file, pane.$content);
            pane.addView(view, true);
        }

        return new $.Deferred().resolve(view.getFile()).promise();
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

    exports.create = create;
});
