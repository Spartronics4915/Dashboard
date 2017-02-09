(function(global) {
'use strict';

var ntSample = {
    "/SmartDashboard/Loggers/<shared>": "DEBUG",
    "/SmartDashboard/Loggers/Launcher": "DEBUG",
    "/LiveWindow/~STATUS~/LW Enabled": false,
    "/SmartDashboard/Launcher_MSG": "-2997 / 3000",
    "/SmartDashboard/Agitator Status:": "Initialized",
    "/SmartDashboard/Loggers/OI": "DEBUG",
    "/SmartDashboard/Intake Status:": "Initialized",
    "/SmartDashboard/Drivetrain_Status": "initialized",
    "/SmartDashboard/Climber Status:": "Initialized",
    "/SmartDashboard/Loggers/Intake": "NOTICE",
    "/SmartDashboard/Loggers/Drivetrain": "DEBUG",
    "/SmartDashboard/Launcher_TGT": "3000",
    "/SmartDashboard/Loggers/Climber": "NOTICE",
    "/SmartDashboard/Loggers/Robot": "DEBUG",
    "/SmartDashboard/Build": "by: Atlas02 on: Feb 08, 08:05 PM (week3-90-g1c082f9-dirty)",
    "/SmartDashboard/Launcher Status:": "Initialized",
    "/SmartDashboard/Climber State:": "SLOW",
    "/SmartDashboard/Climber Speed": "0.375",
    "/SmartDashboard/Intake State:": "OFF",
    "/SmartDashboard/Intake Speed": "0",
    "/SmartDashboard/Launcher_ACT": "-2996.77734375",
    "/SmartDashboard/Launcher_RPM": "3000",
    "/SmartDashboard/LauncherLogLevel": "DEBUG",
    "/SmartDashboard/AutoPosition": "Center",
    "/SmartDashboard/AutoMode": "Sprocket",
};


global.initNetTabSample = function() {
    for(let key in ntSample) {
        NetworkTables.putValue(key, ntSample[key]);
    }
};

})(window);
