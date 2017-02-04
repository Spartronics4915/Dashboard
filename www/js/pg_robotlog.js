//
// javascript page handler for robotlog.html
//
(function(global) {
'use strict';
var robotlog = {
    pageLoaded: function(targetElem, html) {
        var self = this;
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
            var ntkey = "/SmartDashboard/" + key;
            var val = NetworkTables.getValue(ntkey);
            $(this).val(val);
        });

        // now update network tables on changes
        $(".selector").change(function() {
            var value = $(this).val();
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key ;
            NetworkTables.putValue(ntkey, value);
        });

        RobotLog.setLogListener(self.onRobotMsg, true);
    },

    onNetTabChange: function(key, value, isNew) {
        // TODO: make sure our selector has the right value
    },

    onRobotMsg: function(msg) {
        $("#robotlog").prepend("<div>" + msg + "</div>")
    }
};
global.app.setPageHandler("robotlog", robotlog);

})(window);
