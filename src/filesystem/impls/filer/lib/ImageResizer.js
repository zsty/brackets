/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define */
define(function (require, exports, module) {
    "use strict";

    var pica = require("Pica")();

    var Content = require("filesystem/impls/filer/lib/content");
    var Path = require("filesystem/impls/filer/FilerUtils").Path;
    var decodePath = require("filesystem/impls/filer/FilerUtils").decodePath;
    var base64ToBuffer = require("filesystem/impls/filer/FilerUtils").base64ToBuffer

    function ImageResizer(path, data) {
        this.path = decodePath(path);
        this.type = Content.mimeFromExt(Path.extname(this.path));
        this.blob = new Blob([data], {type: this.type});
        this.url = URL.createObjectURL(this.blob);
        this.canvas = document.createElement('canvas');
    }
    ImageResizer.prototype.cleanup = function() {
        URL.revokeObjectURL(this.url);
    };
    ImageResizer.prototype.resize = function(callback) {
        var self = this;
        var buffer;
        var scale = 1; // initial scale factor of 1 to deal with "only huge because huge dpi" images
        var step = scale / 2;
        var target = 250 * 1024;
        var errorThreshold = 20 * 2014;
        var passes = 0;
        var maxPasses = 5;

        function finish(err, buffer) {
            self.cleanup();
            callback(err, buffer);
        }

        function resizePass() {
            console.log("resizePass", passes, scale);

            if(passes++ > maxPasses) {
                finish(null, buffer);
            }

            self.canvas.width = img.width * scale;
            self.canvas.height = img.height * scale;

            console.log("width", self.canvas.width, "height", self.canvas.height);

            pica.resize(img, self.canvas)
            .then(function() {
                var base64Str = self.canvas.toDataURL(self.type).split(',')[1];
                buffer = base64ToBuffer(base64Str);

                // Too big?
                if(buffer.length > target + errorThreshold) {
                    console.log("Resized image too big", buffer.length);
                    scale = scale - step;
                    step /= 2;
                    resizePass();
                }
                // Smaller than necessary?
                else if(buffer.length < target - errorThreshold) {
                    console.log("Resized image too small", buffer.length);
                    scale = scale + step;
                    step /= 2;
                    resizePass();
                } else {
                    finish(null, buffer);
                }
            })
            .catch(finish);
        }

        var img = new Image();
        img.onload = resizePass;
        img.onerror = function() {
            finish(new Error("Unable to load image for resizing"));
        };
        img.src = self.url;
    };

    /**
     * Resize an image and write back to the filesystem
     */
    function resize(path, data, callback) {
        var resizer = new ImageResizer(path, data);
        resizer.resize(callback);
    }

    /**
     * Test if image data size is too big (250K)
     */
    function isImageTooLarge(size) {
        return size > 250 * 1024;
    }

    exports.resize = resize;
    exports.isImageTooLarge = isImageTooLarge;
});
