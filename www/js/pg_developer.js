//
// javascript page handler for about.html
//
(function(global) {
'use strict';
var developer = {
    iteration: 0,
    idToSDKey: {
        "driveTuning": "Drive/TuningKnob",
        "harvesterTuning": "Harvester/TuningKnob",
        "scissorliftTarget1": "ScissorLift/Target1",
        "scissorliftTarget2": "ScissorLift/Target2",
        "scissorliftTarget3": "ScissorLift/Target3",
        "scissorliftTarget4": "ScissorLift/Target4",
        "articulatedGrabberTarget1": "ArticulatedGrabber/Target1",
        "articulatedGrabberTarget2": "ArticulatedGrabber/Target2",
        "articulatedGrabberTuning": "ArticulatedGrabber/TuningKnob",
        "climberSpeed": "Climber Speed",
    },

    netTabActions: { 
        // a dispatch table, trigger a function when a nettable entry changes.
        // args are (this, value)
        "/SmartDashboard/Build": function(o, value) {
            $("#buildid").html("<span class='green'>"+value+"</span");
        },

        // Drive ------------------------------------------------------
        "/SmartDashboard/Drive/Status": function(o, value) {
            $("#driveStatus").html(o.subsystemStatus(value));
        },
        "/SmartDashboard/Drive/State": function(o, value) {
            $("#driveState").text(value);
        },
        "/SmartDashboard/Drive/IMU_Heading": function(o, value) {
            o.updateIMU(Number(value));
        },
        "/SmartDashboard/Drive/TuningKnob": function(o, value) {
            $("#driveTuning").val(Number(value));
            $("#driveTuningTxt").text(value);
        },
        "/SmartDashboard/RobotState/pose": function(o, value) {
            // we expect three numbers in string value: "x y angle"
            if(o.odometryPlot)
            {
                var result = value.split(" ").map(parseFloat)
                o.odometryPlot.addDataPt(result[0], result[1], result[2]);
            }
        },

        // Vision --------------------------------------------------------
        "/SmartDashboard/Vision/Status": function(o, value) {
            $("#visionStatus").html(o.subsystemStatus(value));
        },
        "/SmartDashboard/Vision/State": function(o, value) {
            $("#visionState").text(value);
        },

        // ScissorLift ------------------------------------------------------
        "/SmartDashboard/ScissorLift/Status": function(o, value) {
            $("#scissorliftStatus").html(o.subsystemStatus(value));
        },
        "/SmartDashboard/ScissorLift/State": function(o, value) {
            $("#scissorliftState").text(value);
        },
        "/SmartDashboard/ScissorLift/WantedState": function(o, value) {
            $("#scissorliftWantedState").text(value);
        },
        "/SmartDashboard/ScissorLift/Target1": function(o, value) {
            $("#scissorliftTarget1").val(Number(value));
        },
        "/SmartDashboard/ScissorLift/Target2": function(o, value) {
            $("#scissorliftTarget2").val(Number(value));
        },
        "/SmartDashboard/ScissorLift/Target3": function(o, value) {
            $("#scissorliftTarget3").val(Number(value));
        },
        "/SmartDashboard/ScissorLift/Target4": function(o, value) {
            $("#scissorliftTarget4").val(Number(value));
        },

        // Harvester --------------------------------------------------------
        "/SmartDashboard/Harvester/Status": function(o, value) {
            $("#harvesterStatus").html(o.subsystemStatus(value));
        },
        "/SmartDashboard/Harvester/State": function(o, value) {
            $("#harvesterState").text(value);
        },
        "/SmartDashboard/Harvester/WantedState": function(o, value) {
            $("#harvesterWantedState").text(value);
        },
        "/SmartDashboard/Harvester/CubeRange": function(o, value) {
            if(o.harvesterRangeChart) {
                o.harvesterRangeChart.addDataPt(value);
            }
        },
        "/SmartDashboard/Harvester/TuningKnob": function(o, value) {
            $("#harvesterTuning").val(value);
            $("#harvesterTuningTxt").text(value);
        },

        // Articulated Grabber ----------------------------------------------
        "/SmartDashboard/ArticulatedGrabber/Status": function(o, value) {
            $("#articulatedGrabberStatus").html(o.subsystemStatus(value));
        },
        "/SmartDashboard/ArticulatedGrabber/State": function(o, value) {
            $("#articulatedGrabberState").text(value);
        },
        "/SmartDashboard/ArticulatedGrabber/WantedState": function(o, value) {
            $("#articulatedGrabberWantedState").text(value);
        },
        "/SmartDashboard/ArticulatedGrabber/Target1": function(o, value) {
            $("#articulatedGrabberTarget1").val(Number(value));
        },
        "/SmartDashboard/ArticulatedGrabber/Target2": function(o, value) {
            $("#articulatedGrabberTarget2").val(Number(value));
        },
        "/SmartDashboard/ArticulatedGrabber/TuningKnob": function(o, value) {
            $("#articulatedGrabberTuning").val(value);
            $("#articulatedGrabberTuningTxt").text(value);
        },

        // Climber --------------------------------------------------------
        "/SmartDashboard/Climber/Status": function(o, value) {
            $("#climberStatus").html(o.subsystemStatus(value));
        },
        "/SmartDashboard/Climber/State": function(o, value) {
            $("#climberState").text(value);
        },
        "/SmartDashboard/Climber/WantedState": function(o, value) {
            $("#climberWantedState").text(value);
        },
        "/SmartDashboard/Climber/Speed": function(o, value) {
            $("#climberSpeed").val(value);
            $("#climberSpeedTxt").text(value);
        },
        "/SmartDashboard/Climber/Current": function(o, value) {
            if(o.climberCurrent) {
                o.climberCurrent.addDataPt(value);
            }
        },
    },
    subsystemStatus: function(value) {
        return value === "ERROR" ?
            "<span style=\"color:red\">offline</span>" : "online";
    },
    pageLoaded: function(targetElem, html) {
        // app.logMsg("devpgLoaded begin --------{");
        var self = this;
        targetElem.innerHTML = html;

        // Selector (pulldown menu) support ------------------------------
        //  (currently there are none on the dev page)
        // The asumption is that the id of the selector matches
        // the SmartDashboard key.
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

        // Number support ----------------------------------------------
        $("input[type=number]").on('input', function() {
            var id = $(this).attr("id");
            var ntkey = self.idToSDKey[id];
            if(!ntkey) {
                app.logMsg("unknown number " + id);
            }
            var value = $(this).val();
            app.putValue(ntkey, Number(value));
        });

        // Slider support ----------------------------------------------
        // slider id mapping must be present in idToSDKey map above
        $("input[type=range]").on('input', function() {
                var id = $(this).attr("id");
                var ntkey = self.idToSDKey[id];
                if(!ntkey) {
                    app.logMsg("unknown slider " + id);
                }
                var value = $(this).val();
                $("#"+id+"Txt").text(value);
                // app.logMsg("slider " + id + ": " + Number(value));
                app.putValue(ntkey, Number(value));
            });


        // special widgets -----------------------------------------------
        if(false) {
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
        this.harvesterRangeChart = new StripChart({
            id: "#harvesterRangeChart",
            yaxis: {
                min:0,
                max:200,
            }
        });
        this.odometryPlot = new PathPlot({
            id: "#driveOdometryPlot",
            xaxis: {
                min: 0,
                max: 652,
                show: true
            },
            yaxis: {
                min: 0,
                max: 324,
                show: true
            },
            series: {
                shadowSize: 0,
                lines: {
                    show: true,
                },
                points: {
                    show: false,
                },
                color: "rgb(20, 120, 255)"
            }
                   
        });

        //  Climber -------------------------------------------------------
        this.climberCurrent = new StripChart({
            id: "#climberCurrent",
            yaxis: {
                min:0,
                max:60,
            }
        });

        function updateWhenNoRobot() {
            var r = Math.random();
            var angle = Math.floor(180*(Math.sin(self.iteration/10) *
                                     Math.sin(self.iteration/7) +
                                     .2*r));
            self.iteration++;
            self.updateIMU(angle);
            self.odometryPlot.addRandomPt();
            self.harvesterRangeChart.addRandomPt();
            self.climberCurrent.addDataPt(0);
            if(!app.robotConnected)
            {
                setTimeout(updateWhenNoRobot, 100);
            }
        }
        if(!app.robotConnected)
        {
            updateWhenNoRobot();
        }
        // we assume that after page loaded, we'll receive a dump
        // of all networktable values (via onNetTabChange)
        //app.logMsg("devpgLoaded end --------}");
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
        var f = this.netTabActions[key];
        if(f)
        {
            // app.logMsg("ntchange: " + key + ":" + value + " (" +isNew + ")");
            // app.logMsg("this.keys: " + Object.keys(this));
            f(this, value);
        }
        else {
            // app.logMsg("skipping ntchange for:" + key);
        }
    },

};
global.app.setPageHandler("developer", developer);
})(window);
