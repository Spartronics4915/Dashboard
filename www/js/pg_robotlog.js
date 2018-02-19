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
var knownLogLevels = ["DEBUG", "INFO", "NOTICE", "WARNING", 
                      "ERROR", "Exception"];
var robotlog = {
    pageLoaded: function(targetElem, html) {
        var self = this;
        targetElem.innerHTML = html; // was: app.interpolate(html, map);

        // first initialize selectors from network tables.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            var val = app.getValue(key);
            if (val !== "")
            {
                $(this).val(val);
            }
        });

        // now update network tables on changes
        $(".selector").change(function() {
            var value = $(this).val();
            var key = $(this).attr("id");
            app.putValue(key, value);
		});


        // initialize filter callbacks
        $("#filter").val(filter);
        $("#filter").on("input", function() {
            filter = $(this).val();
            self.onFilterChange();
        });
        RobotLog.setLogListener(this.onRobotMsg, true);
    },

    onNetTabChange: function(key, value, isNew) {
		switch(key) {
			case "/SmartDashboard/Robot/Verbosity":
				var sel = document.getElementById("Robot/Verbosity");
				if(sel)
				{
					sel.value = value;
				}
				break;
			default:
				break;
		}
    },

    onFilterChange: function () {
        $("#robotlog").html("");
        RobotLog.replayLogs();
    },

    onRobotMsg: function(msg) {
        // nb: this isn't valid in this context
        if(msg == null)
        {
            // equivalent to onFilterChange
            $("#robotlog").html("");
            RobotLog.replayLogs();
            return;
        }
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
            ts = ts;
            nmspc = "";
            msgtxt = fields.slice(3).join(' ');
        }
        else {
            nmspc = fields[2];
            msgtxt = fields.slice(2).join(' ');
        }
        var lvlpad = (lvlcls + ".....").slice(0,9); // Exception is longest lvl
        var map = {
            ts: ts,
            lvlcls: lvlcls,
            lvlpad: lvlpad,
            nmspc: nmspc,
            msg: msgtxt,
        };
        $("#robotlog").append(app.interpolate(msgTmplt, map));
    }
};
global.app.setPageHandler("robotlog", robotlog);

})(window);
