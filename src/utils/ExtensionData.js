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
/*global define, $, CodeMirror, brackets, window */
/* unittests: ExtensionData */

define(function (require, exports, module) {
    "use strict";
    
    var extensionData, register;
    
    function validateRegistration(identifier, data) {
        return function () {
            extensionData.availableRegistrations[identifier] = data;
            return function () {
                delete extensionData.availableRegistrations[identifier];
                // TODO this should manage the extensions that depend on this registration as well
            };
        };
    }
    
    extensionData = {
        availableRegistrations: {
            "registration": {
                description: "Used to create new kinds of registrations",
                validate: validateRegistration
            }
        }
    };
    
    var extensionUnregisterFunctions = {};
    
    register = function register(extensionName, registrationName, identifier, data) {
        var registration = extensionData.availableRegistrations[registrationName];
        var addRegistration = registration.validate(identifier, data);
        var removeRegistration = addRegistration();
        if (!extensionUnregisterFunctions[extensionName]) {
            extensionUnregisterFunctions[extensionName] = [];
        }
        extensionUnregisterFunctions[extensionName].push(removeRegistration);
    };
    
    function unregister(extensionName) {
        var unregisterFunctions = extensionUnregisterFunctions[extensionName];
        if (unregisterFunctions) {
            unregisterFunctions.forEach(function (unregister) {
                unregister();
            });
        }
    }
    
    exports._extensionData = extensionData;
    exports.register = register;
    exports.unregister = unregister;
    
    // Orion experiment
    var ServiceRegistry = require("orion/serviceregistry"),
        PluginRegistry = require("orion/pluginregistry");
    
    
    var serviceRegistry = new ServiceRegistry.ServiceRegistry();
    var pluginRegistry = new PluginRegistry.PluginRegistry(serviceRegistry, {plugins: {}});
    
    exports.serviceRegistry = serviceRegistry;
    exports.pluginregistry = pluginRegistry;
});