//
// javascript page handler for robotlog.html
//
(function(global) {
'use strict';
var robotlog = {
    pageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;
    },
};
global.app.setPageHandler("robotlog", robotlog);

})(window);
