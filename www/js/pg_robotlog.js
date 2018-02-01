//
// javascript page handler for robotlog.html
//
(function(global) {
'use strict';
var msgTmplt = "<div class='logmsg'>" +
              "<span class='timestamp'>{ts} </span>" +
              "<span class='{lvlcls}'>{lvlpad} </span>" +
              "<span class='namespace'>{nmspc} </span>" +
              "{msg}</div>";
var filter = "";
var knownLogLevels = ["DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "EXCEPTION"];
var robotlog = {
    pageLoaded: function(targetElem, html) {
        var self = this;
        targetElem.innerHTML = html; // was: app.interpolate(html, map);

        // initialize filter callbacks
        $("#filter").val(filter);
        $("#filter").on("input", function() {
            filter = $(this).val();
            self.onFilterChange();
        });

        // populate #loglevels from SmartDashboard
        // first initialize loggers from network tables.
        var loggers = [];
        NetworkTables.getKeys().forEach(function(key)
        {
            if (key.startsWith("/SmartDashboard/Loggers/"))
            {
                loggers.push(key.replace("/SmartDashboard/Loggers/", "").replace(/</g, "&lt;"));
            }
        });

        RobotLog.setLogListener(this.onRobotMsg, true);
    },

    onNetTabChange: function(ntkey, value, isNew) {
    },

    onRobotMsg: function(msg) {
        if(!(/\S/.test(msg))) return; // ignore messages with whitespace-only
        if(filter) {
            if(-1 === msg.indexOf(filter)) return;
        }
        // presumed message format:
        //  timestamp errorclass namespace text
        var fields = msg.split(' ');
        var ts = fields[0];
        var lvlcls = fields[1];
        var nmspc;
        var msgtxt;
        if(!lvlcls || -1 === knownLogLevels.indexOf(lvlcls)) {
            lvlcls = "UNKNOWN";
            ts = "";
            nmspc = "";
            msgtxt = msg;
        }
        else {
            nmspc = fields[2];
            msgtxt = fields.slice(3).join(' ')
        }
        var lvlpad = (lvlcls + ".....").slice(0,9); // EXCEPTION is longest lvl
        var map = {
            ts: ts,
            lvlcls: lvlcls,
            lvlpad: lvlpad,
            nmspc: nmspc,
            msg: msgtxt,
        };
        console.log(msgtxt);
        $("#robotlog").append(app.interpolate(msgTmplt, map));
    }
};
global.app.setPageHandler("robotlog", robotlog);

})(window);
