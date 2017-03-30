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
        PreferencesManager = brackets.getModule("preferences/PreferencesManager");

    var panel
        , icon = null 
        , panelHTML = require("text!htmlContent/console.html");

    icon = $("<a id='editor-console-icon' href='#'> </a>");
    icon.attr("title", "Console");
    icon.appendTo($("#main-toolbar .buttons"));

    var logData = []
        , filters = {error: false, log: true, warn: false}
        , livePreviewOnly = false;


    function count(data, type) {

        var i = 0
            , result = 0;

        for (i = 0; i < data.length; i++) {
            if (data[i].type === type && (!livePreviewOnly || getLivePreviewData(data[i]))) {
                result++;
            }
        }

        return result;
    }

    function clear() {
        var $console = panel.$panel.find(".console");
        $console.html("");
    }

    function flush() {
        var countBtns = panel.$panel.find(".label");

        logData = [];

        $(countBtns[0]).html(count(logData, 'error'));
        $(countBtns[1]).html(count(logData, 'warn'));
        $(countBtns[2]).html(count(logData, 'log'));
    }

    function getLivePreviewData(data) {
        var matchString = "ConsoleAgent: "
            , re = new RegExp("^" + matchString);
        if (data.isLivePreviewData) {
            return data;
        }

        if (data.text.match(re)) {
            data.isLivePreviewData = true;
            data.text = data.text.slice(matchString.length);
            return data;
        } else {
            return null;
        }
    }

    function filter(data) {
        var i = 0
            , result = []
            , livePreviewData;

        for (i = 0; i < data.length; i++) {
            if (filters[data[i].type]) {
                if (livePreviewOnly) {
                    livePreviewData = getLivePreviewData(data[i]);
                    if (livePreviewData) {
                        result.push(livePreviewData);
                    }
                } else {
                    result.push(data[i]);
                }
            }
        }

        return result;
    }

    function render() {
        var $console = panel.$panel.find(".console")
            , $element = ""
            , countBtns = panel.$panel.find(".label")
            , data = filter(logData) 
            , i = 0;

        clear();

        // This creates the individual messages
        for (i = 0; i < data.length; i++) {
            $element = $(`<div class='${data[i].type}'><pre>${data[i].text}</pre></div>`);
            $console.append($element);
        }

        $console.animate({ scrollTop: $console[0].scrollHeight }, 10);

        $(countBtns[0]).html(count(logData, 'error'));
        $(countBtns[1]).html(count(logData, 'warn'));
        $(countBtns[2]).html(count(logData, 'log'));
    }

    /**
    * Logs a message to console.
    * @param msg
    */
    function add(msg, type) {
        var texts = msg.toString().split('\n'), i = 0;

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
            icon.addClass("on");
        }
    }

    AppInit.htmlReady(function () {

        ExtensionUtils.loadStyleSheet(module, "../stylesheets/consoleTheme.css");

        panel = WorkspaceManager.createBottomPanel("console.panel", $(panelHTML));
        panel.show();

        panel.$panel.find("#btnClear").on("click", function () {
            clear();
            flush();
        });

        panel.$panel.find("#btnLivePreviewOnly").on("click", function () {
            livePreviewOnly = !livePreviewOnly;
            $(this).toggleClass('disabled');

            clear();
            render();
        });

        panel.$panel.find("#filterBtns > button").on("click", function () {

            var filter = $(this).attr('data-filter');

            filters[filter] = !filters[filter];

            clear();
            render();

            if (!filters[filter]) {
                $(this).addClass('disabled');
            } else {
                $(this).removeClass('disabled');
            }
        });

        panel.$panel.find(".close").on("click", function () {
            panel.hide();
            icon.removeClass("on");
        });

        // icon.on("click", togglePanel);

    });

    var _log = console.log
        , _warn = console.warn
        , _error = console.error;

    console.log = function () {
        var arg = arguments;

        add(arg[0], 'log');
        return _log.apply(console, arguments);
    };

    console.warn = function () {
        var arg = arguments;

        add(arg[0], 'warn');
        return _warn.apply(console, arguments);
    };

    console.error = function () {
        var arg = arguments;

        add(arg[0], 'error');
        return _error.apply(console, arguments);
    };
});
