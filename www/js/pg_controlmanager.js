//
// javascript page handler for controlmanager.html
//
(function(global) {
  'use strict';
  var controlManager = {
    pageLoaded: function(targetElem, html) {
      targetElem.innerHTML = html;
    },

    onNetTabChange: function(key, value, isNew) {
      var keySuffix = "/SmartDashboard/ControlManager/";
      if (key.substring(0, keySuffix.length) == keySuffix) {
        var expressionName = key.substring(keySuffix.length,key.length);
        var expressionID = $.escapeSelector(expressionName); // Needs >= v3.0 of jQuery
        if (isNew) {
          $("#expressionlist").append(
            `<li class="col-sm-12 expression"><p class="col-sm-5">` + expressionName + `:&nbsp;</p>
            <input id="` + expressionID + `" value="` + value + `" placeholder="Mathematical expression with variables" type="text" class="col-sm-7"/>
            </li>`);

          $("#"+expressionID).on("input", function(event) {
            NetworkTables.putValue(key, $(this).val());
          });
        } else {
          $("#"+expressionID).val(value);
        }
      }
    },
  };

  global.app.setPageHandler("controlmanager", controlManager);
})(window);
