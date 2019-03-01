import Pose2d from "../geo/pose2d.js";
import {epsilonEquals} from "../geo/test.js";
import Spline2Array from "../geo/spline2array.js";

export class Trajectory
{
    constructor(poseSamples)
    {
        this.poseSamples = poseSamples;
        this.timedPoses = [];
    }

    reverse()
    {

    }

    mirror()
    {
    }

    // returns a trajectory:
    //   array of pose2d,curvature,dcurvature,time
    //  cf: timeParameterizeTrajectory (java implementation)
    static generate(poseSamples, timingConstraints, maxDx,
            startVelocity, endVelocity, maxVelocity, maxAbsAccel)
    {
        // Resample with equidistant steps along the trajectory. 
        // Note that we sampled the spline with the same value for maxDx. 
        // In that case, we were working on the xy plane. 
        // Now, we're working along the robot trajectory. 
        Pose2d.computeDistances(poseSamples);
        let ndistSamples = Math.ceil(1 + poseSamples.totalDist/maxDx);
        let currentDist = maxDx;
        let insamp = 0;
        let lastSample = samples[insamp++];
        let nextSample = samples[insamp++];
        let sampleDist = nextSample.distance - lastSample.distance;
        let samps = [lastSample];
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

        if(timingConstraints)
        {
            // apply time constraints to deliver per-sample  velocity 
            // target. (tbd)
        }

        return new Trajectory(result);
    }
}

export default Trajectory;

