/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Alexandru Ghiura
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * /

/*jslint vars: true, plusplus: true, nomen: true */
/*global define, console, brackets, $, Mustache */

define(function (require, exports, module) {
    "use strict";

    var AppInit = brackets.getModule("utils/AppInit"),
        WorkspaceManager = brackets.getModule("view/WorkspaceManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        Mustache = brackets.getModule("thirdparty/mustache/mustache"),
        Strings = brackets.getModule("strings");

    var panel,
        icon = null,
        panelHTML = require("text!htmlContent/console.html");
    
    // panelHTML = Mustache.parse(panelHTML, {"Strings": Strings});

    icon = $("<button class=\"editor-console-icon-indicator\" title='{{CONSOLE_TOOLTIP}}'>{{CONSOLE_TITLE}}</button>");
    // icon = Mustache.parse(icon, {"Strings": Strings});
    icon.appendTo($("#editor-holder"));

    var logData = [],
        livePreviewOnly = false;

    var wasClosedByUser = false;

    function count(data, type) {
        var i = 0,
            result = 0;

        for (i = 0; i < data.length; i++) {
            if (data[i].type === type && (!livePreviewOnly)) {
                result++;
            }
        }
        return result;
    }

    function clear() {
        var $console = panel.$panel.find(".console");
        $console.html("");
    }

    function render() {
        var $console = panel.$panel.find(".console"),
            $element = "", 
            data = logData, 
            i = 0;

        clear();

        // This creates the individual messages
        for (i = 0; i < data.length; i++) {
            $element = $("<div class='" + data[i].type + "'>" + data[i].text +"</div>");
            $console.append($element);
        }

        $console.animate({ scrollTop: $console[0].scrollHeight }, 10);
    }

    function add(type, args) {
        // Display the console when user code triggers console.* functions
        if(!panel.isVisible() && !wasClosedByUser) {
            panel.show();
        }
        
        var texts = args.toString().split('\n'), 
            i = 0;

        for (i = 0; i < texts.length; i++) {
            logData.push({type: type, text: texts[i]});
        }

        render();
    }

    function togglePanel() {
        if (panel.isVisible()) {
            panel.hide();
            icon.removeClass("on");
        } else {
            panel.show();
            wasClosedByUser = false;
            icon.addClass("on");
        }
    }

    AppInit.htmlReady(function () {

        ExtensionUtils.loadStyleSheet(module, "../stylesheets/consoleTheme.css");

        panel = WorkspaceManager.createBottomPanel("console.panel", $(panelHTML));

        panel.$panel.find("#btnClear").on("click", function () {
            clear();
        });

        panel.$panel.find(".close").on("click", function () {
            panel.hide();
            icon.removeClass("on");
            wasClosedByUser = true;
        });

        icon.on("click", togglePanel);

        // Localization
        panelHTML = Mustache.render(panelHTML, {"Strings": Strings});
        icon = Mustache.render(icon, {"Strings": Strings});
    });
    exports.add = add;
});
