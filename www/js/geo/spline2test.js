/* global geo */

class Spline2Test
{
    static test1()
    {
        // 4 points on a circle, centered at 0
        const radius = 40;
        let waypoints = [];
        waypoints.push(new geo.Pose2d(new geo.Translation2d(0, radius),
                                      geo.Rotation2d.fromDegrees(0)));
        waypoints.push(new geo.Pose2d(new geo.Translation2d(radius, 0),
                                      geo.Rotation2d.fromDegrees(-90)));
        waypoints.push(new geo.Pose2d(new geo.Translation2d(0, -radius),
                                      geo.Rotation2d.fromDegrees(-180)));
        waypoints.push(new geo.Pose2d(new geo.Translation2d(radius, 0),
                                      geo.Rotation2d.fromDegrees(-270)));
        waypoints.push(new geo.Pose2d(new geo.Translation2d(0, radius),
                                      geo.Rotation2d.fromDegrees(0)));

        const s2array = geo.Spline2Array.fromPose2Array(waypoints);
        return geo.Spline2Sampler.sampleSplines(s2array);
    }

}

if(window.geo == undefined)
    window.geo = {};
window.geo.Spline2Test = Spline2Test;