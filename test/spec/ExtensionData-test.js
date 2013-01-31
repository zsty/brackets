/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
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
/*global define, $, brackets, window, describe, it, expect, beforeEach, afterEach, waitsFor, runs, waitsForDone, waitsForFail */
/*unittests: ExtensionData */

define(function (require, exports, module) {
    "use strict";
    // Extension registrations are held
    // Go into a pending bucket when a resource is not available
    // once the resource becomes available, those are released
    // to the waiting bucket
    // when all resources are available, the waiting bucket is emptied
    // (registrations actually run) and enabling is called.
    
    var ExtensionData = require("utils/ExtensionData");
    
    describe("ExtensionData", function () {
        describe("Registration", function () {
            it("can register registrations", function () {
                var validatorWasCalled = false;
                var registerFunctionWasCalled = false;
                var unregisterFunctionWasCalled = false;
                
                var validateNewTestThingy = function (identifier, data) {
                    validatorWasCalled = true;
                    return function () {
                        registerFunctionWasCalled = true;
                        return function () {
                            unregisterFunctionWasCalled = true;
                        };
                    };
                };
                
                var rdata = {
                    description: "This is the registration description",
                    validate: validateNewTestThingy
                };
                
                ExtensionData.register("test", "registration", "someNewRegistration", rdata);
                
                expect(ExtensionData._extensionData.availableRegistrations.someNewRegistration).toEqual(rdata);
                
                ExtensionData.register("test", "someNewRegistration", "aThing", {});
                
                expect(validatorWasCalled).toBe(true);
                expect(registerFunctionWasCalled).toBe(true);
                
                ExtensionData.unregister("test");
                expect(unregisterFunctionWasCalled).toBe(true);
                
                expect(ExtensionData._extensionData.availableRegistrations.someNewRegistration).toBeUndefined();
            });
        });
    });
});