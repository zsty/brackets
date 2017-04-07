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

            // Handle Blob URLS
            var stackTrace = args[1].split(",");
            for(var i = 0; i < stackTrace.length; i++) {
                var trace = stackTrace[i].split(":");
                trace = BlobUtils.getFilename("blob:" + trace[1] + ":" + trace[2] + ":" +  trace[3]);
                trace = trace.split("/");
                args[0] = args[0] + trace[trace.length - 1];
            }
            args = args[0];
        }

        if (type === "time" || type === "timeEnd"){
            args[0] = type + ": " + args[0];
        }

        // console[type].apply(console, args);
        ConsoleInterfaceManager.add(args, type);
    }

    exports.getRemoteScript = getRemoteScript;
    exports.isConsoleRequest = isConsoleRequest;
    exports.handleConsoleRequest = handleConsoleRequest;
});
