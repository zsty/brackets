define(function (require, exports, module) {
    "use strict";

    var Commands       = require("command/Commands");
    var CommandManager = require("command/CommandManager");
    var PopoverWidget  = require("editor/PopoverWidget");

    var popoverContent = {
        docsOnly: "<button type=\"button\" onclick=\"return window.triggerDocsProvider();\" class=\"btn btn-default btn-doc-provider\">Docs</button>",
        editorOnly: "<button type=\"button\" onclick=\"return window.triggerEditorProvider();\" class=\"btn btn-default btn-editor-provider\"></button>"
    };

    function triggerDocsProvider() {
        CommandManager.execute(Commands.TOGGLE_QUICK_DOCS);
        hideIndicator();
        return false;
    }

    function triggerEditorProvider() {
        CommandManager.execute(Commands.TOGGLE_QUICK_EDIT);
        hideIndicator();
        return false;
    }

    function hideIndicator() {
        PopoverWidget.hide();
    }

    function showIndicator(editor, docsAvailable, editorAvailable) {
        var cm = editor._codeMirror;
        var pos = editor.getCursorPos();
        var coord = cm.charCoords(pos);
        var token = cm.getTokenAt(pos, true);

        // var content;
        // if(docsAvailable && editorAvailable) {
            // content = popoverContent.editorOnly;
        // } else if (docsAvailable && !editorAvailable) {
            // content = popoverContent.docsOnly;
        // } else {
            // content = popoverContent.editorOnly;
        // }

        var content = popoverContent.editorOnly;

        var popover = {
            editor: editor,
            content: content,
            xpos: coord.left,
            ytop: coord.top,
            ybot: coord.bottom
        };

        PopoverWidget.show(popover);
    }

    exports.show = showIndicator;
    exports.hide = hideIndicator;

    // HACK: for testing
    window.triggerDocsProvider = triggerDocsProvider;
    window.triggerEditorProvider = triggerEditorProvider;
});
