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
export class Path
{
    constructor(name, waypoints, config)
    {
        this.name = name;
        let constants = Constants.getInstance(); // robotid is optional

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

    reverse()
    {
        this._reverse = true;
        return this;
    }

    intersect(mode, x, y)
    {
        switch(mode)
        {
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
                p.draw(ctx, color, 4, this._reverse);
            break;
        case "spline":
            for(let p of this.getSplineSamples())
                p.draw(ctx, color, 2);
            break;
        case "optspline":
            for(let p of this.getOptimizedSplineSamples())
                p.draw(ctx, color, 2);
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

function _adjustXY(refpt, x, y)
{
    let constants = Constants.getInstance(); // robotid is optional
    let dx, dy;
    switch(refpt)
    {
    case "backleft": // move waypoint right and down (up is y+)
        dx = constants.drive.CenterToFront;
        dy = -constants.drive.CenterToSide;
        break;
    case "backcenter": // move waypoint right
        dx = constants.drive.CenterToFront;
        dy = 0;
        break;
    case "backright": // move waypoint right and up
        dx = constants.drive.CenterToFront;
        dy = constants.drive.CenterToSide;
        break;
    case "frontleft": // move waypoint left and down
        dx = -constants.drive.CenterToFront;
        dy = -constants.drive.CenterToSide;
        break;
    case "frontcenter": // move waypoint left
        dx = -constants.drive.CenterToFront;
        dy = 0;
        break;
    case "frontright": // move waypoint left and up
        dx = -constants.drive.CenterToFront;
        dy = constants.drive.CenterToSide;
        break;
    case "center": // no offset, since poses are relative to our center
    default:
        dx = dy = 0;
        break;
    }
    return [dx, dy];
}

function _adjustPose(refpt, pose)
{
    let adj = _adjustXY(refpt, pose.translation.x, pose.translation.y);
    if(adj[0] != 0 || adj[1] != 0)
        return pose.offsetBy(adj[0], adj[1]); // in the direction of its heading
    else
        return pose;
}

const field =
{
    xsize: 54*12, // 648
    ysize: 27*12, // 324
    xrange: [0, 648],
    yrange: [-162, 162],
};

const landmarks = 
{
    bottomLeftLoadingStation: Pose2d.fromXYTheta(0, -136, 0),
    topLeftLoadingStation: Pose2d.fromXYTheta(0, 136, 0),
    leftMidfieldUp: Pose2d.fromXYTheta(160, 0, 90),
    leftPlatformBackCorner: Pose2d.fromXYTheta(48, 64, 0),
    rightPlatformBackCorner: Pose2d.fromXYTheta(48, -64, 0),
    topLeftRocketHatch1: Pose2d.fromXYTheta(214, 144, 28.75),
    rightCargoBay1: Pose2d.fromXYTheta(260, -26, 90),
    rightCargoBay2: Pose2d.fromXYTheta(282, -26, 90),
    rightCargoBay3: Pose2d.fromXYTheta(304, -26, 90),
    leftCargoBay1: Pose2d.fromXYTheta(260, 26, -90),
    leftCargoBay2: Pose2d.fromXYTheta(282, 26, -90),
    leftCargoBay3: Pose2d.fromXYTheta(304, 26, -90),
    centerCargoBay1: Pose2d.fromXYTheta(220, 11, 0),
    centerCargoBay2: Pose2d.fromXYTheta(220, -11, 0),
    leftHabZoneMin:Pose2d.fromXYTheta(46, -76, 0),
    leftHabZoneMax:Pose2d.fromXYTheta(96, 76, 0),
};

// a repository for paths, keyed by pathname
export class PathsRepo
{
    constructor()
    {
        this.pathMap = {};
        this._createPaths();
        // load more from disk, localStorage, etc
    }

    getPath(nm)
    {
        return this.pathMap[nm];
    }

    getPaths()
    {
        return Object.keys(this.pathMap);
    }

    addPath(path)
    {
        this.pathMap[path.name] = path;
    }

    _createPaths()
    {
        const lhabMin = _adjustPose("frontleft", landmarks.leftHabZoneMin);
        const lhabMax = _adjustPose("backright", landmarks.leftHabZoneMax);
        const maxVel = 16; // travel 4 ft in 3 sec: 16ips
        const habConstraint = {
            regionConstraints: [
                {
                    maxVel: maxVel, 
                    xmin: lhabMin.translation.x,
                    ymin: lhabMin.translation.y,
                    xmax: lhabMax.translation.x,
                    ymax: lhabMax.translation.y,
                },
            ],
        };
        this.addPath(new Path("test1", [
                    _adjustPose("backcenter", landmarks.bottomLeftLoadingStation),
                    landmarks.leftMidfieldUp,
                    _adjustPose("frontcenter", landmarks.topLeftRocketHatch1),
                    ]));
        this.addPath(new Path("test1Reverse", [
                    _adjustPose("backcenter", landmarks.bottomLeftLoadingStation),
                    landmarks.leftMidfieldUp,
                    _adjustPose("frontcenter", landmarks.topLeftRocketHatch1),
                    ]).reverse());
        this.addPath(new Path("straightTest", [
                    _adjustPose("backcenter", Pose2d.fromXYTheta(0, 0, 0)),
                    _adjustPose("frontcenter", Pose2d.fromXYTheta(222, 0, 0)),
                    ]));
        this.addPath(new Path("straightTestReverse", [
                    _adjustPose("backcenter", Pose2d.fromXYTheta(0, 0, 0)),
                    _adjustPose("frontcenter", Pose2d.fromXYTheta(222, 0, 0)),
                    ]).reverse());
        this.addPath(new Path("curvedTest", [
                    _adjustPose("backcenter", Pose2d.fromXYTheta(30, 30, 180)),
                    _adjustPose("frontcenter", Pose2d.fromXYTheta(78, 78, 90)),
                    ]));
        this.addPath(new Path("rightPlatformToRightCargo1", [
                    _adjustPose("backright", landmarks.rightPlatformBackCorner),
                    _adjustPose("frontcenter", landmarks.rightCargoBay1)
                     ], habConstraint));
        this.addPath(new Path("rightPlatformToRightCargo1Rev", [
                    _adjustPose("backright", landmarks.rightPlatformBackCorner),
                    _adjustPose("frontcenter", landmarks.rightCargoBay1)
                     ], habConstraint).reverse());
        this.addPath(new Path("rightPlatformToRightCargo2", [
                    _adjustPose("backright", landmarks.rightPlatformBackCorner),
                    _adjustPose("frontcenter", landmarks.rightCargoBay2)
                     ], habConstraint));
        this.addPath(new Path("rightPlatformToRightCargo3", [
                    _adjustPose("backright", landmarks.rightPlatformBackCorner),
                    _adjustPose("frontcenter", landmarks.rightCargoBay3)
                     ], habConstraint));
        this.addPath(new Path("rightPlatformToLeftCargo1", [
                    _adjustPose("backright", landmarks.rightPlatformBackCorner),
                    _adjustPose("frontcenter", landmarks.leftCargoBay1)
                     ], habConstraint));
        this.addPath(new Path("rightPlatformToLeftCargo2", [
                    _adjustPose("backright", landmarks.rightPlatformBackCorner),
                    _adjustPose("frontcenter", landmarks.leftCargoBay2)
                     ], habConstraint));
        this.addPath(new Path("rightPlatformToLeftCargo3", [
                    _adjustPose("backright", landmarks.rightPlatformBackCorner),
                    _adjustPose("frontcenter", landmarks.leftCargoBay3)
                     ], habConstraint));
        this.addPath(new Path("rightPlatformToCenterCargo1", [
                    _adjustPose("backright", landmarks.rightPlatformBackCorner),
                    _adjustPose("frontcenter", landmarks.centerCargoBay1)
                     ], habConstraint));
        this.addPath(new Path("rightPlatformToCenterCargo2", [
                    _adjustPose("backright", landmarks.rightPlatformBackCorner),
                    _adjustPose("frontcenter", landmarks.centerCargoBay2)
                     ], habConstraint));
        this.addPath(new Path("bottomLoadingToCenterCargo1", [
                    _adjustPose("backcenter", landmarks.bottomLeftLoadingStation),
                    _adjustPose("frontcenter", landmarks.centerCargoBay1)
                     ]));
        this.addPath(new Path("bottomLoadingToCenterCargo2", [
                    _adjustPose("backcenter", landmarks.bottomLeftLoadingStation),
                    _adjustPose("frontcenter", landmarks.centerCargoBay2)
                     ]));
    }
}

export default PathsRepo;
