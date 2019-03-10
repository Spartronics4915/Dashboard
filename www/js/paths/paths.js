/* global app */
import Spline2Array from "./geo/spline2array.js";
import {Spline2Sampler, kMaxDX} from "./geo/spline2sampler.js";
import {Trajectory} from "./robot/trajectory.js";
import {Pose2d} from "./geo/pose2d.js";
import {CentripetalMax} from "./robot/timing.js";
import {Constants} from "./robot/constants.js";
import {DCMotorTransmission} from "./robot/dcmotor.js";
import {DifferentialDrive} from "./robot/drive.js";
import {DifferentialDriveDynamics} from "./robot/timing.js";

// an individual path, borne from waypoints
export class Path
{
    constructor(waypoints, name, config)
    {
        this.name = name;
        this.constants = Constants.getInstance(); // robotid is optional
        let defaultPathConfig = 
        {
            maxDX: kMaxDX, // from spline sampler
            startVelocity: 0, 
            endVelocity: 0,
            maxVelocity: this.constants.paths.MaxVelocity,
            maxAbsAccel: this.constants.paths.MaxAccel,
        };
        this.config = Object.assign({}, defaultPathConfig, config);
        this.waypoints = waypoints;
        this.splines = null;
        this.osplines = null;
        this.trajectory = null;
    }

    intersect(mode, x, y)
    {
        switch(mode)
        {
        case "waypoints":
            for(let p of this.waypoints)
            {
                if(p.intersect(x, y)) 
                    return p;
            }
            break;
        case "spline":
            for(let p of this.getSplineSamples())
            {
                if(p.intersect(x, y)) 
                    return p;
            }
            break;
        case "optspline":
            for(let p of this.getOptimizedSplineSamples())
            {
                if(p.intersect(x, y)) 
                    return p;
            }
            break;
        case "splineCtls":
            app.warning("splineCtls.intersection not implemented");
            break;
        case "optsplineCtls":
            app.warning("optsplineCtls.intersection not implemented");
            break;
        case "trajectory":
            return this.getTrajectory().intersect(x,y);
        default:
            app.warning("Path.draw unknown mode " + mode);
            break;
        }
        return null;
    }

    draw(ctx, mode, color)
    {
        switch(mode)
        {
        case "waypoints":
            for(let p of this.waypoints)
                p.draw(ctx, color);
            break;
        case "spline":
            for(let p of this.getSplineSamples())
                p.draw(ctx, color);
            break;
        case "optspline":
            for(let p of this.getOptimizedSplineSamples())
                p.draw(ctx, color);
            break;
        case "splineCtls":
            this.getSplines().draw(ctx, color);
            break;
        case "optsplineCtls":
            this.getOptimizedSplines().draw(ctx, color);
            break;
        case "trajectory":
            this.getTrajectory().draw(ctx, mode, color);
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
        if(!this.splinesamps)
        {
            let splines = this.getSplines();
            this.splinesamps = 
                Spline2Sampler.sampleSplines(splines);
        }
        return this.splinesamps;
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
        if(!this.osplinesamps)
        {
            let osplines = this.getOptimizedSplines();
            this.osplinesamps = Spline2Sampler.sampleSplines(osplines);
                // NB: maxDx, maxDy, maxDTheta are optional params
        }
        return this.osplinesamps;
    }

    getTrajectory()
    {
        if(this.trajectory == null)
        {
            let osamps = this.getOptimizedSplineSamples();
            let timing = [];
            let leftTrans = new DCMotorTransmission(
                                        this.constants.drive.LeftTransmission);
            let rightTrans = new DCMotorTransmission(
                                        this.constants.drive.RightTransmission);
            let drive = new DifferentialDrive(this.constants, leftTrans, rightTrans);
            timing.push(new CentripetalMax(this.constants.paths.MaxCentripetalAccel));
            timing.push(new DifferentialDriveDynamics(drive, 
                                            this.constants.paths.MaxVoltage));
            this.trajectory = Trajectory.generate(osamps,
                                    timing,  // timing constraints tbd
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
const field =
{
    xsize:684,
    ysize:342,
    xrange: [0, 684],
    yrange: [-171, 171],
};

const landmarks = 
{
    bottomLeftLoadingStation: 
        Pose2d.fromXYTheta(field.xrange[0]+24, field.yrange[0]+29, 0),
    centerLeftHalfUp:
        Pose2d.fromXYTheta(field.xrange[0]+171, field.yrange[0]+171, 90),
    topLeftRocketHatch1: Pose2d.fromXYTheta(342-125, 145, 28.75),
};

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
        let waypoints = [
            landmarks.bottomLeftLoadingStation,
            landmarks.centerLeftHalfUp,
            landmarks.topLeftRocketHatch1,
        ];
        this.addPath("test1", new Path(waypoints,"test1"));
    }
}

export default PathsRepo;
