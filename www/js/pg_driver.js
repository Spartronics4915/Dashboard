//
// javascript page handler for driver.html
//
(function(global) {
'use strict';
var piCam = {ip:"10.49.15.10:5080", url: "/cam.mjpg", cls:"", width:640, height:480};
var dlink13 = {ip:"admin:@10.49.15.13", url: "/video.cgi", cls:"rotate90", width:480, height:640};
var dlink14 = {ip:"admin:@10.49.15.14", url: "/video.cgi", cls:"", width:640, height:480};

// axis, usbcams here for reference, currently unused
var axis1 = {ip:"10.49.15.11", url: "/mjpg/video.mjpg"};
var axis2 = {ip:"10.49.15.12", url: "/mjpg/video.mjpg"};
var usbCam = {ip:"10.49.15.2:1180", url: "/?action=stream"};

// dlinkDefault is the ip after a factory reset, here for reference only
var dlinkDefault = {ip:"192.168.0.10", url: "/video.cgi"};

var driver = {
    piCam: piCam,
    cubeCam: dlink13,
    liftCam: dlink14,
    pageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;

        // first initialize selectors from network tables.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            // var ntkey = "/SmartDashboard/" + key;
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
                var options = value.split(",").sort();
                var sel = document.getElementById("AutoStrategy");
                if(sel) {
                    $(sel).empty();
                    for(let i=0;i<options.length;i++) {
                        var opt = document.createElement("option");
                        opt.value = options[i];
                        opt.innerHTML = opt.value;
                        sel.appendChild(opt);
                    }
                }
                break;
            case "/SmartDashboard/CameraView":
            case "/SmartDashboard/ScissorLift/WantedState":
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
        var camhtml, cam, view = app.getValue("CameraView", "Auto");
        var camdiv = $("#camera");
        var scissorState = app.getValue("ScissorLift/WantedState", "OFF");
        camdiv.removeClass("nocam")
              .removeClass("cubecam")
              .removeClass("liftcam")
              .removeClass("picam");
        if(view === "Auto") {
            var viewcube = (-1 !== ["OFF", "RETRACTED"].indexOf(scissorState));
            if(viewcube || !app.robotConnected)
                view = "CubeCam";
            else
            if (reverseEnabled === "Enabled")
                view = "LiftCam";
            else
                view = "CubeCam";
        }
        switch(view) {
            case "CubeCam":
                camdiv.addClass("cubecam");
                cam = this.cubeCam;
                break;
            case "LiftCam":
                camdiv.addClass("liftcam");
                cam = this.liftCam;
                break;
            case "PiCam":
                camdiv.addClass("picam");
                cam = this.piCam;
                break;
            default:
                camdiv.addClass("nocam");
                cam = null;
                break;
        }
        // Reference for java applet for h264 encoded stream
        //  (required older build of firefox, since applets no longer supported)
        //    camhtml = `
        // <applet name="cvcs" codeBase="http://admin:@10.49.15.13:80" archive="vplug.jar?cidx=1411113015" code="vplug.class" width="640" height="480">
        //        <param name="RemotePort" value="80">
        //        <param name="RemoteHost" value="10.49.15.13">
        //        <param name="Timeout" value="5000">
        //        <param name="RotateAngle" value="0">
        //        <param name="PreviewFrameRate" value="2">
        //        <param name="Algorithm" value="1">
        //        <param name="DeviceSerialNo" value="YWRtaW46">
        //      </applet>
	    //		`

        if(cam) {
            camhtml = `
            <img style="width:${cam.width}px height:${cam.height}px"
                src="http://${cam.ip}${cam.url}" class="${cam.cls}"></img>
            `;
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
