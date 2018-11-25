//
// javascript page handler for driver.html
//
(function(global) {
'use strict';
var piCam = {ip:"10.49.15.10:5080", url: "/cam.mjpg", cls:"rotate0"};
var dlink13 = {ip:"admin:@10.49.15.13", url: "/video.cgi", cls:"rotate90"};
var dlink14 = {ip:"admin:@10.49.15.14", url: "/video.cgi", cls:"rotate0"};

// axis, usbcams here for reference, currently unused
var axis1 = {ip:"10.49.15.11", url: "/mjpg/video.mjpg", cls:"rotate0"};
var axis2 = {ip:"10.49.15.12", url: "/mjpg/video.mjpg", cls:"rotate0"};
var usbCam = {ip:"10.49.15.2:1180", url: "/?action=stream", cls:"rotate0"};

// dlinkDefault is the ip after a factory reset, here for reference only
var dlinkDefault = {ip:"192.168.0.10", url: "/video.cgi"};

var driver = {
    defaultAuto: "All: Cross Baseline",
    piCam: piCam,
    cubeCam: dlink13,
    liftCam: dlink14,
    pageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;

        // first initialize selectors from network tables.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            var val = app.getValue(key);
            $(this).val(val);
        });

        // now update network tables on changes
        $(".selector").change(function() {
            var value = $(this).val();
            var key = $(this).attr("id");
            app.putValue(key, value);
        });

        $(".command").click(function() {
            var key = $(this).attr("data-command");
            app.putValue(key + "/running", true);
        });

        this.changeCamera();
    },

    onNetTabChange: function(key, value, isNew) {
        switch(key) {
            case "/SmartDashboard/AutoStrategy":
                var sel = document.getElementById("AutoStrategy");
                if(sel) {
                    sel.value = value;
                }
                break;
            case "/SmartDashboard/AutoStrategyOptions":
                // we assume that value is a comma separated list
                // we expect to receive this upon robot connection,
                // and to ensure reasonable default behavior we
                // auto-select the defaultAuto
                var options = value.split(",").sort();
                var sel = document.getElementById("AutoStrategy");
                var val = app.getValue("AutoStrategy", "");
                if(val == "")
                {
                    val = this.defaultAuto;
                    app.putValue("AutoStrategy", val);
                }
                if(sel) 
                {
                    var oldval = sel.value;
                    $(sel).empty(); // clear out all strategy fields
                    for(let i=0;i<options.length;i++) 
                    {
                        var opt = document.createElement("option");
                        opt.value = options[i];
                        if(opt.value == oldval) found = true;
                        opt.innerHTML = opt.value;
                        sel.appendChild(opt);
                    }
                    sel.value = val;
                }
                break;
            case "/SmartDashboard/CameraView":
                var sel = document.getElementById("CameraView");
                if(sel) {
                    sel.value = value;
                }
                this.changeCamera();
                break;
            case "/FMSInfo/IsRedAlliance":
                var el = document.getElementById("alliance");
                if(el) {
                    switch(value)
                    {
                    case false:
                        $(el).html("<span class=\"blueAlliance\">Blue Alliance</span>");
                        break;
                    case true:
                        $(el).html("<span class=\"redAlliance\">Red Alliance</span>");
                        break;
                    default:
                        $(el).html("<span class=\"unknownAlliance\">Unknown Alliance</span>");
                        break;
                    }
                }
                break;
            case "/FMSInfo/StationNumber":
                var el = document.getElementById("allianceStation");
                $(el).text(value);
                break;
            case "/FMSInfo/GameSpecificMessage":
                var el = document.getElementById("fmsGameMSG");
                // 2018: 3 chars "LRL", means:
                //    our switch on Left
                //    our scale on Right
                //    defense for their switch on Left
                $(el).text(value);
                break;
            case "/FMSInfo/ReplayNumber":
                break;
            case "/FMSInfo/FMSControlData":
                break;
            case "/FMSInfo/EventName":
                break;
            case "/FMSInfo/MatchType":
                break;
            case "/FMSInfo/MatchNumber":
                break;
            case "/FMSInfo/.type":
                break;

            case "/SmartDashboard/AllianceStation":
                console.log("ignoring " + key + " in favor of /FMS/IsRedAlliance");
                break;
                // $(`#AutoStrategy option:contains(${value})`).attr("selected", true);
                var el = document.getElementById("AllianceStation");
                if(el) {
                    switch(value)
                    {
                    case "Blue":
                        $(el).removeClass("unknownAlliance")
                             .removeClass("redAlliance")
                             .addClass("blueAlliance");
                        break;
                    case "Red":
                        $(el).removeClass("unknownAlliance")
                             .removeClass("blueAlliance")
                             .addClass("redAlliance");
                        break;
                    default:
                        $(el).removeClass("blueAlliance")
                             .removeClass("redAlliance")
                             .addClass("unknownAlliance");
                        break;
                    }
                    el.value = value;
                }
                break;
            default:
                if(key.indexOf("/FMS") == 0)
                {
                    console.log(key + ":" + value);
                }
                break;
        }
    },
    changeCamera: function() {
        // nb: Auto is unused for POWERUP
        var camhtml, cam, view = app.getValue("CameraView", "CubeCam");
        switch(view) {
            case "CubeCam":
                cam = this.cubeCam;
                break;
            case "LiftCam":
                cam = this.liftCam;
                break;
            case "PiCam":
                cam = this.piCam;
                break;
            default:
                cam = null;
                break;
        }
        if(cam) {
            camhtml = `<img src="http://${cam.ip}${cam.url}" class="${cam.cls}"></img>`;
        }
        else {
            camhtml = "<!-- empty -->";
        }

        app.logMsg("changeCamera: " + camhtml);
        $("#camera").html(camhtml);
    }
};

global.app.setPageHandler("driver", driver);
})(window);
