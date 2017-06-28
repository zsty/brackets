/**
 * XXXBramble: PDF viewer doesn't allow passing locales by default for security reasons:
 * https://github.com/mozilla/pdf.js/issues/7432, so we are doing something like what
 * happens internally, see:
 *
 * https://github.com/mozilla/pdf.js/blob/36fb3686ccc5b1cd98e5f20b920bdeb7ed4d359d/web/app.js#L267
 * https://github.com/mozilla/pdf.js/blob/593dec1bb7aec1802abf8268137b0f7adab2ae32/web/ui_utils.js#L211
 **/
(function(qs, PDFJS) {
    "use strict";

    function parseQueryString(query) {
        var parts = query.split("&");
        var params = {};
        for (var i = 0, ii = parts.length; i < ii; ++i) {
        var param = parts[i].split("=");
        var key = param[0].toLowerCase();
        var value = param.length > 1 ? param[1] : null;
        params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
        return params;
    }

    var params = parseQueryString(qs);
    if ("locale" in params) {
        PDFJS.locale = params["locale"];
    }
}(document.location.search.substring(1), window.PDFJS));
