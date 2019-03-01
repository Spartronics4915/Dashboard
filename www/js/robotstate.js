/* global app */
class RobotState
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
                newpose = "-140 30 90";
            else
            {
                let x = lastPose[0] + lastPose[3] * Math.random() * 4;
                let y = lastPose[1] + lastPose[4] * Math.random() * 4;
                let rads = lastPose[2] + Math.random() * .1; // 5ish degs
                let degs = Math.floor(180 * rads / Math.PI) % 360;
                newpose = `${x.toFixed(1)} ${y.toFixed(1)} ${degs}`;
            }
            if(newpose)
                app.putValue("RobotState/pose", newpose);
        }
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
            pose[2] = pose[2] * Math.PI / 180.0;
            let lastpose = this.activeList[this.activeList.length-1];
            if(lastpose)
            {
                // constrain poses to be sufficiently different
                if(Math.abs(pose[0] - lastpose[0]) > 5 ||
                   Math.abs(pose[1] - lastpose[1]) > 5 ||
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

window.RobotState = RobotState;