/* global app */
import {Pose2d,Rotation2d,Translation2d} from "./paths/geo/pose2d.js";
export class RobotStateMgr
{
    constructor()
    {
        this.phase = "OFFLINE";
        this.poseLists = 
        {
            "OFFLINE": [],
            "TEST": [],
            "AUTONOMOUS": [],
            "TELEOP": [],
            "DISABLED": [],
        };
        this.activeList = null;
    }

    getPoseListKeys()
    {
        // sorted in order lowest->highest precedence (for drawing)
        return ["OFFLINE", "DISABLED", "TEST", "TELEOP", "AUTONOMOUS"];
    }

    getPoseLists()
    {
        return this.poseLists;
    }

    changeGamePhase(phase)
    {
        this.phase = phase;
        this.activeList = this.poseLists[phase];
        if(this.activeList != undefined && this.activeList.length > 0)
        {
            app.info(`clearing ${this.activeList.length} poses for ${phase}`);
            this.activeList.length = 0; // clears the array
        }
    }

    addRandomPose()
    {
        if(this.activeList != undefined)
        {
            this._checkSize(this.activeList);
            let lastPose = this.activeList[this.activeList.length-1];
            let newpose = null;
            if(lastPose == undefined)
                newpose = "20 30 0";
            else
            {
                const xmin = 0, xmax = 684, ymin = -684/4, ymax = -ymin;
                let x = lastPose[0] + lastPose[3] * Math.random() * 8;
                let y = lastPose[1] + lastPose[4] * Math.random() * 8;
                let rads;
                if(x < xmin)
                    rads = 0;
                else
                if(x > 684)
                    rads = -Math.PI;
                else
                if(y < ymin)
                    rads = Math.PI / 2;
                else
                if(y > ymax)
                    rads = -Math.PI / 2;
                else
                    rads = lastPose[2] + (Math.random()-.5) * .1; 
                let degs = Math.floor(this.radToDeg(rads)) % 360;
                newpose = `${x.toFixed(1)} ${y.toFixed(1)} ${degs}`;
            }
            if(newpose)
                app.putValue("RobotState/pose", newpose);

            // trigger vision target too
            if(!this.visionTarget)
            {
                this.visionTarget = {};
                this.visionTarget.timeStamp = Date.now(); 
            }
            if(this.visionTarget.timeStamp + 500 < Date.now())
            {
                // produce a robot-relative target (reverse) around
                // 48-72 inches away with a relative orientation of -15-15 deg
                let targets; 
                if(true)
                {
                    targets = [48+24*Math.random(), 
                          12*Math.random(),
                          this.degToRad((Math.random()-.5)*0),
                         ];
                    targets.push(targets[0], targets[1], targets[2]);
                    targets[4] *= -1;
                }
                else
                    targets = [20, 0, 0];
                targets.push(30); // latency
                app.putValue("Vision/Reverse/solvePNP", targets);
                this.visionTarget.timeStamp = Date.now(); 
            }
        }
    }

    getLatest(offset)
    {
        if(this.activeList)
        {
            let laststate = this.activeList[this.activeList.length -1];
            if(!offset)
                return laststate;
            let rpose = this.relativePose(laststate, offset.x, offset.y, 
                                            this.degToRad(offset.theta));
            rpose.push(Math.cos(rpose[2]), Math.sin(rpose[2]));
            return rpose;
        }
        else
            return null;
    }

    degToRad(deg)
    {
        return Math.PI * deg / 180.;
    }

    radToDeg(rad)
    {
        return rad * 180. / Math.PI;
    }

    relativePose(robotPose, dx, dy, dtheta)
    {
        if(!robotPose)
            robotPose = [0, 0, 1, 0];
        let targetPose = new Pose2d(new Translation2d(robotPose[0], robotPose[1]), 
                                    new Rotation2d(robotPose[3], robotPose[4]));
        targetPose = targetPose.transformBy(new Pose2d(
            new Translation2d(dx, dy),
            Rotation2d.fromRadians(dtheta)
        ));
        return targetPose.asArray();
    }

    addPose(pstr)
    {
        if(this.activeList == undefined)
            app.info("RobotState received pose in unexpected state" + this.phase);
        else
        {
            // We expect three numbers in string value: "x y angle"
            //  x,y measured in inches, angle in degrees. We convert
            //  angle to radians.
            this._checkSize(this.activeList);
            let pose = pstr.split(" ").map(parseFloat);
            pose[2] = this.degToRad(pose[2]);
            let lastpose = this.activeList[this.activeList.length-1];
            if(lastpose)
            {
                // constrain poses to be sufficiently different
                //  3 inchs or 2 degrees
                if(Math.abs(pose[0] - lastpose[0]) > 3 ||
                   Math.abs(pose[1] - lastpose[1]) > 3 ||
                   Math.abs(pose[2] - lastpose[2]) > .04) /*around 2 degree*/
                {
                    // append with sin and cos for drawing faster
                    // until memory tradeoff proves unwise
                    pose.push(Math.cos(pose[2]), Math.sin(pose[2]));
                    this.activeList.push(pose);
                }
                else
                {
                    app.debug("filtering: " + pstr);
                }
                // else filter it
            }
            else
            {
                pose.push(Math.cos(pose[2]), Math.sin(pose[2]));
                this.activeList.push(pose);
            }
        }
    }

    _checkSize(list)
    {
        if(list.length > 1000)
        {
            app.notice("robotstate culling points during " + this.phase);
            list.splice(0, 100);
        }
    }
}

export default RobotStateMgr;
