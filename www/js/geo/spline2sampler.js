/* global geo */
const kMaxDX = 2.0; //inches
const kMaxDY = 0.05; //inches
const kMaxDTheta = 0.1; //radians!
const kMinSampleSize = 1;

class Spline2Sampler
{  
    static sampleSplines(spline2array)
    {
        let accum = []; // array of post2d with curvature
        accum.push(spline2array.get(0).getPose2dWithCurvature(0.0));
        for(let i=0;i<spline2array.length;i++)
        {
            let s = spline2array.get(i);
            Spline2Sampler.sampleSpline(s, accum, 0.0, 1.0,
                                            kMaxDX, kMaxDY, kMaxDTheta, 
                                            /*skip first*/ true);
        }
        return accum;
    }

    static sampleSpline(spline2, accum, t0, t1, maxDx, maxDy, maxDTheta, skipFirst)
    {
        const dt = (t1 - t0) / kMinSampleSize;
        if(skipFirst == undefined || !skipFirst)
            accum.push(spline2.getPose2dWithCurvature(0.0));
        for(let t = t0; t < t1; t += dt)
        {
            Spline2Sampler.getSegmentArc(spline2, accum, t, t+dt,
                                          maxDx, maxDy, maxDTheta);
        }
    }

    static getSegmentArc(spline2, accum, t0, t1, maxDx, maxDy, maxDTheta)
    {
        const p0 = spline2.getPose(t0);
        const p1 = spline2.getPose(t1);
        const twist = geo.Pose2d.getTwist(p0, p1);
        if (twist.dy > maxDy || twist.dx > maxDx || twist.dtheta > maxDTheta)
        {
            // subdivide
            Spline2Sampler.getSegmentArc(spline2, accum, t0, (t0 + t1) / 2, 
                                        maxDx, maxDy, maxDTheta);
            Spline2Sampler.getSegmentArc(spline2, accum, (t0 + t1) / 2, t1, 
                                        maxDx, maxDy, maxDTheta);
        }
        else
        {
            accum.push(spline2.getPose2dWithCurvature(t1));
        }
    }
}

if(window.geo == undefined)
    window.geo = {};

window.geo.Spline2Sampler = Spline2Sampler;