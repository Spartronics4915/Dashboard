import Path from  "./path.js";
import {Pose2d} from "./geo/pose2d.js";
import {Constants} from "./robot/constants.js";

// Field is always in inches, since field measurements are provided that way
// GameConfig may require robots and paths in m or in, so we convert in-m-in
// on the fly.
const Field = 
{
    xsize: 54*12, // 648
    ysize: 27*12, // 324
    xrange: [0, 648],
    yrange: [-162, 162],
};

// landmarks are points on the field.
// When non-zero, heading assumes frontcenter of robot 
//  on approach. Path reversal, mirroring is dealt with 
//  elsewhere. Don't create reversal or mirror-sensitive
//  landmarks.
const landmarks2019 =  
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
}

const landmarks2020 = 
{
    leftmidRight: Pose2d.fromXYTheta(0, 0, 0),
    rightmidLeft: Pose2d.fromXYTheta(Field.xsize-1, 0, 180),
    midmidRight: Pose2d.fromXYTheta(Field.xsize*.5, 0, 0),
    midmidLeft: Pose2d.fromXYTheta(Field.xsize*.5, 0, 180),
};

// a repository for paths, keyed by pathname
export default class PathsRepo
{
    constructor(year="2019")
    {
        this.pathMap = {};
        this.year = year;
        switch(year)
        {
        case "2020":
            this._createPaths2020();
            break;
        case "2019":
        default:
            this._createPaths2019();
            break;
        }
        // load more from disk, localStorage, etc
    }

    getPath(nm)
    {
        return this.pathMap[nm];
    }

    // return 0 on success
    setContents(nm, txt)
    {
        // currently we ignore nm, since the serialization is
        // expected to include the name field. This allows us to
        // make copies.
        let newpath = Path.deserialize(txt);
        if(newpath)
        {
            this.pathMap[newpath.name] = newpath;
            return 0;
        }
        else
            return -1;
    }

    getContents(nm)
    {
        // return our waypoints in a concise json format
        let txt = "";
        let path = this.getPath(nm);
        if(path)
            txt = path.serialize();
        return txt;
    }

    getPathNames()
    {
        return Object.keys(this.pathMap);
    }

    addPath(path)
    {
        this.pathMap[path.name] = path;
    }

    _createPaths2020()
    {
        let landmarks = landmarks2020;
        this.addPath(new Path("home", []));
        this.addPath(new Path("midfield", [
                    landmarks.midmidRight,
                    landmarks.midmidRight,
                    ]));
        this.addPath(new Path("test1", [
                    _adjustPose("backcenter", landmarks.leftmidRight),
                    _adjustPose("frontcenter", landmarks.midmidRight),
                    ]));
        this.addPath(new Path("test1Reverse", [
                    _adjustPose("backcenter", landmarks.leftmidRight),
                    _adjustPose("frontcenter", landmarks.midmidRight),
                    ]).reverse());
    }

    _createPaths2019()
    {
        let landmarks = landmarks2019;
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
                    _adjustPose("backcenter", Pose2d.fromXYTheta(30, 30, 270)),
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

