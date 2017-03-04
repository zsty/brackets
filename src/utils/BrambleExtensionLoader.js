/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define */

/**
 * BrambleExtensionLoader allows optional enabling/disabling of extensions
 * based on query string params.
 */

define(function (require, exports, module) {
    "use strict";

    var PathUtils = require("thirdparty/path-utils/path-utils");
    var Path      = require("filesystem/impls/filer/BracketsFiler").Path;
    var basePath  = PathUtils.directory(window.location.href);

    // Load the list of extensions. If you want to add/remove extensions, do it in this json file.
    var extensionInfo = JSON.parse(require("text!extensions/bramble-extensions.json"));

<<<<<<< HEAD
    // Disable any extensions we found on the query string's ?disableExtensions= param
=======
    /**
     * We have a set of defaults we load if not instructed to do otherwise
     * via the disableExtensions query param. These live in src/extensions/default/*
     */
    var brambleDefaultExtensions = [
        "CSSCodeHints",
        "HTMLCodeHints",
        "JavaScriptCodeHints",
        "InlineColorEditor",
        "JavaScriptQuickEdit",
        "QuickOpenCSS",
        "QuickOpenHTML",
        "QuickOpenJavaScript",
        "QuickView",
        "WebPlatformDocs",
        "CodeFolding",

        // Custom extensions we want loaded by default
        "bramble",
        "Autosave",
        "brackets-paste-and-indent",
        "BrambleUrlCodeHints",
        "UploadFiles",
        "bramble-move-file",
        "Brackets-InteractiveLinter"
    ];

    /**
     * There are some Brackets default extensions that we don't load
     * but which a user might want to enable (note: not all the defaults
     * they ship will work in a browser, so they aren't all here). We
     * support loading these below via the enableExtensions param.
     */
    var bracketsDefaultExtensions = [
        "SVGCodeHints",
        "HtmlEntityCodeHints",
        "LESSSupport",
        "CloseOthers",
        "InlineTimingFunctionEditor",
        "JSLint",
        "QuickOpenCSS",
        "RecentProjects",
        "UrlCodeHints"
    ];

    /**
     * Other extensions we've tested and deemed useful in the Bramble context.
     * These live in src/extensions/extra/* and are usually submodules.  If you
     * add a new extension there, update this array also.  You can have this load
     * by adding the extension name to the enableExtensions query param.
     */
    var extraExtensions = [
        "brackets-cdn-suggestions",    // https://github.com/szdc/brackets-cdn-suggestions
        "HTMLHinter",
        "MDNDocs",
        "SVGasXML",
        "bramble-watch-index.html"
    ];

    // Disable any extensions we found on the query string's disableExtensions param
>>>>>>> Rework https://github.com/MiguelCastillo/Brackets-InteractiveLinter to load in browser
    function _processDefaults(disableExtensions) {
        disableExtensions = disableExtensions ? disableExtensions.trim().split(/\s*,\s*/) : [];

        var brambleExtensions = [];
        extensionInfo.forEach(function(info) {
            var extPath = info.path;
            var extBasename = Path.basename(extPath);

            // Skip this extension if we've been instructed to disable via URL.
            // Support both 'extensions/default/Autosave' and 'Autosave' forms.
            if(disableExtensions.indexOf(extBasename) > -1 ||
               disableExtensions.indexOf(extPath) > -1           ) {
                console.log("[Bramble] Skipping loading of extension " + extBasename + " at " + extPath);
                return;
            }

            brambleExtensions.push({
                name: extPath,
                path: Path.join(basePath, extPath)
            });
        });

        return brambleExtensions;
    }

    exports.getExtensionList = function(params) {
        return _processDefaults(params.get("disableExtensions"));
    };
});
