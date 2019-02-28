/* global geo */
if(window.geo == undefined) window.geo = {};
window.geo.kCurveSamples = 100;
window.geo.kEpsilon = 1e-5;
window.geo.kMinDelta = .001;
window.geo.kStepSize = 1.0;
window.geo.kMaxIterations = 100;

class Spline2Array
{
    constructor()
    {
        this.splines = [];
    }
 
    sample(maxDx, maxDy, maxDTheta)
    {
        return geo.Spline2Sampler.sampleSplines(this, 
                                        maxDx, maxDy, maxDTheta);
    }

    static fromPose2Array(pose2Array) // aka waypoints
    {
        let sa = new Spline2Array(); // a spline2 for every 2 points
        for(let i=1;i<pose2Array.length;i++)
        {
            sa.push(geo.Spline2.fromPoses(pose2Array[i-1], pose2Array[i]));
        }
        return sa;
    }

    get length()
    {
        return this.splines.length;
    }

    get(i)
    {
        return this.splines[i];
    }

    push(spline2)
    {
        this.splines.push(spline2);
    }

    pop()
    {
        this.splines.pop();
    }

    optimizeCurvature()
    {
        // find the optimal curvature for a set of splines to reduce
        // the sum of the change in curvature over the path.
        let count = 0;
        let prev = this._sumDCurveSq();
        while(count < geo.kMaxIterations)
        {
            this._optimizationStep(prev);
            let current = this._sumDCurveSq();
            if (prev - current < geo.kMinDelta)
                return current;
            prev = current;
            count++;
        }
        return prev;
    }

    _optimizationStep(lastCurvature)
    {
        let controlPoints = []; // array of [ddx, ddy]
        let magnitude = 0.0;

        // We assume that splines are well-behaved.  
        //  - no degenerate segments 
        for(let i=0;i<this.splines.length-1;i++)
        {
            let temp0 = this.splines[i];
            let temp1 = this.splines[i+1];

            // skip segments with colinear endpoints
            if (temp0.getStartPose().isColinear(temp1.getStartPose()) ||
                temp0.getEndPose().isColinear(temp1.getEndPose()))
            {
                controlPoints.push(null); // keep indexing consisten
                continue;
            }

            let cp = []; // ddx, ddy

            // partialX derivative of integratedCurvature
            this.splines[i] = geo.Spline2.fromSpline2VaryDDX(temp0, 0, geo.kEpsilon);
            this.splines[i+1] = geo.Spline2.fromSpline2VaryDDX(temp1, geo.kEpsilon, 0);
            let curveDX = this._sumDCurveSq(); 
            cp.push((curveDX-lastCurvature)/geo.kEpsilon);

            // partialY derivative of integratedCurvature
            this.splines[i] = geo.Spline2.fromSpline2VaryDDY(temp0, 0, geo.kEpsilon);
            this.splines[i+1] = geo.Spline2.fromSpline2VaryDDY(temp1, geo.kEpsilon, 0);
            let curveDY = this._sumDCurveSq(); 
            cp.push((curveDY- lastCurvature)/geo.kEpsilon);
            controlPoints.push(cp);
            magnitude += cp[0]*cp[0] + cp[1]*cp[1];

            // reset segment i
            this.splines[i] = temp0;
            this.splines[i+1] = temp1;
        }
        magnitude = Math.sqrt(magnitude);

        // compute 3 points (p0-p2) that capture dcurvature  
        // minimize along the direction of the gradient

        // middle point is at the current location
        let p1 = new geo.Translation2d(0, lastCurvature); 

        let p0; // offset from the middle location by -stepSize
        let knorm = geo.kStepSize / magnitude; // normalize to step size
        for(let i=0;i<this.splines.length-1;i++)
        {
            if(controlPoints[i] == null) continue;
            controlPoints[i][0] *= knorm;
            controlPoints[i][1] *= knorm;
            this.splines[i].x.tweakCurvature(0, -controlPoints[i][0]); 
            this.splines[i].y.tweakCurvature(0, -controlPoints[i][1]);
            this.splines[i+1].x.tweakCurvature(-controlPoints[i][0], 0); 
            this.splines[i+1].y.tweakCurvature(-controlPoints[i][1], 0);
        }
        p0 = new geo.Translation2d(-geo.kStepSize, this._sumDCurveSq());

        let p2; // offset from middle location by +stepSize
        for(let i=0;i<this.splines.length-1;i++)
        {
            // opposite gradient by stepsize
            if(controlPoints[i] == null) continue;
            this.splines[i].x.tweakCurvature(0, 2*controlPoints[i][0]); 
            this.splines[i].y.tweakCurvature(0, 2*controlPoints[i][1]);
            this.splines[i+1].x.tweakCurvature(2*controlPoints[i][0], 0); 
            this.splines[i+1].y.tweakCurvature(2*controlPoints[i][1], 0);
        }
        p2 = new geo.Translation2d(geo.kStepSize, this._sumDCurveSq());

        const stepSize = this._fitParabola(p0, p1, p2);
        knorm = 1 + stepSize / geo.kStepSize;
        for(let i=0;i<this.splines.length-1;i++)
        {
            // move by the step size calculated by the parabola fit 
            // (+1 to offset for the final transformation to find p3)
            if(controlPoints[i] == null) continue;
            controlPoints[i][0] *= knorm;
            controlPoints[i][1] *= knorm;

            this.splines[i].x.tweakCurvature(0, controlPoints[i][0]); 
            this.splines[i].y.tweakCurvature(0, controlPoints[i][1]);
            this.splines[i+1].x.tweakCurvature(controlPoints[i][0], 0); 
            this.splines[i+1].y.tweakCurvature(controlPoints[i][1], 0);
        }
    }

    _sumDCurveSq()
    {
        let sum = 0;
        for(let spline of this.splines)
        {
            sum += spline.sumDCurveSq(geo.kCurveSamples);
        }
        return sum;
    }

    _fitParabola(p0, p1, p2)
    {        
        const A = p2.x * (p1.y - p0.y) + 
                  p1.x * (p0.y - p2.y) + 
                  p0.x * (p2.y - p1.y);
        const B = p2.x * p2.x * (p0.y - p1.y) + 
                  p1.x * p1.x * (p2.y - p0.y) + 
                  p0.x * p0.x * (p1.y - p2.y);
        return -B / (2 * A);
    }
}

window.geo.Spline2Array = Spline2Array;