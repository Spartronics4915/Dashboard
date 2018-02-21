//
// javascript page handler for pathpreview.html
//
(function(global) {
'use strict';
var pathpreview = {
    pageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;
    },
};
global.app.setPageHandler("pathpreview", pathpreview);

})(window);
