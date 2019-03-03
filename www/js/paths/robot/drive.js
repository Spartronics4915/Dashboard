import {Units} from "../geo/units.js";
import {DCMotorTransmission} from "./dcmotor.js";

export class ChassisState
{
    constructor()
    {
    }
}

export class DifferentialDrive
{
    constructor(constants, leftTransmission, rightTransmission)
    {
        // mass:
        // Equivalent mass when accelerating purely linearly, in kg.
        // This is "equivalent" in that it also absorbs the effects of 
        // drivetrain inertia. Measure by doing drivetrain acceleration 
        // characterization in a straight line.
        this.mass = constants.robot.LinearInertia;

        // moi:
        // Equivalent moment of inertia when accelerating purely angularly, 
        // in kg*m^2. This is "equivalent" in that it also absorbs the effects 
        // of drivetrain inertia. Measure by doing drivetrain acceleration 
        // characterization while turning in place.
        this.moi = constants.robot.AngularInertia;

        // angularDrag:
        // Drag torque (proportional to angular velocity) that resists turning, 
        // in N*m/rad/s. Empirical testing of our drivebase showed that there 
        // was an unexplained loss in torque ~proportional to angular velocity, 
        // likely due to scrub of wheels. NOTE: this may not be a purely linear 
        // term, and we have done limited testing, but this factor helps our 
        // model to better match reality.  For future seasons, we should 
        // investigate what's going on here...
        this.angularDrag = constants.robot.AngularDrag;

        // wheelRadius: measured in meters
        this.wheelRadius = Units.inchesToMeters(constants.drive.WheelRadius);

        // "Effective" kinematic wheelbase radius.  Might be larger than 
        // theoretical to compensate for skid steer.  Measure by turning 
        // the robot in place several times and figuring out what the 
        // equivalent wheelbase radius is.
        this.effectiveWheelbaseRadius = .5 * constants.drive.WheelBase *
                                        constants.drive.TrackScrubFactor;
        
        this.leftTransmission = leftTransmission;
        this.rightTransmission = rightTransmission;
    }

}

export default DifferentialDrive;
