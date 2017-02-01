//
// javascript page handler for robotlog.html
//
(function(global) {
'use strict';
var robotlog = {
    pageLoaded: function(targetElem, html) {
        var map = {
            loglevels:  "<option>DEBUG</option>"+
                        "<option>INFO</option>"+
                        "<option>NOTICE</option>"+
                        "<option>WARNING</option>"+
                        "<option>ERROR</option>",
        };
        targetElem.innerHTML = app.interpolate(html, map);
    },
};
global.app.setPageHandler("robotlog", robotlog);

})(window);
