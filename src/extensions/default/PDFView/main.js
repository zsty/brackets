/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

define(function (require, exports, module) {
    "use strict";

    var MainViewFactory = brackets.getModule("view/MainViewFactory"),
        Content         = brackets.getModule("filesystem/impls/filer/lib/content"),
        Path            = brackets.getModule("filesystem/impls/filer/BracketsFiler").Path,
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        AppInit         = brackets.getModule("utils/AppInit"),
        PDFView         = require("PDFView");

    // Initialize extension
    AppInit.appReady(function () {
        ExtensionUtils.loadStyleSheet(module, "styles/styles.less");

        MainViewFactory.registerViewFactory({
            canOpenFile: function (fullPath) {
                return Content.isPDF(Path.extname(fullPath));
            },
            openFile: function (file, pane) {
                return PDFView.create(file, pane);
            }
        });
    });

});
