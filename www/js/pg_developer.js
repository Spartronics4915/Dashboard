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

        var ntMap = {
            launcherTGT: "/SmartDashboard/Launcher_TGT"
        };

        // Selector (pulldown menu) support ------------------------------
        //  (currently there are none on the dev page)
        // The asumption is that the id of the selector matches
        // the SmartDashboard key.
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
            var ntkey = "/SmartDashboard/" + key ;
            NetworkTables.putValue(ntkey, value);
        });

        // Slider support ----------------------------------------------
        $("input[type=range]").on('input', function() {
                var value = $(this).val();
                var id = $(this).attr("id");
                $("#"+id+"Txt").text(value);
                NetworkTables.setValue(ntMap[id], value);
            });


        // special widgets -----------------------------------------------
        if(true) {
            this.imuHeadingGage = new JustGage({
                id: "imuHeadingGage",
                value: 67,
                min: -180,
                max: 180,
                title: "IMU Heading",
                valueFontColor: "#888",
                startAnimationTime: 150,
                refreshAnimationTime: 0,
                gaugeColor: "#333",
                levelColors: ["#000150", "#0025a0", "#1040f0"]
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
                                     Math.sin(self.iteration/7) +
                                     .2*Math.random()));
            self.iteration++;
            self.updateIMU(val);
            if(!app.robotConnected)
            {
                setTimeout(update, 100);
            }
        }
        if(!app.robotConnected)
        {
            update();
        }

        //  Launcher -------------------------------------------------------
        this.launcherACT = new StripChart({
            id: "#launcherACT",
            yaxis: {
                min:900,
                max:1100
            }
        });

        // we assume that after page loaded, we'll receive a dump
        // of all networktable values (via onNetTabChange)
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

    netTabActions: { // a dispatch table...
        "/SmartDashboard/Drivetrain_Status": function(value) {
            $("#drivetrainStatus").text(value);
        },
        "/SmartDashboard/Drivetrain_IMU_Heading": function(value) {
            this.updateIMU(Number(value));
        },
        "/SmartDashboard/Launcher_TGT": function(value) {
            $("#launcherTGT").val(value);
            $("#launcherTGTTxt").text(value);
        },
        "/SmartDashboard/Launcher_ACT": function(value) {
            this.launcherACT.addDataPt(valuie);
        },
        "/SmartDashboard/Launcher_MSG": function(value) {
            $("#launcherMSG").text(value);
        },
        "/SmartDashboard/Intake Status": function(value) {
            $("#intakeStatus").text(value);
        },
        "/SmartDashboard/Intake State": function(value) {
            $("#intakeState").text(value);
        },
        "/SmartDashboard/Intake Speed": function(value) {
            $("#intakeSpeed").text(value);
        },
        "/SmartDashboard/Climber Status": function(value) {
            $("#climberStatus").text(value);
        },
        "/SmartDashboard/Climber State": function(value) {
            $("#climberState").text(value);
        },
        "/SmartDashboard/Climber Speed": function(value) {
            $("#climberSpeed").text(value);
        },
    },

    onNetTabChange: function(key, value, isNew) {
        var f = this.netTabActions[key];
        if(f)
        {
            f(value);
        }
    },

};
global.app.setPageHandler("developer", developer);
})(window);
