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
var robotlog = {
    pageLoaded: function(targetElem, html) {
        var self = this;
        var map = {
            loglevels: "<option data-text='DEBUG'>DEBUG</option>"+
                       "<option data-text='INFO'>INFO</option>"+
                       "<option data-text='NOTICE'>NOTICE</option>"+
                       "<option data-text='WARNING'>WARNING</option>"+
                       "<option data-text='ERROR'>ERROR</option>",
        };
        targetElem.innerHTML = app.interpolate(html, map);

        // first initialize selectors from network tables.
        var loggers = [];
        NetworkTables.getKeys().forEach(function(key)
        {
            if (key.startsWith("/SmartDashboard/Loggers/"))
            {
                loggers.push(key.replace("/SmartDashboard/Loggers/", "").replace(/</g, "&lt;"));
            }
        });

        var table = "<table width='100%'>";
        loggers.forEach(function(key) {
            table += `<tr><td width="50%">${key}:</td><td width="50%"><select style="width: 100%" data-log="${key}">${map.loglevels}</select></span></td></tr>`;
        });
        table += "</table>";

        $(".selectors").html(table);

        $(".selectors select").each(function() {
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

            // Clear all
            $(`.selectors select option`).attr("selected", false);
            // Then set the right one
            $(`.selectors select[data-log="${key}"] option[data-text="${value}"]`).attr("selected", true);
        }
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
