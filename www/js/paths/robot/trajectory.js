import {Pose2d} from "../geo/pose2d.js";
import {epsilonEquals} from "../geo/test.js";
import {Spline2Array} from "../geo/spline2array.js";

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

    draw(ctx, mode, color)
    {
        for(let p of this.poseSamples)
            p.draw(ctx, color);
    }

    // returns a trajectory:
    //   array of pose2d,curvature,dcurvature,time
    //  cf: timeParameterizeTrajectory (java implementation)
    static generate(samples, timingConstraints, maxDx,
            startVelocity, endVelocity, maxVelocity, maxAbsAccel)
    {
        // Resample with equidistant steps along the trajectory. 
        // Note that we may have sampled the spline with the same 
        // value for maxDx. In that case, we were working on the xy 
        // plane. Now, we're working along the robot trajectory. 
        //
        let result = [];
        let totalDist = 0;
        samples[0].distance = 0.0;
        result.push(samples[0]);
        let last = samples[0];
        let next;
        for(let i=1;i<samples.length;i++)
        {
            next = samples[i];
            let dist = next.distance(last);
            totalDist += dist;
            if(dist >= maxDx)
            {
                let pct = maxDx/dist;
                result.push(last.interpolate(next, pct));
                last = next;
            } 
            else
            if(i == samples.length-1)
            {
                // last sample isn't as far as maxDx, but it
                // is important, so lets just append it for now.
                result.push(next);
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

