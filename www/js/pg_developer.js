//
// javascript page handler for about.html
//
(function(global) {
'use strict';
var developer = {
    iteration: 0,

    pageLoaded: function(targetElem, html) {
        var self = this;
        targetElem.innerHTML = html;

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

        if(false) {
            this.imuHeadingGage = new JustGage({
                id: "imuHeadingGage",
                value: 67,
                min: -180,
                max: 180,
                title: "IMU Heading",
                valueFontColor: "#888",
              });
        }
        else {
            this.imuHeadingGage = null;
        }

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
            var val = Math.floor(180*(Math.sin(self.iteration/10) *
                                     Math.sin(self.iteration/5) +
                                     .2*Math.random()));
            self.iteration++;
            self.updateIMU(val);
            setTimeout(update, 100);
        }
        update();
    },

    updateIMU: function(num) {
        if(this.imuHeadingGage) {
            this.imuHeadingGage.refresh(num);
        }
        if(this.imuHeadingChart) {
            $("#imuHeading").text(num);
            this.imuHeadingChart.addDataPt(num);
        }
    },

    onNetTabChange: function(key, value, isNew) {
        switch(key) {
            case "/SmartDashboard/Drivetrain_Status":
                $("#drivetrainStatus").text(value);
                break;
            case "/SmartDashboard/Drivetrain_IMU_Heading":
                this.updateIMU(Number(value));
                break;
            case "/SmartDashboard/Build":
                $(".buildid").text("Robot sw build: " + value);
                break;
            case "/SmartDashboard/Intake Status":
                $("#intakeStatus").text(value);
                break;
            case "/SmartDashboard/Intake State":
                $("#intakeState").text(value);
                break;
            case "/SmartDashboard/Intake Speed":
                $("#intakeSpeed").text(value);
                break;
            case "/SmartDashboard/Climber Status":
                $("#climberStatus").text(value);
                break;
            case "/SmartDashboard/Climber State":
                $("#climberState").text(value);
                break;
            case "/SmartDashboard/Climber Speed":
                $("#climberSpeed").text(value);
                break;
        }
    },

};
global.app.setPageHandler("developer", developer);
})(window);
