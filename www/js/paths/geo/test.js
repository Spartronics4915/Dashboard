/* global geo */
if(window.geo == undefined) window.geo = {};
window.geo.epsilonEquals = function(x, y, epsilon=1e-10)
{
    if(Math.abs(x - y) < epsilon)
        return true;
    else
        return false;
};

window.geo.assertEquals = function(a, b, msg, epsilon=.0001)
{
    if(Math.abs(a-b) > epsilon)
    {
        console.error(msg);
    }
};

window.geo.assertTrue = function(b, msg)
{
    if(!b)
        console.error(msg);
};

class Test
{
    testPose2d()
    {
        // Test transformation
        var pose1 = new geo.Pose2d(new geo.Translation2d(3, 4), 
                                    geo.Rotation2d.fromDegrees(90));
        var pose2 = new geo.Pose2d(new geo.Translation2d(1, 0), 
                                    geo.Rotation2d.fromDegrees(0));
        var pose3 = pose1.transformBy(pose2);
        geo.assertEquals(3, pose3.getTranslation().x, "x0");
        geo.assertEquals(5, pose3.getTranslation().y, "y0");
        geo.assertEquals(90, pose3.getRotation().getDegrees(), "r0");

        pose1 = new geo.Pose2d(new geo.Translation2d(3, 4), 
                                geo.Rotation2d.fromDegrees(90));
        pose2 = new geo.Pose2d(new geo.Translation2d(1, 0), 
                                geo.Rotation2d.fromDegrees(-90));
        pose3 = pose1.transformBy(pose2);
        geo.assertEquals(3, pose3.getTranslation().x, "x1");
        geo.assertEquals(5, pose3.getTranslation().y, "y1");
        geo.assertEquals(0, pose3.getRotation().getDegrees(), "r1");

        // A pose times its inverse should be the identity
        var identity = geo.Pose2d.fromIdentity();
        pose1 = new geo.Pose2d(new geo.Translation2d(3.51512152, 4.23), 
                                geo.Rotation2d.fromDegrees(91.6));
        pose2 = pose1.transformBy(pose1.inverse());
        geo.assertEquals(identity.getTranslation().x, pose2.getTranslation().x, "x2");
        geo.assertEquals(identity.getTranslation().y, pose2.getTranslation().y, "y2");
        geo.assertEquals(identity.getRotation().getDegrees(), 
                    pose2.getRotation().getDegrees(), "rot2");

        // Movement from pose1 to pose2 is along a circle with radius of 10 units centered at (3, -6)
        pose1 = new geo.Pose2d(new geo.Translation2d(3, 4), geo.Rotation2d.fromDegrees(90));
        pose2 = new geo.Pose2d(new geo.Translation2d(13, -6), geo.Rotation2d.fromDegrees(0.0));
        pose3 = pose1.interpolate(pose2, .5);

        var expectedAngleRads = Math.PI / 4;
        geo.assertEquals(3.0 + 10.0 * Math.cos(expectedAngleRads), pose3.getTranslation().x, "x3");
        geo.assertEquals(-6.0 + 10.0 * Math.sin(expectedAngleRads), pose3.getTranslation().y, "y3");
        geo.assertEquals(expectedAngleRads, pose3.getRotation().getRadians(), "r3");

        pose1 = new geo.Pose2d(new geo.Translation2d(3, 4), geo.Rotation2d.fromDegrees(90));
        pose2 = new geo.Pose2d(new geo.Translation2d(13, -6), geo.Rotation2d.fromDegrees(0.0));
        pose3 = pose1.interpolate(pose2, .75);
        expectedAngleRads = Math.PI / 8;
        geo.assertEquals(3.0 + 10.0 * Math.cos(expectedAngleRads), pose3.getTranslation().x, "x4");
        geo.assertEquals(-6.0 + 10.0 * Math.sin(expectedAngleRads), pose3.getTranslation().y, "y4");
        geo.assertEquals(expectedAngleRads, pose3.getRotation().getRadians(), "r4");
    }

    testTwist()
    {
        // Exponentiation (integrate twist to obtain a geo.Pose2d)
        var twist = new geo.Twist2d(1.0, 0.0, 0.0);
        var pose = geo.Pose2d.exp(twist);
        geo.assertEquals(1.0, pose.getTranslation().x, "x0");
        geo.assertEquals(0.0, pose.getTranslation().y, "y0");
        geo.assertEquals(0.0, pose.getRotation().getDegrees(), "r0");

        // Scaled.
        twist = new geo.Twist2d(1.0, 0.0, 0.0);
        pose = geo.Pose2d.exp(twist.scaled(2.5));
        geo.assertEquals(2.5, pose.getTranslation().x, "x1");
        geo.assertEquals(0.0, pose.getTranslation().y, "y1");
        geo.assertEquals(0.0, pose.getRotation().getDegrees(), "r1");

        // Logarithm (find the twist to apply to obtain a given geo.Pose2d)
        pose = new geo.Pose2d(new geo.Translation2d(2.0, 2.0), 
                                geo.Rotation2d.fromRadians(Math.PI/2));
        twist = geo.Pose2d.log(pose);
        geo.assertEquals(Math.PI, twist.dx, "dx0");
        geo.assertEquals(0.0, twist.dy, "dy0");
        geo.assertEquals(Math.PI / 2, twist.dtheta, "dtheta0");

        // Logarithm is the inverse of exponentiation.
        var pose2 = geo.Pose2d.exp(twist);
        geo.assertEquals(pose2.getTranslation().x, pose.getTranslation().x, "x3");
        geo.assertEquals(pose2.getTranslation().y, pose.getTranslation().y, "y3");
        geo.assertEquals(pose2.getRotation().getDegrees(), pose.getRotation().getDegrees(), "r3");
    }

    splineTest1()
    {
        var p1 = new geo.Pose2d(new geo.Translation2d(0,0), 
                                geo.Rotation2d.fromRadians(0));
        var p2 = new geo.Pose2d(new geo.Translation2d(15,10), 
                                new geo.Rotation2d(1, -5, true));
        var s = geo.Spline2.fromPoses(p1, p2);
        var samples = [];
        geo.Spline2Sampler.sampleSpline(s, samples);

        let arclength = 0;
        let lastPose = samples[0];
        for(let i=1;i<samples.length;i++)
        {
            let s = samples[i];
            const twist = geo.Pose2d.log(lastPose.inverse().transformBy(s));
            arclength += twist.dx;
            lastPose = s;
        }
        geo.assertEquals(lastPose.getTranslation().x, 15.0, "x0");
        geo.assertEquals(lastPose.getTranslation().y, 10.0, "y0");
        geo.assertEquals(lastPose.getRotation().getDegrees(), -78.69006752597981, "r0");
        geo.assertEquals(arclength, 23.17291953186379, "arclength");
    }

    testSplineOptimizer()
    {
        let a = new geo.Pose2d(new geo.Translation2d(0, 100), 
                                geo.Rotation2d.fromDegrees(270));
        let b = new geo.Pose2d(new geo.Translation2d(50, 0), 
                                geo.Rotation2d.fromDegrees(0));
        let c = new geo.Pose2d(new geo.Translation2d(100, 100), 
                                geo.Rotation2d.fromDegrees(90));
        let splines0 = geo.Spline2Array.fromPose2Array([a, b, c]);

        let startTime = Date.now();
        geo.assertTrue(splines0.optimizeCurvature() < .014, "sumCurvature0");
        console.log("Optimization time (ms): " + (Date.now() - startTime));

        let d = new geo.Pose2d(new geo.Translation2d(0, 0), 
                               geo.Rotation2d.fromDegrees(90));
        let e = new geo.Pose2d(new geo.Translation2d(0, 50), 
                               geo.Rotation2d.fromDegrees(0));
        let f = new geo.Pose2d(new geo.Translation2d(100, 0), 
                               geo.Rotation2d.fromDegrees(90));
        let g = new geo.Pose2d(new geo.Translation2d(100, 100), 
                               geo.Rotation2d.fromDegrees(0));

        let splines1 = geo.Spline2Array.fromPose2Array([d, e, f, g]);
        startTime = Date.now();
        geo.assertTrue(splines1.optimizeCurvature() < 0.16, "sumCurvature1");
        console.log("Optimization time (ms): " + (Date.now() - startTime));

        let h = new geo.Pose2d(new geo.Translation2d(0, 0), 
                                geo.Rotation2d.fromDegrees(0));
        let i = new geo.Pose2d(new geo.Translation2d(50, 0), 
                                geo.Rotation2d.fromDegrees(0));
        let j = new geo.Pose2d(new geo.Translation2d(100, 50), 
                                geo.Rotation2d.fromDegrees(45));
        let k = new geo.Pose2d(new geo.Translation2d(150, 0), 
                                geo.Rotation2d.fromDegrees(270));
        let l = new geo.Pose2d(new geo.Translation2d(150, -50), 
                                geo.Rotation2d.fromDegrees(270));

        let splines2 = geo.Spline2Array.fromPose2Array([h,i,j,k,l]);
        startTime = Date.now();
        geo.assertTrue(splines2.optimizeCurvature() < 0.05, "sumCurvature2");
        geo.assertEquals(splines2.get(0).getCurvature(1.0), 0.0, "curvature0");
        geo.assertEquals(splines2.get(2).getCurvature(1.0), 0.0, "curvature2");
        console.log("Optimization time (ms): " + (Date.now() - startTime));
    }

    test1()
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

window.geo.Test = Test;