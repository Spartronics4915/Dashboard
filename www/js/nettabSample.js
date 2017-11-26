(function(global) {
'use strict';

var ntSample = {
    "/SmartDashboard/Build": "by: Atlas02 on: Feb 08, 08:05 PM (week3-90-g1c082f9-dirty)",

    "/LiveWindow/~STATUS~/LW Enabled": false,
    "/SmartDashboard/Loggers/<shared>": "DEBUG",
    "/SmartDashboard/Loggers/Launcher": "DEBUG",
    "/SmartDashboard/Loggers/Climber": "NOTICE",
    "/SmartDashboard/Loggers/Robot": "DEBUG",
    "/SmartDashboard/Loggers/OI": "DEBUG",
    "/SmartDashboard/Loggers/Intake": "NOTICE",
    "/SmartDashboard/Loggers/Drivetrain": "DEBUG",
    "/SmartDashboard/LauncherLogLevel": "DEBUG",

    "/SmartDashboard/AllianceStation": "Blue3",
    "/SmartDashboard/AutoStrategyOptions": "None,Fuel,Fuel+Sprocket,Left Sprocket,Right Sprocket,Line Cross",

    "/SmartDashboard/Drivetrain_Status": "initialized",

    "/SmartDashboard/Agitator Status:": "Initialized",
    "/SmartDashboard/Launcher Status:": "Initialized",
    "/SmartDashboard/Launcher_ACT": "-2996.77734375",
    "/SmartDashboard/Launcher_MSG": "-2997 / 3000",
    "/SmartDashboard/Launcher_TGT": "3000",
    "/SmartDashboard/Climber Status": "Initialized",
    "/SmartDashboard/Climber State": "SLOW",
    "/SmartDashboard/Climber Speed": "0.375",
    "/SmartDashboard/Intake Status": "Initialized",
    "/SmartDashboard/Intake State": "OFF",
    "/SmartDashboard/Intake Speed": "0",
};


global.initNetTabSample = function() {
    for(let key in ntSample) {
        NetworkTables.putValue(key, ntSample[key]);
    }
};

})(window);
