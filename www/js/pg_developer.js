//
// javascript page handler for about.html
//
(function(global) {
'use strict';
var developer = {
    randomData: [],

    pageLoaded: function(targetElem, html) {
        var self = this;
        var map = {
            loglevels:  "<option>DEBUG</option>"+
                        "<option>INFO</option>"+
                        "<option>NOTICE</option>"+
                        "<option>WARNING</option>"+
                        "<option>ERROR</option>",
        };
        targetElem.innerHTML = app.interpolate(html, map);

        // first initialize selectors from network tables.
        $(".selector").each(function() {
            var key = $(this).attr("id");
            var ntkey = "/SmartDashboard/" + key;
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

        // build string.
        var val = NetworkTables.getValue("/SmartDashboard/Build", "n/a");
        $(".buildid").text("Robot sw build: " + val);

        this.imuHeadingGage = new JustGage({
            id: "imuHeadingGage",
            value: 67,
            min: -180,
            max: 180,
            title: "IMU Heading",
            valueFontColor: "#888",
          });

        // console.log("chartWidth:" + $("#imuHeadingChart").width());
        // console.log("chartHeight:" + $("#imuHeadingChart").height());
        this.imuHeadingChart = new StripChart({
            id: "#imuHeadingChart",
            yaxis: {
                min:-200,
                max:200,
            }
        });
        function update() {
            var val = Math.floor(Math.random() * 360 - 180);
            self.imuHeadingChart.addDataPt(val);
            setTimeout(update, 30);
        }
        update();
    },

    onNetTabChange: function(key, value, isNew) {
        if(key === "/SmartDashboard/Drivetrain_IMU_Heading")
        {
            if(this.imuHeadingGage) {
                this.imuHeadingGage.refresh(Number(value));
            }
            if(this.imuHeadingChart) {
                this.imuHeadingChart.addDataPt(Number(value));
            }
        }
    },

};
global.app.setPageHandler("developer", developer);
})(window);
