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


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, CodeMirror */

/**
 * Set of utilities for simple parsing of LESS text.
 */
define(function (require, exports, module) {
    'use strict';
    
    var Async               = require("utils/Async"),
        DocumentManager     = require("document/DocumentManager"),
        EditorManager       = require("editor/EditorManager"),
        FileIndexManager    = require("project/FileIndexManager"),
        NativeFileSystem    = require("file/NativeFileSystem").NativeFileSystem;

    /**
     * Extracts all LESS selectors from the given text
     * Returns an array of selectors. Each selector is an object with the following properties:
         selector:                 the text of the selector (note: comma separated selector groups like 
                                   "h1, h2" are broken into separate selectors)
         ruleStartLine:            line in the text where the rule (including preceding comment) appears
         ruleStartChar:            column in the line where the rule (including preceding comment) starts
         selectorStartLine:        line in the text where the selector appears
         selectorStartChar:        column in the line where the selector starts
         selectorEndLine:          line where the selector ends
         selectorEndChar:          column where the selector ends
         selectorGroupStartLine:   line where the comma-separated selector group (e.g. .foo, .bar, .baz)
                                   starts that this selector (e.g. .baz) is part of. Particularly relevant for
                                   groups that are on multiple lines.
         selectorGroupStartChar:   column in line where the selector group starts.
         declListEndLine:          line where the declaration list for the rule ends
         declListEndChar:          column in the line where the declaration list for the rule ends
     * @param text {!String} CSS text to extract from
     * @return {Array.<Object>} Array with objects specifying selectors.
     */
    function _extractAllSelectors(text) {
        var mode = CodeMirror.getMode({}, "less");
        var state = CodeMirror.startState(mode);

        var token, style, stream, i;

        //var inAtRule = false; - TODO: still need special handling of @media or other @-rules ?
        
        var lastComment = null;
        
        var lines = CodeMirror.splitLines(text);
        var lineCount = lines.length;
        
        var containingRules = [];
        var pendingRule = null;
        
        var doneRules = [];
        var selectors = [];
        
        
        var col;
        
        function beginSelector() {
            pendingRule.pendingSelector = {
                selector: "",
                selectorStartLine: i,       // FIXME: this may be wrong because we call beginSelector() at the separating "," which may be on a preceding line
                selectorStartChar: col
            };
        }
        function addToSelector() {
            if (i > pendingRule.pendingSelector.selectorStartLine) {
                pendingRule.pendingSelector.selector += " "; // TODO: only add if no trailing ws already
            }
            pendingRule.pendingSelector.selector += token;
        }
        function finishSelector() {
            pendingRule.pendingSelector.selectorEndLine = i;       // FIXME: this may be wrong because we call finishSelector() at the separating "," or "{" which may be on a later line
            pendingRule.pendingSelector.selectorEndChar = col - 1;
            pendingRule.pendingSelector.selector = pendingRule.pendingSelector.selector.trim();
            pendingRule.selectors.push(pendingRule.pendingSelector);
            pendingRule.pendingSelector = null;
        }
        
        function isSelectorLikeToken() {
            if (style === "tag" || style === "atom") {
                return true;
            }
            if (style === null) {
                return (/[+>*\/&:]/).test(token);
            }
            return false;
        }
        
        for (i = 0; i < lineCount; ++i) {
            stream = new CodeMirror.StringStream(lines[i]);
            while (!stream.eol()) {
                style = mode.token(stream, state);
                token = stream.current();
                
                col = 0;

                // DEBUG STATEMENT -- printer(token, style, i, stream.start, state.stack);
//                console.log("Token " + style + " \t'" + token + "'\t@  [" + state.stack + "]");
                
                if (style === "comment") {
                    // Comment on the same line as the last rule's "}" isn't counted
                    if (lines[i].substring(0, stream.start).indexOf('}') === -1) {
                        lastComment = {line: i, col: col};
                    }
                    
                } else if (isSelectorLikeToken()) {
                    // This may be a new rule, start of a new selector in an existing selector group
                    // we're already parsing, or continuing of a selector we've already read some of
                    if (!pendingRule) {
                        pendingRule = { selectors: [],
                                        parent: containingRules[containingRules.length - 1],
                                        ruleStartLine: lastComment ? lastComment.line : i,
                                        ruleStartChar: lastComment ? lastComment.col : col,
                                        selectorGroupStartLine: i,
                                        selectorGroupStartChar: col
                                       };
                    }
                    if (!pendingRule.pendingSelector) {
                        beginSelector();
                    }
                    addToSelector(token);
                    
                    
                } else {
                    // We check this case even if pendingRule, since the tokenizer will claim things
                    // like "color:red" contain a "tag" token (":red"), and we'll have wrongly started a
                    // pendingRule. We don't want that to prevent breaking out of the current containing rule.
                    if (token === "}") {
                        // Done with entire rule
                        if (containingRules.length > 0) {
                            var endedRule = containingRules.pop();
                            endedRule.declListEndLine = i;
                            endedRule.declListEndChar = col;
                            doneRules.push(endedRule);
                            
                            // Discard any partial/erroneous selectors (see comment above)
                            pendingRule = null;
                        }
                    } else if (pendingRule) {
                        if (token === ",") {
                            // Done with selector, still working on selector group
                            finishSelector();
                            beginSelector();
                        } else if (token === "{") {
                            // Done with selector
                            finishSelector();
                            
                            // Done with entire selector group, about to work on rule body
                            pendingRule.selectorGroupEndLine = i;
                            pendingRule.selectorGroupEndChar = col;
                            containingRules.push(pendingRule);
                            pendingRule = null;
                        } else if (token === ";") {
                            // This means we got a false alarm that looked like a selector but turned out not to be
                            // (e.g. "color:red" is a selector if followed by "{" but not if followed by ";" or "}")
                            pendingRule = null;
                        } else {
                            // Includes style="tag" (more of selector) or style=null (whitespace or selector-operator)
                            addToSelector(token);
                        }
                    }
                }
                
                // Comment separated from next rule by anything other than whitespace isn't counted
                // We don't do this at the top of the loop because at that point we haven't yet decided whether the
                // current token is the start of that next rule (and if it is we don't want to drop the comment yet)
                if (style !== "comment" && token.trim() !== "") {
                    lastComment = null;
                }
                
                // advance the stream past this token
                stream.start = stream.pos;
            }
        }
        
//        console.log(doneRules);
        
        // Convert doneRules[] to selectors[]
        function getSelectorPrefixes(rule) {
            var s, p;
            
            if (!rule.parent) {
                return [""];
            }
            var parentPrefixes = getSelectorPrefixes(rule.parent);
            var prefixes = [];
            for (s = 0; s < rule.parent.selectors.length; s++) {
                for (p = 0; p < parentPrefixes.length; p++) {
                    var parentSelector = rule.parent.selectors[s].selector;
                    var combined;
                    if (parentSelector[0] === "&") {
                        combined = parentPrefixes[p] + parentSelector.substr(1);
                    } else {
                        combined = parentPrefixes[p] + " " + parentSelector;
                    }
                    prefixes.push(combined);
                }
            }
            return prefixes;
        }
        
        function expandRulesToSelectors() {
            var s, p;
            
            for (i = 0; i < doneRules.length; i++) {
                var rule = doneRules[i];
                var selectorPrefixes = getSelectorPrefixes(rule);
                for (s = 0; s < rule.selectors.length; s++) {
                    var selector = rule.selectors[s];
                    for (p = 0; p < selectorPrefixes.length; p++) {
                        var combined;
                        if (selector.selector[0] === "&") {
                            combined = selectorPrefixes[p] + selector.selector.substr(1);
                        } else {
                            combined = selectorPrefixes[p] + " " + selector.selector;
                        }
                        
                        selectors.push({
                            selector: combined,
                            ruleStartLine: rule.ruleStartLine,
                            ruleStartChar: rule.ruleStartChar,
                            selectorStartLine: selector.selectorStartLine,
                            selectorStartChar: selector.selectorStartChar,
                            selectorGroupStartLine: rule.selectorGroupStartLine,
                            selectorGroupStartChar: rule.selectorGroupStartChar,
                            selectorEndLine: selector.selectorEndLine,
                            selectorEndChar: selector.selectorEndChar,
                            declListEndLine: rule.declListEndLine,
                            declListEndChar: rule.declListEndChar
                        });
                    }
                }
            }
        }
        expandRulesToSelectors();
        
//        console.log("RESULT");
//        console.log(selectors);
        return selectors;
    }
    
    /**
     * Finds all instances of the specified selector in "text".
     * Returns an Array of Objects with start and end properties.
     *
     * For Sprint 4, we only support simple selectors. This function will need to change
     * dramatically to support full selectors.
     *
     * @param text {!String} CSS text to search
     * @param selector {!String} selector to search for
     * @return {Array.<{selectorGroupStartLine:number, declListEndLine:number, selector:string}>}
     *      Array of objects containing the start and end line numbers (0-based, inclusive range) for each
     *      matched selector.
     */
    function _findAllMatchingSelectorsInText(text, selector) {
        var allSelectors = _extractAllSelectors(text);
        var result = [];
        var i;
        
        // For sprint 4 we only match the rightmost simple selector, and ignore 
        // attribute selectors and pseudo selectors
        var classOrIdSelector = selector[0] === "." || selector[0] === "#";
        var prefix = "";
        
        // Escape initial "." in selector, if present.
        if (selector[0] === ".") {
            selector = "\\" + selector;
        }
        
        if (!classOrIdSelector) {
            // Tag selectors must have nothing or whitespace before it.
            selector = "(^|\\s)" + selector;
        }
        
        var re = new RegExp(selector + "(\\[[^\\]]*\\]|:{1,2}[\\w-()]+|\\.[\\w-]+|#[\\w-]+)*\\s*$", classOrIdSelector ? "" : "i");
        allSelectors.forEach(function (entry) {
            if (entry.selector.search(re) !== -1) {
                result.push(entry);
            } else if (!classOrIdSelector) {
                // Special case for tag selectors - match "*" as the rightmost character
                if (entry.selector.trim().search(/\*$/) !== -1) {
                    result.push(entry);
                }
            }
        });
        
        return result;
    }
    
    
    /**
     * Converts the results of _findAllMatchingSelectorsInText() into a simpler bag of data and
     * appends those new objects to the given 'resultSelectors' Array.
     * @param {Array.<{document:Document, lineStart:number, lineEnd:number}>} resultSelectors
     * @param {Array.<{selectorGroupStartLine:number, declListEndLine:number, selector:string}>} selectorsToAdd
     * @param {!Document} sourceDoc
     * @param {!number} lineOffset Amount to offset all line number info by. Used if the first line
     *          of the parsed CSS text is not the first line of the sourceDoc.
     */
    function _addSelectorsToResults(resultSelectors, selectorsToAdd, sourceDoc, lineOffset) {
        selectorsToAdd.forEach(function (selectorInfo) {
            resultSelectors.push({
                name: selectorInfo.selector,
                document: sourceDoc,
                lineStart: selectorInfo.ruleStartLine + lineOffset,
                lineEnd: selectorInfo.declListEndLine + lineOffset
            });
        });
    }
    
    /** Finds matching selectors in LESS files; adds them to 'resultSelectors' */
    function _findMatchingRulesInLESSFiles(selector, resultSelectors) {
        var result          = new $.Deferred(),
            lessFilesResult  = FileIndexManager.getFileInfoList("less");
        
        // Load one CSS file and search its contents
        function _loadFileAndScan(fullPath, selector) {
            var oneFileResult = new $.Deferred();
            
            DocumentManager.getDocumentForPath(fullPath)
                .done(function (doc) {
                    // Find all matching rules for the given LESS file's content, and add them to the
                    // overall search result
                    var oneLESSFileMatches = _findAllMatchingSelectorsInText(doc.getText(), selector);
                    _addSelectorsToResults(resultSelectors, oneLESSFileMatches, doc, 0);
                    
                    oneFileResult.resolve();
                })
                .fail(function (error) {
                    oneFileResult.reject(error);
                });
        
            return oneFileResult.promise();
        }
        
        // Load index of all LESS files; then process each LESS file in turn (see above)
        lessFilesResult.done(function (fileInfos) {
            Async.doInParallel(fileInfos, function (fileInfo, number) {
                return _loadFileAndScan(fileInfo.fullPath, selector);
            })
                .pipe(result.resolve, result.reject);
        });
        
        return result.promise();
    }
    
    /**
     * Return all rules matching the specified selector.
     * For Sprint 4, we only look at the rightmost simple selector. For example, searching for ".foo" will 
     * match these rules:
     *  .foo {}
     *  div .foo {}
     *  div.foo {}
     *  div .foo[bar="42"] {}
     *  div .foo:hovered {}
     *  div .foo::first-child
     * but will *not* match these rules:
     *  .foobar {}
     *  .foo .bar {}
     *  div .foo .bar {}
     *  .foo.bar {}
     *
     * @param {!String} selector The selector to match. This can be a tag selector, class selector or id selector
     * @return {$.Promise} that will be resolved with an Array of objects containing the
     *      source document, start line, and end line (0-based, inclusive range) for each matching declaration list.
     *      Does not addRef() the documents returned in the array.
     */
    function findMatchingRules(selector) {
        var result          = new $.Deferred(),
            resultSelectors = [];
        
        // Asynchronously search for matches in all the project's LESS files
        // (results are appended together in same 'resultSelectors' array)
        _findMatchingRulesInLESSFiles(selector, resultSelectors)
            .done(function () {
                result.resolve(resultSelectors);
            })
            .fail(function (error) {
                result.reject(error);
            });
        
        return result.promise();
    }
    
    
    exports._findAllMatchingSelectorsInText = _findAllMatchingSelectorsInText; // For testing only
    exports.findMatchingRules = findMatchingRules;
});
