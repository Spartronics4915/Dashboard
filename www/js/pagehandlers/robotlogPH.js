/* global PageHandler, $, NetworkTables, app */
// javascript page handler for robotlog.html
//

class RobotlogPH extends PageHandler
{
    constructor(config, pageTemplate)
    {
        super(config, pageTemplate);
        this.msgTmplt = "<div class='logmsg'>" +
                "<span class='timestamp'>{ts} </span>" +
                "<span class='{lvlcls}'>{lvlpad} </span>" +
                "<span class='namespace'>{nmspc} </span>" +
                "{msg}</div>";
        this.filter = "";
        this.knownLogLevels = ["DEBUG", "INFO", "NOTICE", "WARNING", 
                                "ERROR", "Exception"];
        this.msgsId = "#robotlogMsgs";
    }

    pageLoaded()
    {
        super.pageLoaded();
        let self = this; // don't step on jquery's $(this)

        $("#filter").val(this.filter);
        $("#filter").on("input", function() {
            self.filter = $(this).val();
            self.onFilterChange();
        });
        app.robotLog.setLogListener(this.onRobotMsg.bind(this), true);
    }

    onFilterChange() 
    {
        $(this.msgsId).html("");
        app.robotLog.replayLogs();
    }

    onRobotMsg(msg) 
    {
        // nb: this isn't valid in this context
        if(msg == null)
        {
            // equivalent to onFilterChange
            $(this.msgsId).html("");
            app.robotLog.replayLogs();
            return;
        }
        if(!(/\S/.test(msg))) return; // ignore messages with whitespace-only
        if(this.filter) {
            if(-1 === msg.indexOf(this.filter)) return;
        }
        // presumed message format:
        //  timestamp errorclass namespace text
        var fields = msg.split(" ");
        var ts = fields[0];
        var lvlcls = fields[1];
        var nmspc;
        var msgtxt;
        if(!lvlcls || -1 === this.knownLogLevels.indexOf(lvlcls))
        {
            lvlcls = "UNKNOWN";
            nmspc = "";
            msgtxt = fields.slice(3).join(" ");
        }
        else
        {
            nmspc = fields[2];
            msgtxt = fields.slice(2).join(" ");
        }
        var lvlpad = (lvlcls + ".....").slice(0,9); // Exception is longest lvl
        var map = {
            ts: ts,
            lvlcls: lvlcls,
            lvlpad: lvlpad,
            nmspc: nmspc,
            msg: msgtxt,
        };
        $(this.msgsId).append(app.interpolate(this.msgTmplt, map));
    }
}

window.RobotlogPH = RobotlogPH; 