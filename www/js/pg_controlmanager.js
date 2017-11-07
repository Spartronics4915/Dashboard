//
// javascript page handler for controlmanager.html
//
(function(global) {
  'use strict';

  var typingTimer;
  var doneTypingAfter = 700; // in milleseconds

  var controlManager = {
    pageLoaded: function(targetElem, html) {
      targetElem.innerHTML = html;
    },

    onNetTabChange: function(key, value, isNew) {
      var keySuffix = "/SmartDashboard/ControlManager/";
      if (key.substring(0, keySuffix.length) == keySuffix) {
        var expressionName = key.substring(keySuffix.length,key.length);
        var expressionID = expressionName.replace(/[^a-zA-Z0-9\-]/g, "λ"); // To deal with non alphanumeric characters in ids
        if (isNew) {
          $("#expressionlist").append(
            `<li class="col-sm-12 expression"><p class="col-sm-4">` + expressionName + `:&nbsp;</p>
            <input id="` + expressionID + `" value="` + value + `" placeholder="Mathematical expression with variables" type="text" class="col-sm-8"/>
            </li>`);
          $("#"+expressionID).on("input", function(event) {
            window.clearTimeout(typingTimer);
            $(this).css("opacity", 0.8);
            var element = this;
            typingTimer = window.setTimeout(function() {
              $(element).css("opacity", 1);
              NetworkTables.putValue(key, $(element).val());
            }, doneTypingAfter);
          });
        } else {
          $("#"+expressionID).val(value);
        }
      }
    },
  };

  global.app.setPageHandler("controlmanager", controlManager);
})(window);
