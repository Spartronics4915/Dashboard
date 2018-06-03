/* global $ StripChart PathPlot app */
// javascript page handler for about.html
(function(global) {
    "use strict";
    var developer = {
        iteration: 0,

        // idToSDKey:
        //  This table maps from id-based events, to associated networktable key
        //  Used when we are *writing* values to networktables.
        idToSDKey: {
            "TestMode": "TestMode",
            "TestVariant": "TestVariant",
            "TestingGUI": "TestingGUI",
            "driveTuning": "Drive/TuningKnob", // unused
            "harvesterTuning": "Harvester/TuningKnob", // unused
            "climberSpeed": "Climber Speed",
            "launcherSpeed": "mLauncherWindingMotorDefaultSpeed"
        },
        //  table maps from networktable key, to per-key webpage refresh.
        //  used when we receive values from networktables.
        netTabActions: {
            // a dispatch table, trigger a function when a nettable entry 
            // changes. args are (this, value)
            "/SmartDashboard/Build": function(o, value) {
                $("#buildid").html("<span class='green'>"+value+"</span");
            },

            // Testing ------------------------------------------------------
            "/SmartDashboard/TestModeOptions": function(o, value) {
                var options = value.split(",");
                var sel = document.getElementById("TestMode");
                if(sel) {
                    $(sel).empty();
                    for(let i=0;i<options.length;i++) {
                        var opt = document.createElement("option");
                        opt.value = options[i];
                        opt.innerHTML = opt.value;
                        sel.appendChild(opt);
                    }
                }
            },
            "/SmartDashboard/TestMode": function(o, value) {
                $("#TestMode").val(value);
            },
            "/SmartDashboard/TestVariant": function(o, value) {
                $("#TestVariant").val(value);
            },
            "/SmartDashboard/TestingGUI": function(o, value) {
                $("#TestingGUI").prop("checked", value);
            },

            // Vision (used for demo) ----------------------------------------
            "/SmartDashboard/Vision/Status": function(o, value) {
                $("#visionStatus").html(o.subsystemStatus(value));
            },
            "/SmartDashboard/Vision/State": function(o, value) {
                $("#visionState").text(value);
            },

            // LED (Used for demo) -------------------------------------------
            "/SmartDashboard/LED/Status": function(o, value) {
                $("#ledStatus").html(o.subsystemStatus(value));
            },
            "/SmartDashboard/LED/DriverLED": function(o, value) {
                // value is expected to be an 0/1
                $("#ledDriverLED").attr("class", value ? "LEDOn" : "LEDOff");
            },
            "/SmartDashboard/LED/VisionLamp": function(o, value) {
                $("#ledVisionLamp").html(value ?
                        "<img src='/images/pic_bulbon.gif' width='10px' />" :
                        "<img src='/images/pic_bulboff.gif' width='10px' />");
            },
            "/SmartDashboard/LED/Message": function(o, value) {
                $("#ledMessage").html(value);
            },

            // Keys     ------------------------------------------------------
            "/mDistanceToBall": function(o,value) {
                $("#rawRange").val(value)
            },
            "/mLauncherRewoundSwitchTriggered": function(o, value) {
                $("#rewindState").val(value)
            },
            // Both of these reference the same keys, One is for the image, and one for 
            // the 'text' state
            "/mLauncherSolenoidState": function(o, value) {
                $("#launchState").val(value)

            },
            "/mBallPresent": function(o, value) {
                $('#ballHeld').html(value ?
                        "<img src='/images/pic_ballheld.png' width='10px' />":
                        "<img src='/images/pic_ballnotheld.png' width='10px' />");
            },
            // This is the speed that is read from
            "/mLauncherWindingMotorDefaultSpeed": function(o, value) {
                $('#launcherSpeed').val(value); 
            },          
            "/mLauncherWindingMotorCurrentSpeed": function(o, value) {
                $('#launcherCurrentSpeed').val(value);
            }





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

            // String support ----------------------------------------------
            $("input[type=text]").on("input", function() {
                var id = $(this).attr("id");
                var ntkey = self.idToSDKey[id];
                if(!ntkey) {
                    app.logMsg("unknown entry " + id);
                }
                var value = $(this).val();
                app.putValue(ntkey, value);
            });

            // Number support ----------------------------------------------
            $("input[type=number]").on("input", function() {
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
            $("input[type=range]").on("input", function() {
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

            // checkbox support --------------------------------------------
            $("input[type=checkbox]").on("input", function() {
                var id = $(this).attr("id");
                var ntkey = self.idToSDKey[id];
                if(!ntkey) {
                    app.logMsg("unknown checkbox " + id);
                }
                var value = $(this).prop("checked");
                // app.logMsg("checkbox " + id + ": " + value);
                app.putValue(ntkey, value);
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
                },
                widths: [1]
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
                        lineWidth: 1,
                    },
                    points: {
                        show: false,
                    },
                    color: "rgb(20, 120, 255)"
                }
            });
            this.leftSpeedChart = new StripChart({
                id: "#leftSpeedChart",
                yaxis: {
                    min:0,
                    max:80,
                },
                fillvalue: 0,
                channelcount: 2,
                colors: ["rgb(20, 120, 255)", "rgb(200, 200, 10)"],
                widths: [2, 1],
                maxlength: 400,
            });
            this.rightSpeedChart = new StripChart({
                id: "#rightSpeedChart",  // inches/sec
                yaxis: {
                    min:0,
                    max:80,
                },
                fillvalue: 0,
                channelcount: 2,
                colors: ["rgb(20, 120, 255)", "rgb(200, 200, 10)"],
                widths: [2, 1],
                maxlength: 400,
            });

            //  Climber -------------------------------------------------------
            this.climberCurrent = new StripChart({
                id: "#climberCurrent",
                yaxis: {
                    min:0,
                    max:60,
                }
            });

            this.updateWhenNoRobot = function()
            {
                var r = 2*(Math.random() - .5);
                var angle = Math.floor(180*(Math.sin(self.iteration/10) *
                                         Math.sin(self.iteration/7) +
                                         .2*r));
                this.iteration++;
                this.updateIMU(angle);
                this.odometryPlot.addRandomPt();
                this.harvesterRangeChart.addRandomPt();
                this.climberCurrent.addDataPt(0);

                let speed = 15 * (2 + Math.sin(this.iteration/20) + 
                                      Math.sin(this.iteration/15));
                let delta;
                if(!this.lastSpeed)
                    delta = speed;
                else
                    delta = speed - this.lastSpeed;
                this.lastSpeed = speed;

                if(this.inflection == undefined)
                    this.inflection = speed;
                else
                if(Math.sign(this.lastDelta) != Math.sign(delta))
                    this.inflection = speed;
                this.lastDelta = delta;

                let target = this.inflection + r;
                this.updateSpeedChart("left", speed, target);
                this.updateSpeedChart("right", .9*speed, target);

                if(!app.robotConnected)
                    setTimeout(this.updateWhenNoRobot.bind(this), 100);
            };

            if(!app.robotConnected)
            {
                this.updateWhenNoRobot();
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

        // speed data each frame, targetVel only on change
        updateSpeedChart: function(w, num, target)
        {
            num = Math.abs(Number(num)); // defensive
            switch(w)
            {
            case "left":
                this.leftSpeed = num;
                $("#leftSpeedTxt").text(num.toFixed(2));
                this.leftSpeedChart.addDataPts([num,target], 0);
                break;
            case "right":
                this.rightSpeed = num;
                $("#rightSpeedTxt").text(num.toFixed(2));
                this.rightSpeedChart.addDataPts([num,target], 0);
                break;
            }
        },

        onNetTabChange: function(key, value, isNew) {
            var f = this.netTabActions[key];
            if(f)
            {
                // app.logMsg("ntchange: "+key+":"+value+" (" +isNew + ")");
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
