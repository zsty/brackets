define(function (require, exports, module) {
    "use strict";

    var ConsoleManagerRemote = require("text!lib/ConsoleManagerRemote.js");
    var ConsoleInterfaceManager = require("lib/ConsoleInterfaceManager");
    var BlobUtils = brackets.getModule("filesystem/impls/filer/BlobUtils");

    function getRemoteScript() {
        return "<script>\n" + ConsoleManagerRemote + "</script>\n";
    }

    function isConsoleRequest(msg) {
        return msg.match(/^bramble-console/);
    }

    function handleConsoleRequest(data) {
        var args = data.args;
        var type = data.type || "log";

        if (type === "error-handler") {
            type = "error";
			args[0] = args["Stack"];
        }

        if (type === "time" || type === "timeEnd"){
            args[0] = type + ": " + args[0];
        }

        console[type].apply(console, args);
        ConsoleInterfaceManager.add(args, type);
    }

    exports.getRemoteScript = getRemoteScript;
    exports.isConsoleRequest = isConsoleRequest;
    exports.handleConsoleRequest = handleConsoleRequest;
});
