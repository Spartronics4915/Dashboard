//
// javascript page handler for driver.html
//
(function(global) {
'use strict';
var driver = {
    pageLoaded: function(targetElem, html) {
        targetElem.innerHTML = html;
        loadCameraOnConnect({
            container: '#driverCam',      // where to put the img tag
            proto: null,                  // optional, defaults to http://
            host: "http://10.49.15.12",   // optional, if null will use robot's autodetected IP address
            port: 80,                     // webserver port
            image_url: '/?action=stream', // mjpg stream of camera
            data_url: '/program.json',    // used to test if connection is up
            wait_img: null,               // optional img to show when not connected, can use SVG instead
            error_img: null,              // optional img to show when error connecting, can use SVG instead
            attrs: {                      // optional: attributes set on svg or img element
                width: 400,               // optional, stretches image to this width
                height: 300,              // optional, stretches image to this width
            }
        });
        loadCameraOnConnect({
            container: '#sprocketCam',      // where to put the img tag
            proto: null,                  // optional, defaults to http://
            host: "http://10.49.15.11",                   // optional, if null will use robot's autodetected IP address
            port: 80,                       // webserver port
            image_url: '/?action=stream', // mjpg stream of camera
            data_url: '/program.json',    // used to test if connection is up
            wait_img: null,               // optional img to show when not connected, can use SVG instead
            error_img: null,              // optional img to show when error connecting, can use SVG instead
            attrs: {                      // optional: attributes set on svg or img element
                width: 400,               // optional, stretches image to this width
                height: 300,              // optional, stretches image to this width
            }
        });
        // first initialize selectors from network tables.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key ;
            var val = NetworkTables.getValue(ntkey + "/selected");
            $(this).val(val);
        });

        // now update network tables on changes
        $(".selector").change(function() {
            var value = $(this).val();
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key ;
            NetworkTables.putValue(ntkey + "/selected", value);
        });
    },
};

global.app.setPageHandler("driver", driver);
})(window);
