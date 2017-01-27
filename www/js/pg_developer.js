//
// javascript page handler for about.html
//
(function(global) {
'use strict';
var developer = {
    pageLoaded: function(targetElem, html) {
        var map = {
            loglevels:  "<option>DEBUG</option>"+
                        "<option>INFO</option>"+
                        "<option>NOTICE</option>"+
                        "<option>WARNING</option>"+
                        "<option>ERROR</option>",
        };
        targetElem.innerHTML = app.interpolate(html, map);

        // first initialize selectors from network tables.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key ;
            var val = NetworkTables.getValue(ntkey + "/selected");
            $(this).val(val);
        });

        // now update network tables on changes
        $(".selector").change(function() {
            var value = $(this).val();
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key ;
            NetworkTables.putValue(ntkey + "/selected", value);
        });

        // dabble with justgage...
        var self = this;
        this.imuHeadingGage = new JustGage({
            id: "imuHeadingGage",
            value: 67,
            min: -180,
            max: 180,
            title: "IMU Heading"
          });
        var changeGage = function() {
            var val = Math.floor(Math.random() * 360 - 180);
            self.imuHeadingGage.refresh(val);
            window.setTimeout(changeGage, 1000);
        }
        window.setTimeout(changeGage, 1000);
    },
};
global.app.setPageHandler("developer", developer);
})(window);
