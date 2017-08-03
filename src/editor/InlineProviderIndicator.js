define(function (require, exports, module) {
    "use strict";

    var PopoverWidget = require("editor/PopoverWidget");

    var popoverContent = {
        docsOnly: "<button type=\"button\" class=\"btn btn-default btn-doc-provider\">Docs</button>",
        editorOnly: "<button type=\"button\" class=\"btn btn-default btn-editor-provider\">Editor</button>"
    };

    function hideIndicator() {
        PopoverWidget.hide();
    }

    function showIndicator(editor, docsAvailable, editorAvailable) {
        var cm = editor._codeMirror;
        var pos = editor.getCursorPos();
        var coord = cm.charCoords(pos);
        var token = cm.getTokenAt(pos, true);

        var content;
        if(docsAvailable && editorAvailable) {
            content = popoverContent.docsOnly + "&nbsp;" + popoverContent.editorOnly;
        } else if (docsAvailable && !editorAvailable) {
            content = popoverContent.docsOnly;
        } else {
            content = popoverContent.editorOnly;
        }

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
});
