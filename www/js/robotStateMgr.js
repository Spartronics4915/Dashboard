/* global app */
import {Pose2d,Rotation2d,Translation2d} from "./paths/geo/pose2d.js";

const s_testPath = [
[48.15, 45.25, -3.1415926, -1, 0],
[48.5,45.25,3.136990711226137,-0.9999894110819284,0.0046019261204478445],
[51.57349566525148,45.22941588095546,3.1331557592564225,-0.9999644096181183,0.008436794242369478],
[54.7018963255547,45.204213546876474,3.1331557592564225,-0.9999644096181183,0.008436794242369478],
[59.27671457536864,45.17031671309094,3.134689740044308,-0.9999761749868976,0.006902858724729716],
[64.86609217791438,45.151620010084706,3.139291682407965,-0.9999973527669782,0.0023009691514257256],
[71.82988421998861,45.124467296564426,3.136223720832194,-0.9999855873151432,0.005368906963995698],
[79.45473543602195,45.09616746021038,3.136990711226137,-0.9999894110819284,0.0046019261204478445],
[87.74067509950547,45.09807504241972,-3.141592653589793,-1,-1.2246467991473532e-16],
[98.63148254222862,45.06996845926097,3.138524692014022,-0.9999952938095762,0.003067956762965977],
[109.58079088158873,45.1386091130653,-3.1224178937412224,-0.9998161699249003,-0.019173584868322983],
[120.22400568985374,45.47028074082729,-3.090971287589567,-0.9987190122338729,-0.05059974903689939],
[130.10883711201797,46.23505361008585,-3.0242431233165417,-0.9931224418304956,-0.11708038064780062],
[138.55559972936737,47.608277865678744,-2.9253013624979176,-0.9767000861287117,-0.21460881099378698],
[146.26012239983564,49.760528267171566,-2.8071848418307233,-0.9446048372614801,-0.3282098435790927],
[152.6488945331921,52.48277128184658,-2.668359580527073,-0.8900994166251922,-0.4557664188194348],
[158.56301619374847,56.143603987310705,-2.5011556746475376,-0.8018347194799811,-0.5975458832896936],
[163.40335334646159,60.26437355390076,-2.3669323557075446,-0.7146586878627692,-0.6994733446402837],
[168.128832321605,65.48089263750303,-2.255718748585835,-0.6326129315698772,-0.7744681264006711],
[173.17994478965778,72.05646290834248,-2.205864372979552,-0.5932322950397999,-0.8050313311429635],
[178.25944710483788,78.91493087744787,-2.2135342769189803,-0.5993892984005645,-0.8004576621926228],
[183.76459386819252,85.89083093358046,-2.2771944796162344,-0.649098045130226,-0.7607047573192369],
[189.00298105693912,91.25031953434497,-2.415252750525942,-0.747610213115205,-0.66413776375526],
[194.270773883513,95.33226399235777,-2.5663498581326776,-0.8390602370703126,-0.544038526730884],
[199.73721535887523,98.29341131715552,-2.730485802436441,-0.9166790599210426,-0.39962419984564707],
[205.13291518793832,100.06662122395862,-2.9160974777706037,-0.9746835106885107,-0.2235890292297903],
[210.14152198364835,100.79136235978042,-3.0786994412864814,-0.9980228737714861,-0.06285175756416193],
[215.70454354614037,100.58810829317433,3.0058353538619142,-0.9907991218660204,0.13534068165013396],
[220.16835170843817,99.60402788393924,2.8447673711339223,-0.9562698664006583,0.29248579899555327],
[224.9585152489037,97.6744449236731,2.6829323980119866,-0.8966464701786803,0.44274722756456997],
[229.06678470557532,95.28006041604868,2.55331102143565,-0.8318954847265777,0.5549323404628101],
[233.3396622440639,92.05884750489729,2.4451653758897125,-0.7671389119358206,0.6414810128085828],
[237.17258167745595,88.60935410590037,2.379971192404573,-0.7237179990013239,0.6900958324185995],
[241.19424041490413,84.55163181620915,2.3247478840406894,-0.6845247411291424,0.7289896287205193],
[245.5132110184055,79.70498279748242,2.269524575676806,-0.6432444776300856,0.7656608531186626],
[250.0136413321081,73.96255191768898,2.195126507464353,-0.5845539429530155,0.8113548470170636],
[253.6580949796785,68.45733107713443,2.1145925161003567,-0.5173883037399293,0.8557507482632537],
[257.2226614852743,61.71487432942695,1.9918740530695054,-0.40874427600548163,0.9126489559697938],
[259.82658084400964,54.65867280286955,1.8599517053113406,-0.2851427698402493,0.958485055077976],
[261.3726959103488,47.90756707707653,1.7264953767652893,-0.15507073094570062,0.9879033699729778],
[261.93600034152485,41.30032344485419,1.5930390482192387,-0.02224088741402524,0.9997526408702488],
[261.826655860509,35.870805882467906,1.5079031144915853,0.06285175756416142,0.9980228737714862],
[261.41971890477265,31.05800393688879,1.4718545659762727,0.09878040854979966,0.9951092557537261],
[261.03939991548407,27.35996101820712,1.468019614006559,0.10259586902243606,0.9947231211043258],
[260.5756688265862,22.85463551729612,1.4664856332186733,0.10412163387205428,0.9945645707342555],
];

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

    setTestPath(key)
    {
        if(!key) key = "AUTONOMOUS";
        this.poseLists[key] = s_testPath;
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
