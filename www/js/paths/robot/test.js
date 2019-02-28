/* global geo robot */
if(window.robot == undefined) window.robot = {};

class Test
{
    // Please validate geo.Test.* before these.
    static testTrajectory()
    {
        let maxDx = 1; // inches
        let maxDy = 1; // inches
        let maxDTheta = .01; // radians
        let timingConstraints = null;
        let startVelocity = 0;
        let endVelocity = 0;
        let maxVelocity = 80; // ips
        let maxAbsAccel = 20; // ips/sec
        let pose2Array = geo.Spline2Array.fromPose2Array([
                geo.Pose2d.fromXYTheta(-100, 100, 0),
                geo.Pose2d.fromXYTheta(-50, 100, 0),
                geo.Pose2d.fromXYTheta(-50, 50, 270),
                geo.Pose2d.fromXYTheta(-100, 50, 360),
        ]);
        let traj = robot.Trajectory.generateTrajectory(pose2Array, 
                                        maxDx, maxDy, maxDTheta,
                                        timingConstraints, 
                                        startVelocity, endVelocity, 
                                        maxVelocity, maxAbsAccel);
    }
}

window.robot.Test = Test;