define(function (require, exports, module) {
    "use strict";

    var Commands       = require("command/Commands");
    var CommandManager = require("command/CommandManager");
    var PopoverWidget  = require("editor/PopoverWidget");

    var popoverContent = "<button type=\"button\" onclick=\"return window.triggerEditorProvider();\" class=\"btn btn-default btn-editor-provider\"></button>";

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

        var popover = {
            editor: editor,
            content: popoverContent,
            xpos: coord.left,
            ytop: coord.top,
            ybot: coord.bottom
        };

        PopoverWidget.show(popover);
    }

    exports.show = showIndicator;
    exports.hide = hideIndicator;

    // HACK: for testing
    window.triggerEditorProvider = triggerEditorProvider;
});
