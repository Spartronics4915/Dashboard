/* global app */
import Spline2Array from "./geo/spline2array.js";
import {Spline2Sampler, kMaxDX} from "./geo/spline2sampler.js";
import Trajectory from "./robot/trajectory.js";
import {Pose2d} from "./geo/pose2d.js";

const defaultPathConfig = 
{
    maxDX: kMaxDX,
    startVelocity: 0, 
    endVelocity: 0,
    maxVelocity: 60, // 5 fps
    maxAbsAccel: 3,  // fps/s
};

// an individual path, borne from waypoints
export class Path
{
    constructor(waypoints, name, config)
    {
        this.name = name;
        this.config = Object.assign({}, defaultPathConfig, config);
        this.waypoints = waypoints;
        this.splines = null;
        this.osplines = null;
        this.trajectory = null;
    }

    draw(ctx, mode)
    {
        switch(mode)
        {
        case "waypoints":
            for(let p of this.waypoints)
                p.draw(ctx, true/*heading*/);
            break;
        default:
            app.warning("Path.draw unknown mode " + mode);
        }
    }

    getWaypoints()
    {
        return this.waypoints;
    }

    getSplines()
    {
        if(!this.splines)
            this.splines = Spline2Array.fromPose2Array(this.waypoints);
        return this.splines;
    }
    
    getSplineSamples()
    {
        let splines = this.getSplines();
        let samps = [];
        Spline2Sampler.sampleSplines(splines, samps);
        return samps;
    }

    getOptimizedSplines()
    {
        if(this.osplines == null)
        {
            this.osplines = Spline2Array.fromPose2Array(this.waypoints);
            this.osplines.optimizeCurvature();
        }
        return this.osplines;
    }

    getOptimizedSplineSamples()
    {
        let osplines = this.getOptimizedSplines();
        let samps = [];
        Spline2Sampler.sampleSplines(osplines, samps);
        // NB: maxDx, maxDy, maxDTheta are optional params
        return samps;
    }

    getTrajectory()
    {
        if(this.trajectory == null)
        {
            let osamps = this.getOptimizedSplineSamples();
            this.trajectory = Trajectory.generate(osamps,
                                    null,  // timing constraints tbd
                                    this.config.maxDX, 
                                    this.config.startVelocity, 
                                    this.config.endVelocity, 
                                    this.config.maxVelocity,
                                    this.config.maxAbsAccel);
        }
        return this.trajectory;
    }
}

// a repository for paths, keyed by pathname
export class PathsRepo
{
    constructor()
    {
        this.pathMap = {};
        this._createTests();
        // load more from disk, localStorage, etc
    }

    getPath(nm)
    {
        return this.pathMap[nm];
    }

    addPath(nm, path)
    {
        this.pathMap[nm] = path;
    }

    _createTests()
    {
        const cx = -150;
        const cy = 20;
        const radius = 40;
        let waypoints = [];
        waypoints.push(Pose2d.fromXYTheta(cx, cy+radius, 0));
        waypoints.push(Pose2d.fromXYTheta(cx+radius, cy, -90));
        waypoints.push(Pose2d.fromXYTheta(cx, cy-radius, -180));
        waypoints.push(Pose2d.fromXYTheta(cx-radius, cy, -270));
        waypoints.push(Pose2d.fromXYTheta(cx, cy+radius, 0));
        this.addPath("test1", new Path(waypoints,"test1"));
    }
}

export default PathsRepo;
