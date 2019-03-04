import {Units} from "../geo/units.js";
import {ChassisState} from "./drive.js";

export class TimingConstraint
{
    constructor(maxVelocity, minAccel, maxAccel)
    {
        if(maxVelocity == undefined)
            this.maxVelocity = Number.POSITIVE_INFINITY;
        else
            this.maxVelocity = maxVelocity;
        if(minAccel == undefined)
            this.minAccel = Number.NEGATIVE_INFINITY;
        else
            this.minAccel = minAccel;
        if(maxAccel == undefined)
            this.maxAccel = Number.POSITIVE_INFINITY;
        else
            this.maxAccel = maxAccel;

    }

    getMaxVel(trajectorySample) 
    { 
        return this.maxVelocity;
    }

    getMinMaxAccel(trajectorySample, velocity)
    {
        return [this.minAccel, this.maxAccel];
    }
}

export class CentripetalMax extends TimingConstraint
{
    constructor(maxCentripetalAccel)
    {
        super();
        this.maxCAccel = maxCentripetalAccel;
    }

    getMaxVel(tsamp) 
    { 
        return Math.sqrt(Math.abs(this.maxCAccel / tsamp.curvature));
    }

    // we impose/inherit no limits on minmax accel
}

export class DifferentialDriveDynamics extends TimingConstraint
{
    constructor(drive, maxvoltage)
    {
        super();
        this.drive = drive;
        this.maxVolts = maxvoltage;
    }

    // Curvature is in inverse inches, velocity measured in ips,
    // drive wants SI units.
    getMaxVel(tsamp)
    {
        return Units.metersToInches(
            this.drive.getMaxAbsVel(
                // Curvature is in inverse inches
                Units.inchesToMeters(tsamp.curvature), 
                this.maxVolts));
    }

    getMinMaxAccel(tsamp, velocity)
    {
        let mm = this.drive.getMinMaxAccel(
                    new ChassisState(
                        Units.inchesToMeters(velocity), 
                        tsamp.curvature * velocity /*inverse seconds*/),
                    Units.inchesToMeters(tsamp.curvature), 
                    this.maxVolts);
        return [Units.metersToInches(mm[0]), 
                Units.metersToInches(mm[1])];
    }
}

export default TimingConstraint;

