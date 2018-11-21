(function(global) {
'use strict';

// this file is used to populate dashboard with 'typical' values
// to run: enter  initNetTabSample() into the browser javascript console

var ntSample = {
    "Build": "by: Atlas02 on: Feb 08, 08:05 PM (week3-90-g1c082f9-dirty)",

    "Loggers/<shared>": "DEBUG",
    "Loggers/Launcher": "DEBUG",
    "Loggers/Climber": "NOTICE",
    "Loggers/Robot": "DEBUG",
    "Loggers/OI": "DEBUG",
    "Loggers/Intake": "NOTICE",
    "Loggers/Drivetrain": "DEBUG",
    "LauncherLogLevel": "DEBUG",

    "AllianceStation": "Blue3",
    "AutoStrategyOptions": "None,Fuel,Fuel+Sprocket,Left Sprocket,Right Sprocket,Line Cross",

    "Drivetrain_Status": "initialized",

    "Agitator Status:": "Initialized",
    "Launcher Status:": "Initialized",
    "Launcher_ACT": "-2996.77734375",
    "Launcher_MSG": "-2997 / 3000",
    "Launcher_TGT": "3000",
    "Climber Status": "Initialized",
    "Climber State": "SLOW",
    "Climber Speed": "0.375",
    "Intake Status": "Initialized",
    "Intake State": "OFF",
    "Intake Speed": "0",
};


global.initNetTabSample = function() {
    for(let key in ntSample) {
        app.putValue(key, ntSample[key]);
    }
};

})(window);
