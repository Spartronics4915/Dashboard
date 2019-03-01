import Pose2d from "../geo/pose2d.js";
import {epsilonEquals} from "../geo/test.js";
import Spline2Array from "../geo/spline2array.js";

export class Trajectory
{
    constructor()
    {
        this.timedPoses = [];
    }

    reverse()
    {

    }

    mirror()
    {

    }

    // returns an array of pose2d,curvature,dcurvature,time
    //  cf: timeParameterizeTrajectory
    static generateTrajectory(pose2Array, maxDx, maxDy, maxDTheta,
            timingConstraints, startVelocity, endVelocity, maxVelocity, 
            maxAbsAccel)
    {
        let splines = Spline2Array.fromPose2Array(pose2Array);
        let samples = splines.sample(splines, maxDx, maxDy, maxDTheta);
        // Resample with equidistant steps along the trajectory. 
        // Note that we sampled the spline with the same value for maxDx. 
        // In that case, we were working on the xy plane. 
        // Now, we're working along the robot trajectory. 
        Pose2d.computeDistances(samples);
        let ndistSamples = Math.ceil(1 + samples.totalDist/maxDx);
        let currentDist = maxDx;
        let insamp = 0;
        let lastSample = samples[insamp++];
        let nextSample = samples[insamp++];
        let sampleDist = nextSample.distance - lastSample.distance;
        let result = [lastSample];
        for(let i=1;i<ndistSamples;i++,currentDist+=maxDx);
        {
            while(currentDist > nextSample.distance)
            {
                lastSample = nextSample;
                nextSample = samples[insamp++];
                sampleDist = nextSample.distance - lastSample.distance;
                if(insamp == samples.length)
                    break;
            }
            if(epsilonEquals(currentDist, lastSample.distance))
                result.push(lastSample);
            else
            if(epsilonEquals(currentDist, nextSample.distance))
                result.push(nextSample);
            else
            {
                let pct = (currentDist - lastSample.distance) / sampleDist;
                result.push(lastSample.interpolate(nextSample, pct));
            }
        }

        // finally we apply time constraints to deliver per-sample velocity
        // target.
        return result;
    }
}

export default Trajectory;

