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


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, sloppy: true */
/*global define, $, window */

if (!Function.prototype.bind) {
    Function.prototype.bind = function (obj) {
        var slice = [].slice,
            args = slice.call(arguments, 1),
            self = this,

            Nop = function () {},

            bound = function () {
                return self.apply(this instanceof Nop ? this : (obj || {}),
                    args.concat(slice.call(arguments)));
            };

        Nop.prototype = self.prototype;
        bound.prototype = new Nop();
        return bound;
    };
}

if (!window.FileError) {
    window.FileError = {};
    window.FileError.NOT_FOUND_ERR = 1;
    window.FileError.SECURITY_ERR = 2;
    window.FileError.ABORT_ERR = 3;
    window.FileError.NOT_READABLE_ERR = 4;
    window.FileError.ENCODING_ERR = 5;
    window.FileError.NO_MODIFICATION_ALLOWED_ERR = 6;
    window.FileError.INVALID_STATE_ERR = 7;
    window.FileError.SYNTAX_ERR = 8;
    window.FileError.INVALID_MODIFICATION_ERR = 9;
    window.FileError.QUOTA_EXCEEDED_ERR = 10;
    window.FileError.TYPE_MISMATCH_ERR = 11;
    window.FileError.PATH_EXISTS_ERR = 12;
}