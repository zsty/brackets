/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
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


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/**
 * A "modal bar" component. This is a lightweight replacement for modal dialogs that
 * appears at the top of the editor area for operations like Find and Quick Open.
 */
define(function (require, exports, module) {
    "use strict";
    
    var EditorManager = require("editor/EditorManager");

    /**
     * @constructor
     *
     * Creates a modal bar whose contents are the given template. Dispatches the "close" event when it's
     * closed.
     *
     * @param {string} template The HTML contents of the modal bar.
     * @param {boolean} autoCloseOnBlur If true, then close the dialog if the modal bar loses focus to 
     *      an outside item.
     */
    function ModalBar(template, autoCloseOnBlur) {
        this._handleFocusChange = this._handleFocusChange.bind(this);
        
        this._$root = $("<div class='modal-bar'/>")
            .html(template)
            .appendTo("#main-toolbar");

        if (autoCloseOnBlur) {
            this._autoCloseOnBlur = true;
            window.document.body.addEventListener("focusin", this._handleFocusChange, true);
        }
        
        // Preserve scroll position across the editor refresh, adjusting for the height of the modal bar
        // so the code doesn't appear to shift if possible.
        var activeEditor = EditorManager.getActiveEditor(),
            scrollPos;
        if (activeEditor) {
            scrollPos = activeEditor.getScrollPos();
        }
        EditorManager.resizeEditor();
        if (activeEditor) {
            activeEditor._codeMirror.scrollTo(scrollPos.x, scrollPos.y + this._$root.outerHeight());
        }
    }
    
    /**
     * A jQuery object containing the root node of the ModalBar.
     */
    ModalBar.prototype._$root = null;
    
    /**
     * True if this ModalBar is set to automatically close on blur.
     */
    ModalBar.prototype._autoCloseOnBlur = false;
    
    /**
     * Closes the modal bar and returns focus to the active editor. Dispatches the "close" event.
     */
    ModalBar.prototype.close = function () {
        var barHeight = this._$root.outerHeight();

        if (this._autoCloseOnBlur) {
            window.document.body.removeEventListener("focusin", this._handleFocusChange, true);
        }
        
        this._$root.remove();

        // Preserve scroll position across the editor refresh, adjusting for the height of the modal bar
        // so the code doesn't appear to shift if possible.
        var activeEditor = EditorManager.getActiveEditor(),
            scrollPos;
        if (activeEditor) {
            scrollPos = activeEditor.getScrollPos();
        }
        EditorManager.resizeEditor();
        if (activeEditor) {
            activeEditor._codeMirror.scrollTo(scrollPos.x, scrollPos.y - barHeight);
        }
        EditorManager.focusEditor();
        
        $(this).triggerHandler("close");
    };
    
    /**

     * If autoCloseOnBlur is set, detects when something other than the modal bar is getting focus and
     * dismisses the modal bar.
     */
    ModalBar.prototype._handleFocusChange = function (e) {
        if (!$.contains(this._$root.get(0), e.target)) {
            this.close();
        }
    };
    
    /**
     * @return {jQueryObject} A jQuery object representing the root of the ModalBar.
     */
    ModalBar.prototype.getRoot = function () {
        return this._$root;
    };
        
    exports.ModalBar = ModalBar;
});