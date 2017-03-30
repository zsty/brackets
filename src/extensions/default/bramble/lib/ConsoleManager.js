define(function (require, exports, module) {
    "use strict";

    var ConsoleManagerRemote = require("text!lib/ConsoleManagerRemote.js");
    var ConsoleInterfaceManager = require("lib/ConsoleInterfaceManager");

    function getRemoteScript() {
        return "<script>\n" + ConsoleManagerRemote + "</script>\n";
    }

    function isConsoleRequest(msg) {
        return msg.match(/^bramble-console/);
    }

    function handleConsoleRequest(data) {
        var args = data.args;
        var type = data.type || "log";

        if (type === "time" || type === "timeEnd"){
            args[0] = type + ": " + args[0];
        }

        // TODO: Show this in Custom Console UI, see issue #1675 in Thimble
        console[type].apply(console, args);
        ConsoleInterfaceManager.add(args, type);
    }

    exports.getRemoteScript = getRemoteScript;
    exports.isConsoleRequest = isConsoleRequest;
    exports.handleConsoleRequest = handleConsoleRequest;
});
