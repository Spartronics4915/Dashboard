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
import {VelocityLimitRegionConstraint} from "./robot/timing.js";

// an individual path, borne from waypoints
export default class Path
{
    constructor(name, waypoints, config)
    {
        this.name = name;
        let constants = Constants.getInstance();
        let defaultPathConfig = 
        {
            maxDX: kMaxDX, // from spline sampler
            startVelocity: 0, 
            endVelocity: 0,
            maxVelocity: constants.paths.MaxVelocity,
            maxAbsAccel: constants.paths.MaxAccel,
            regionConstraints: [] // list of {maxVel,xmin,ymin,xmax,ymax}
        };
        this.config = Object.assign({}, defaultPathConfig, config);
        this.waypoints = waypoints;
        this.splines = null;
        this.osplines = null;
        this.trajectory = null;
        this._reverse = false;
    }

    serialize()
    {
        let path = {name: this.name, reverse: this._reverse};
        let pts = [];
        for(let wp of this.waypoints)
        {
            let h = wp.rotation.getDegrees();
            let o = {x: wp.translation.x, y: wp.translation.y, heading: h};
            pts.push(o);
        }
        path.waypoints = pts;
        // XXX: constraints!
        return JSON.stringify(path, null, 4);
    }

    static deserialize(txt)
    {
        let path = null;
        try
        {
            let o = JSON.parse(txt);
            let waypoints = [];
            for (let wp of o.waypoints)
                waypoints.push(Pose2d.fromXYTheta(wp.x, wp.y, wp.heading));
            path = new Path(o.name, waypoints);
            if(o.reverse)
                path.reverse();
            // XXX: constraints!
        }
        catch(err)
        {
            app.error(""+err);
            app.alertuser(""+err);
        }
        return path;
    }

    /**
     * preserves the order of the waypoints, but reverse each one's direction
     * so that it's possible to follow the same path, but in the reverse
     * direction.  If you are gluing paths together as with a k-turn, this
     * may not be sufficient.  Ie: you may need to pre-reverse the starting
     * pose so that it matches the end pose of the prior segment.
     */
    reverse()
    {
        this._reverse = true;
        return this;
    }

    intersect(config, x, y)
    {
        switch(config.mode.toLowerCase())
        {
        case "robot":
        case "robot (paused)":
        case "trajectory":
            return this.getTrajectory().intersect(x,y);
        case "waypoints":
            for(let p of this.waypoints)
            {
                if(p.intersect(x, y)) 
                {
                    if(this._reverse)
                    {
                        let pp = Pose2d.clone(p);
                        pp.reverse();
                        return pp;
                    }
                    else
                        return p;
                }
            }
            break;
        case "spline":
        case "optspline":
            for(let p of this.getOptimizedSplineSamples())
            {
                if(p.intersect(x, y)) 
                    return p;
            }
            break;
        case "controlpoints":
        case "optsplineCtls":
            app.warning("optsplineCtls.intersection not implemented");
            break;
        case "rawspline":
            for(let p of this.getSplineSamples())
            {
                if(p.intersect(x, y)) 
                    return p;
            }
            break;
        case "rawsplinectls":
            app.warning("splineCtls.intersection not implemented");
            break;
        default:
            app.warning("Path.draw unknown mode " + config.mode);
            break;
        }
        return null;
    }

    draw(ctx, config)
    {
        switch(config.mode.toLowerCase())
        {
        case "robot (paused)":
            config.paused = true;
            this.getTrajectory().draw(ctx, config);
            break;
        case "trajectory":
        case "robot":
            config.paused = false;
            this.getTrajectory().draw(ctx, config);
            break;
        case "waypoints":
            for(let p of this.waypoints)
                p.draw(ctx, config.colors.waypoints, 4, this._reverse);
            break;
        case "spline":
        case "optspline":
            for(let p of this.getOptimizedSplineSamples())
                p.draw(ctx, config.colors.spline || "blue", 2);
            break;
        case "controlpoints":
        case "optsplinectls":
            this.getOptimizedSplines().draw(ctx, config.colors.splineCtls || "red");
            break;
        case "rawspline": // un-optimized
            for(let p of this.getSplineSamples())
                p.draw(ctx, config.colors.spline, 2);
            break;
        case "rawsplinectls": // un-optimized
            this.getSplines().draw(ctx, config.colors.splineCtls || "red");
            break;
        default:
            app.warning("Path.draw unknown mode " + config.mode);
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
            let constants = Constants.getInstance();
            let osamps = this.getOptimizedSplineSamples();
            let timing = [];
            let leftTrans = new DCMotorTransmission(
                            constants.drive.LeftTransmission.Ks,
                            constants.drive.LeftTransmission.Kv,
                            constants.drive.LeftTransmission.Ka,
                            constants.drive.WheelRadius,
                            constants.robot.LinearInertia);
            let rightTrans = new DCMotorTransmission(
                            constants.drive.RightTransmission.Ks,
                            constants.drive.RightTransmission.Kv,
                            constants.drive.RightTransmission.Ka,
                            constants.drive.WheelRadius,
                            constants.robot.LinearInertia);
            let drive = new DifferentialDrive(constants, leftTrans, rightTrans);
            for(let rc of this.config.regionConstraints)
            {
                timing.push(new VelocityLimitRegionConstraint(
                    rc.maxVel, rc.xmin, rc.xmax, rc.ymin, rc.ymax
                ));
            }
            timing.push(new CentripetalMax(constants.paths.MaxCentripetalAccel));
            timing.push(new DifferentialDriveDynamics(drive, 
                                            constants.paths.MaxVoltage));
            this.trajectory = Trajectory.generate(osamps,
                                    timing,  // timing constraints tbd
                                    this.config.maxDX, 
                                    this.config.startVelocity, 
                                    this.config.endVelocity, 
                                    this.config.maxVelocity,
                                    this.config.maxAbsAccel);
            if(this._reverse)
                this.trajectory.reverse();
        }
        return this.trajectory;
    }
}
