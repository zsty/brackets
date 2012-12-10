/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, doReplace */


/*
 * Adds Find and Replace commands
 *
 * Originally based on the code in CodeMirror2/lib/util/search.js.
 */
define(function (require, exports, module) {
    "use strict";

    var CommandManager      = require("command/CommandManager"),
        Commands            = require("command/Commands"),
        Strings             = require("strings"),
        EditorManager       = require("editor/EditorManager"),
        ModalBar            = require("widgets/ModalBar").ModalBar,
        FindBarTemplate     = require("text!search/FindBarTemplate.html");
    
    var modalBar;
    
    function SearchState() {
        this.posFrom = this.posTo = this.query = null;
        this.marked = [];
    }

    function getSearchState(cm) {
        if (!cm._searchState) {
            cm._searchState = new SearchState();
        }
        return cm._searchState;
    }

    function getSearchCursor(cm, query, pos) {
        // Heuristic: if the query string is all lowercase, do a case insensitive search.
        return cm.getSearchCursor(query, pos, typeof query === "string" && query === query.toLowerCase());
    }
    
    function getFindField() {
        return $(".find input", modalBar.getRoot());
    }

    function parseQuery(query) {
        var isRE = query.match(/^\/(.*)\/([a-z]*)$/),
            $modalBar = modalBar.getRoot();
        $(".replace", $modalBar).removeClass("fully-hide");
        $(".error", $modalBar).removeClass("show");
        try {
            return isRE ? new RegExp(isRE[1], isRE[2].indexOf("i") === -1 ? "" : "i") : query;
        } catch (e) {
            $(".replace", $modalBar).addClass("fully-hide");
            $(".error", $modalBar)
                .addClass("show")
                .html("<div class='alert-message' style='margin-bottom: 0'>" + e.message + "</div>");
            return "";
        }
    }

    /**
     * Creates the modal bar with the given content.
     */
    function displayModalBar(template) {
        if (modalBar) {
            modalBar.close();
        }
        
        modalBar = new ModalBar(template, true);
        $(modalBar)
            .on("close", function () {
                modalBar = null;
            });
        modalBar.getRoot()
            .on("keydown", function (e) {
                if (e.keyCode === 27) { // ESC
                    e.stopPropagation();
                    modalBar.close();
                }
            });
    }
    
    function clearSearch(cm) {
        cm.operation(function () {
            var state = getSearchState(cm),
                i;
            if (!state.query) {
                return;
            }
            state.query = null;
            
            // Clear highlights
            for (i = 0; i < state.marked.length; ++i) {
                state.marked[i].clear();
            }
            state.marked.length = 0;
        });
    }
    
    function findNext(cm, rev) {
        var found = true;
        cm.operation(function () {
            var state = getSearchState(cm);
            var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
            if (!cursor.find(rev)) {
                // If no result found before hitting edge of file, try wrapping around
                cursor = getSearchCursor(cm, state.query, rev ? {line: cm.lineCount() - 1} : {line: 0, ch: 0});
                
                // No result found, period: clear selection & bail
                if (!cursor.find(rev)) {
                    cm.setCursor(cm.getCursor());  // collapses selection, keeping cursor in place to avoid scrolling
                    found = false;
                    return;
                }
            }
            cm.setSelection(cursor.from(), cursor.to());
            state.posFrom = cursor.from();
            state.posTo = cursor.to();
            state.findNextCalled = true;
        });
        return found;
    }

    // Called each time the search query changes while being typed. Jumps to the first matching
    // result, starting from the original cursor position
    function findFirst(cm, query, rev, searchStartPos) {
        cm.operation(function () {
            if (!query) {
                return;
            }
            
            var state = getSearchState(cm);
            if (state.query) {
                clearSearch(cm);  // clear highlights from previous query
            }
            state.query = parseQuery(query);
            
            // Highlight all matches
            // FUTURE: if last query was prefix of this one, could optimize by filtering existing result set
            if (cm.lineCount() < 2000) { // This is too expensive on big documents.
                var cursor = getSearchCursor(cm, query);
                while (cursor.findNext()) {
                    state.marked.push(cm.markText(cursor.from(), cursor.to(), "CodeMirror-searching"));
                }
            }
            
            state.posFrom = state.posTo = searchStartPos;
            var foundAny = findNext(cm, rev);
            
            if (modalBar) {
                getFindField().toggleClass("no-results", !foundAny);
            }
        });
    }
    
    /**
     * Replace all occurrences of the find string with the replace string.
     */
    function replaceAll(cm) {
        var query = parseQuery(getFindField().val());
        if (!query) {
            return;
        }
        
        var text = $(".replace input", modalBar.getRoot()).val();
        
        cm.compoundChange(function () {
            cm.operation(function () {
                var match, cursor = getSearchCursor(cm, query), fnMatch = function (w, i) { return match[i]; };
                while (cursor.findNext()) {
                    if (typeof query !== "string") {
                        match = cm.getRange(cursor.from(), cursor.to()).match(query);
                        cursor.replace(text.replace(/\$(\d)/, fnMatch));
                    } else {
                        cursor.replace(text);
                    }
                }
            });
        });
    }
    
    /**
     * If the current selection matches the query, then replace it and advance to the next match,
     * otherwise just advance.
     */
    function replaceNext(cm) {
        var query = parseQuery(getFindField().val());
        if (!query) {
            return;
        }
        
        var start = cm.getCursor(true),
            end = cm.getCursor(false),
            cursor = getSearchCursor(cm, query, start),
            match = cursor.findNext();
        if (start.line === cursor.from().line && start.ch === cursor.from().ch &&
                end.line === cursor.to().line && end.ch === cursor.to().ch) {
            var text = $(".replace input", modalBar.getRoot()).val();
            cursor.replace(typeof query === "string" ? text :
                                text.replace(/\$(\d)/, function (w, i) { return match[i]; }));
        }
        findNext(cm);
    }

    /**
     * If no search pending, opens the search dialog. If search is already open, moves to
     * next/prev result (depending on 'rev')
     */
    function doSearch(cm, rev, initialQuery, showReplace) {
        var state = getSearchState(cm);
        if (state.query) {
            return findNext(cm, rev);
        }
        
        displayModalBar(FindBarTemplate);
        
        var $findField = getFindField();
        $findField
            .focus()
            .on("keydown", function (e) {
                if (e.keyCode === 13) { // Return
                    e.stopPropagation();
                    e.preventDefault();
                    if (!state.findNextCalled) {
                        // If findNextCalled is false, this means the user has *not*
                        // entered any search text *or* pressed Cmd-G/F3 to find the
                        // next occurrence. In this case we want to start searching
                        // *after* the current selection so we find the next occurrence.
                        findFirst(cm, $findField.val(), false, cm.getCursor(false));
                    } else if (state.query) {
                        findNext(cm);
                    }
                }
            })
            .on("input", function () {
                findFirst(cm, $findField.val());
            })
            .on("mousedown", function () {
                // TODO: Why is this necessary?
                $(this).focus();
            });
        
        $("#find-prev", modalBar.getRoot())
            .on("click", function () {
                if (state.query) {
                    findNext(cm, true);
                } else {
                    findFirst(cm, $findField.val(), true, cm.getCursor(true));
                }
            });
        $("#find-next", modalBar.getRoot())
            .on("click", function () {
                if (state.query) {
                    findNext(cm);
                } else {
                    findFirst(cm, $findField.val(), false, cm.getCursor(true));
                }
            });
        
        if (showReplace) {
            $(".replace", modalBar.getRoot()).addClass("show");
            
            $(".replace input", modalBar.getRoot())
                .on("keydown", function (e) {
                    if (e.keyCode === 13) { // Return
                        e.stopPropagation();
                        e.preventDefault();
                        replaceNext(cm);
                    }
                })
                .on("mousedown", function () {
                    // TODO: Why is this necessary?
                    $(this).focus();
                });

            $("#replace-one", modalBar.getRoot())
                .on("click", function () {
                    replaceNext(cm);
                });
            $("#replace-all", modalBar.getRoot())
                .on("click", function () {
                    replaceAll(cm);
                });
        }

        // Prepopulate the search field with the current selection, if any.
        if (initialQuery !== undefined) {
            $findField
                .val(initialQuery)
                .get(0).select();
            findFirst(cm, initialQuery, rev, cm.getCursor(true));
            // Clear the "findNextCalled" flag here so we have a clean start
            state.findNextCalled = false;
        }
    }

    function _launchFind(showReplace) {
        var editor = EditorManager.getActiveEditor();
        if (editor) {
            var codeMirror = editor._codeMirror;

            clearSearch(codeMirror);
            doSearch(codeMirror, false, codeMirror.getSelection(), showReplace);
        }
    }

    function _findNext() {
        var editor = EditorManager.getActiveEditor();
        if (editor) {
            doSearch(editor._codeMirror);
        }
    }

    function _findPrevious() {
        var editor = EditorManager.getActiveEditor();
        if (editor) {
            doSearch(editor._codeMirror, true);
        }
    }

    CommandManager.register(Strings.CMD_FIND,           Commands.EDIT_FIND,          function () { _launchFind(false); });
    CommandManager.register(Strings.CMD_FIND_NEXT,      Commands.EDIT_FIND_NEXT,     _findNext);
    CommandManager.register(Strings.CMD_REPLACE,        Commands.EDIT_REPLACE,       function () { _launchFind(true); });
    CommandManager.register(Strings.CMD_FIND_PREVIOUS,  Commands.EDIT_FIND_PREVIOUS, _findPrevious);
});
