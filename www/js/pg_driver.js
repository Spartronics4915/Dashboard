//
// javascript page handler for driver.html
//
(function(global) {
'use strict';
var dlinkDefault = {ip:"192.168.0.10", url: "/video.cgi"};
var axis1 = {ip:"10.49.15.11", url: "/mjpg/video.mjpg"};
var axis2 = {ip:"10.49.15.12", url: "/mjpg/video.mjpg"};
var dlink4915 = {ip:"10.49.15.13", url: "/video.cgi"};
var usbCam = {ip:"10.49.15.2:1180", url: "/?action=stream"};
var driver = {
    forwardCam: usbCam,
    reverseCam: dlink4915,
    pageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;

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
            var ntkey = "/SmartDashboard/" + key;
            NetworkTables.putValue(ntkey, value);
        });

        // first initialize selectors from network tables.
        $(".checkbox").each(function() {
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key;
            var val = NetworkTables.getValue(ntkey);
            $(this).prop('checked', val);
        });

        // now update network tables on changes
        $(".checkbox").change(function() {
            var value = $(this).prop('checked');
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key;
            NetworkTables.putValue(ntkey, value);
        });
    },

    onNetTabChange: function(key, value, isNew) {
        switch(key) {
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
            case "/SmartDashboard/ReverseEnabled":
                if(value === "Enabled") {
                    $("#fwdrev").text("Reverse");
                    $("#fwdrevimg").html('<img width="20px" src="/images/reverse.gif"></img>');
                }
                else {
                    $("#fwdrev").text("Forward");
                    $("#fwdrevimg").html('<img width="20px" src="/images/forward.gif"></img>');
                }
                this.changeCamera(value);
                break;
            case "/SmartDashboard/AllianceStation":
                var str;
                switch(value[0]) {
                    case "R":
                        str = "<span class='redAlliance'> from "+value+" position</span>";
                        break;
                    case "B":
                        str = "<span class='blueAlliance'> from "+value+" position</span>";
                        break;
                    default:
                        str = "<span class='noAlliance'> from "+value+" position</span>";
                        break;
                }
                $("#allianceStation").html(str);
                break;
            case "/SmartDashboard/CameraView":
                this.changeCamera(NetworkTables.getValue("/SmartDashboard/ReverseEnabled"));
                break;
        }
    },
    changeCamera: function(val) {
        var camhtml;
        switch(val) {
            case "Enabled": // ie ReverseEnabled
                camhtml = "<img width=\"600px\" src='http://" + this.reverseCam.ip +
                                        this.reverseCam.url + "'></img>";
                break;
            case "Disabled":
                camhtml = "<img width=\"600px\" src='http://" + this.forwardCam.ip +
                                        this.forwardCam.url + "'></img>";
                break;
        }
        if(!app.robotConnected || !camhtml) {
            camhtml = '<div style="background-color:rgb(0,0,20);width:600px;height:400px"></div>';
        }
        app.logMsg("changeCamera: " + camhtml + " val:" + val);
        $("#camera").html(camhtml);
    }
};

global.app.setPageHandler("driver", driver);
})(window);
