define(function (require, exports, module) {
    "use strict";

    var Commands       = require("command/Commands");
    var CommandManager = require("command/CommandManager");
    var AppInit        = require("utils/AppInit");
    var PopoverWidget  = require("editor/PopoverWidget");

    var popoverContent = "<span></span>";

    var disabled = false;

    function enable() {
        disabled = false;
    }

    function disable() {
        disabled = true;
        hideIndicator();
    }

    function triggerEditorProvider() {
        CommandManager.execute(Commands.TOGGLE_QUICK_EDIT);
        hideIndicator();
        return false;
    }

    function hideIndicator() {
        PopoverWidget.hide();
    }

    function showIndicator(editor) {
        var cm = editor._codeMirror;
        var pos = editor.getCursorPos();
        var coord = cm.charCoords(pos);

        if(disabled) {
            return;
        }

        var popover = {
            editor: editor,
            content: popoverContent,
            xpos: coord.left,
            ytop: coord.top,
            ybot: coord.bottom,
            onClick: triggerEditorProvider
        };

        PopoverWidget.show(popover);
    }

    function init() {
        var editorHolder = $("#editor-holder")[0];
        // Note: listening to "scroll" also catches text edits, which bubble a scroll event
        // up from the hidden text area. This means/ we auto-hide on text edit, which is
        // probably actually a good thing.
        editorHolder.addEventListener("scroll", hideIndicator, true);
    }

    AppInit.appReady(init);

    exports.enable = enable;
    exports.disable = disable;
    exports.show = showIndicator;
    exports.hide = hideIndicator;
});
