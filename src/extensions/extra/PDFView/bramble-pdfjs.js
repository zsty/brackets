/**
 * XXXBramble: PDF viewer doesn't allow passing locales by default for security reasons:
 * https://github.com/mozilla/pdf.js/issues/7432, so we are doing something like what
 * happens internally, see:
 *
 * https://github.com/mozilla/pdf.js/blob/36fb3686ccc5b1cd98e5f20b920bdeb7ed4d359d/web/app.js#L267
 * https://github.com/mozilla/pdf.js/blob/593dec1bb7aec1802abf8268137b0f7adab2ae32/web/ui_utils.js#L211
 **/
(function(qs, PDFJS, PDFViewerApplication) {
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

    // Previous/Next navigation
    window.addEventListener("DOMContentLoaded", function () {
        // TODO: need buttons for next/previous.  Maybe reuse or do something like
        // what is already in the viewer (which will get us the l10n we want for free):

        //        <div class="splitToolbarButton hiddenSmallView">
        //          <button class="toolbarButton pageUp" title="Previous Page" id="previous" tabindex="13" data-l10n-id="previous">
        //            <span data-l10n-id="previous_label">Previous</span>
        //          </button>
        //          <div class="splitToolbarButtonSeparator"></div>
        //          <button class="toolbarButton pageDown" title="Next Page" id="next" tabindex="14" data-l10n-id="next">
        //            <span data-l10n-id="next_label">Next</span>
        //          </button>
        //        </div>

        // TODO: wire up click events for next/previous. Here are functions to call:

        function getCurrentPageNumber() {
            return PDFViewerApplication.page;
        }

        function getTotalPageCount() {
            return PDFViewerApplication.pageCount;
        }

        function goToFirstPage() {
            PDFViewerApplication.eventBus.dispatch("firstpage");
        }

        function goToNextPage() {
            PDFViewerApplication.eventBus.dispatch("nextpage");
        }

        function goToPrevPage() {
            PDFViewerApplication.eventBus.dispatch("previouspage");
        }

        function goToLastPage() {
            PDFViewerApplication.eventBus.dispatch("lastpage");
        }

    }, false);

}(document.location.search.substring(1), window.PDFJS, window.PDFViewerApplication));
