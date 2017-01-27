//
// javascript page handler for about.html
//
(function(global) {
'use strict';
var about = {
    pageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;
        $("#logo").animate({
            width: "333px",
          });
    },
};
global.app.setPageHandler("about", about);

})(window);
