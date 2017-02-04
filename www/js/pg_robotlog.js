//
// javascript page handler for robotlog.html
//
(function(global) {
'use strict';
var msgTmplt = "<div class='logmsg'>" +
              "<span class='timestamp'>{ts} </span>" +
              "<span class='{lvlcls}'>{lvlpad} </span>" +
              "<span class='namespace'>{nmspc}: </span>" +
              "{msg}</div>";
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
        // Logger (java) :
        //   System.out.println(nowstr + " " + lvl + " " + m_namespace + ": " + msg);
        var fields = msg.split(' ');
        var lvlcls = fields[1];
        var lvlpad = (fields[1] + ".....").slice(0,9); // EXCEPTION is longest lvl
        var map = {
            ts: fields[0],
            lvlcls: lvlcls,
            lvlpad: lvlpad,
            nmspc: fields[2],
            msg: fields.slice(3).join(' '),
            $: "&nbsp;",
        };
        $("#robotlog").prepend(app.interpolate(msgTmplt, map));

    }
};
global.app.setPageHandler("robotlog", robotlog);

})(window);
