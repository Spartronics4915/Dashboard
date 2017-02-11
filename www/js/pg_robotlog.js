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

        // now build a table with two columns for each logger: nm, selector
        var loglevels = "<option data-text='DEBUG'>DEBUG</option>"+
                       "<option data-text='INFO'>INFO</option>"+
                       "<option data-text='NOTICE'>NOTICE</option>"+
                       "<option data-text='WARNING'>WARNING</option>"+
                       "<option data-text='ERROR'>ERROR</option>";
        var table = "<table width='100%' style='border-collapse:separate;border-spacing:5px'>";
        loggers.forEach(function(key) {
            table += `<tr><td width="50%">${key}:</td><td width="50%"><select style="width: 100%" data-log="${key}">${loglevels}</select></span></td></tr>`;
        });
        table += "</table>";
        $("#loglevels").html(table);

        // install callbacks for each logger
        $("#loglevels select").each(function() {
            var key = $(this).attr("data-log");
            var ntkey = "/SmartDashboard/Loggers/" + key;
            var val = NetworkTables.getValue(ntkey);
            $(this).find(`option[data-text="${val}"]`).attr("selected", true);

            // Update NetworkTables on change
            $(this).change(function() {
                NetworkTables.putValue(`/SmartDashboard/Loggers/${key}`, $(this).find("option:selected").text());
            });
        });

        RobotLog.setLogListener(this.onRobotMsg, true);
    },

    onNetTabChange: function(ntkey, value, isNew) {
        if (isNew && ntkey.startsWith("/SmartDashboard/Loggers/"))
        {
            var key = ntkey.replace("/SmartDashboard/Loggers/", "").replace(/</g, "&lt;");
            $(`#loglevels select[data-log="${key}"] option[data-text="${value}"]`).attr("selected", true);
        }
    },

    onFilterChange: function () {
        $("#robotlog").html("<hr>");
        RobotLog.replayLogs();
    },

    onRobotMsg: function(msg) {
        if(!(/S/.test(msg))) return; // ignore messages with whitespace-only
        if(filter) {
            if(-1 === msg.indexOf(filter)) return;
        }
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
        $("#robotlog").prepend(app.interpolate(msgTmplt, map));
    }
};
global.app.setPageHandler("robotlog", robotlog);

})(window);
