//
// javascript page handler for driver.html
//
(function(global) {
'use strict';
var driver = {
    pageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;
        var dlinkDefault = {ip:"192.168.0.10", url: "/video.cgi"};
        var dlink4915 = {ip:"10.49.15.13", url: "/video.cgi"};
        var axis1 = {ip:"10.49.15.11", url: "/mjpg/video.mjpg"};
        var axis2 = {ip:"10.49.15.12", url: "/mjpg/video.mjpg"};
        var usbCam = {ip:"10.49.15.2:1071", url: "/mjpg/video.mjpg"};

        var intakeCam = dlink4915;
        var sprocketCam = axis2;

        if(false)
        {
            $("#intakeCam").html("<img width=\"400px\" src='http://" + intakeCam.ip +
                                        intakeCam.url + "''></img>");
            $("#sprocketCam").html("<img width=\"400px\" src='http://" + sprocketCam.ip +
                                        sprocketCam.url + "''></img>");
        }
        else {
            $("#driverCam").html("<img width=\"480px\" src='http://" + usbCam.ip +
                                        usbCam.url + "''></img>");
        }

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
    },

    onNetTabChange: function(key, value, isNew) {
        switch(key) {
            case "/SmartDashboard/AutoStrategyOptions":
                // we assume that value is a comma separated list
                var options = value.split(",");
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
            case "/SmartDashboard/DrivetrainReverseEnabled":
                if(value) {
                    $("#fwdrev").html('<img width="30px" src="/images/backward.gif"></img>');
                }
                else {
                    $("#fwdrev").html('<img width="30px" src="/images/forward.gif"></img>');
                }
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
        }
    }
};

global.app.setPageHandler("driver", driver);
})(window);
