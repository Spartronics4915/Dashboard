import {Units} from "../geo/units.js";
import {DCMotorTransmission} from "./dcmotor.js";

function epsilonEquals(a,b,eps=1e-9)
{
    return Math.abs(a-b) < eps;
}

// ChassisState describes motion of Chassis and can be
// used to represent velocity or acceleration based on
// its context.
export class ChassisState
{
    constructor(usage)
    {
        this.usage = usage;
        this.zero();
    }

    zero()
    {
        this.linear =  0;
        this.angular = 0;
    }
}

// WheelState can refer to vel, accel, torque, voltage, depends
// on context/usage.
export class WheelState
{
    constructor(usage)
    {
        this.usage = usage;
        this.zero();
    }

    zero()
    {
        this.left = 0;
        this.right = 0;
    }
}

export class DriveDynamics
{
    constructor()
    {
        this.curvature = 0.0; // 1/m
        this.dcurvature = 0;  // 1/m/m
        this.chassisVel = new ChassisState("velocity");
        this.chassisAccel = new ChassisState("acceleration");
        this.wheelVel = new WheelState("velocity");
        this.wheelAccel = new WheelState("acceleration");
        this.wheelVolts = new WheelState("voltage");
        this.wheelTorque = new WheelState("torque");
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
        this.effWheelbaseRad = .5 * constants.drive.WheelBase *
                                        constants.drive.TrackScrubFactor;
        
        this.leftTrans = leftTransmission;
        this.rightTrans = rightTransmission;
    }

    // solveForwardKinematics returns ChassisState
    //  input wheelMotion is either velocity or accel
    solveForwardKinematics(wheelState)
    {
        let chassisState = new ChassisState(wheelState.usage);
        chassisState.linear = this.wheelRadius * 
                                (wheelState.right+wheelState.left)/2;
        chassisState.angular = this.wheelRadius * 
                                (wheelState.right-wheelState.left)/
                                (2 * this.effWheelbaseRad);
        return chassisState;
    }

    // solveInverseKinematics returns WheelState
    //  input chassisState is either velocity or accel
    solveInverseKinematics(chassisState)
    {
        let wheelState = new WheelState(chassisState.usage);
        wheelState.left = (chassisState.linear - 
                    this.effWheelbaseRad*chassisState.angular)/
                    this.wheelRadius;
        wheelState.right = (chassisState.linear + 
                    this.effWheelbaseRad*chassisState.angular)/
                    this.wheelRadius;
        return wheelState;
    }

    // solve for torque and acceleration
    // returns DriveDynamics
    solveFwdDynamicsFromChassis(chassisVel, wheelVolts)
    {
        let dynamics = new DriveDynamics();
        dynamics.wheelVel = this.solveInverseKinematics(chassisVel);
        dynamics.chassisVel = chassisVel;
        dynamics.curvature = chassisVel.angular / chassisVel.linear;
        if(!Number.isFinite(dynamics.curvature))
            dynamics.curvature = 0;
        dynamics.wheelVolts = wheelVolts;
        this.solveFwd(dynamics);
        return dynamics;
    }

    solveFwdDynamicsFromWheels(wheelVel, wheelVolts)
    {
        let dynamics = new DriveDynamics();
        dynamics.wheelVel = wheelVel;
        dynamics.chassisVel = this.solveForwardKinematics(wheelVel);
        dynamics.curvature = dynamics.chassisVel.angular / 
                             dynamics.chassisVel.linear;
        if(!Number.isFinite(dynamics.curvature))
            dynamics.curvature = 0.0;
        dynamics.wheelVolts = wheelVolts;
        this.solveFwd(dynamics);
        return dynamics;
    }

    solveFwd(dynamics)
    {
        let d =dynamics;
        const leftStationary = epsilonEquals(d.wheelVel.left, 0.0) && 
                Math.abs(d.wheelVolts.left) < d.leftTrans.frictionV;
        const rightStationary = epsilonEquals(d.wheelVel.right, 0.0) && 
                Math.abs(d.wheelVolts.right) < d.rightTrans.frictionV;
        if (leftStationary && rightStationary)
        {
            // Neither side breaks static friction, so we remain stationary.
            d.wheelTorque.zero();
            d.chassisAccel.zero();
            d.wheelAccel.zero();
            d.dcurvature = 0.0;
        }
        else
        {
            d.wheelTorque.left = this.leftTrans.getTorqueForVolts(
                                            d.wheelVel.left, 
                                            d.wheelVolts.left);
            d.wheelTorque.right = this.rightTrans.getTorqueForVolts(
                                            d.wheelVel.right, 
                                            d.wheelVolts.right);
    
            // Add forces and torques about the center of mass.
            d.chassisAccel.linear = (d.wheelTorque.right+d.wheelTorque.left) / 
                                           (this.wheelRadius * this.mass);

            // (Tr - Tl) / r_w * r_wb - drag * w = I * angular_accel
            d.chassisAccel.angular = this.effWheelbaseRad * 
              (d.wheelTorque.right - d.wheelTorque.left)/
                                                (this.wheelRadius*this.moi)
              - d.chassisVel.angular*this.angularDrag / this.moi;
    
            // Solve for change in curvature from angular acceleration.
            // total angular accel = linear_accel * curvature + v^2 * dcurvature
            d.dcurvature = 
                (d.chassisAccel.angular-d.chassisAccel.linear*dynamics.curvature) /
                    (d.chassisVel.linear * d.chassisVel.linear);
            if(!Number.isFinite(d.dcurvature))
                d.dcurvature = 0.0;
    
            // Resolve chassis accelerations to each wheel.
            d.wheelAccel.left = d.chassisAccel.linear - 
                        d.chassisAccel.angular * this.effWheelbaseRad;
            d.wheelAccel.right = d.chassisAccel.linear + 
                        d.chassisAccel.angular * this.effWheelbaseRad;
        }
    }

    // solveInverseDynamics: produces wheel velocities, torques and voltages,
    // given a chassisVel and chassisAccel
    solveInverseChassisDynamics(chassisVel, chassisAccel)
    {
        let dynamics = new DriveDynamics();
        dynamics.chassisVel = chassisVel;
        dynamics.curvature = chassisVel.angular / chassisVel.linear;
        if(!Number.isFinite(dynamics.curvature))
            dynamics.curvature = 0;
        dynamics.chassisAccel = chassisAccel;
        dynamics.dcurvature = chassisAccel.angular - 
                                chassisAccel.linear*dynamics.curvature;
        dynamics.dcurvature /= (chassisVel.linear * chassisVel.linear);
        if(!Number.isFinite(dynamics.dcurvature))
            dynamics.dcurvature = 0;
        dynamics.wheelVel = this.solveInverseKinematics(chassisVel);
        dynamics.wheelAccel = this.solveInverseKinematics(chassisAccel);
        this.solveInverse(dynamics);
        return dynamics;
    }

    solveInverseWheelDynamics(wheelVel, wheelAccel)
    {
        let dynamics = new DriveDynamics();
        dynamics.wheelVel = wheelVel;
        dynamics.wheelAccel = wheelAccel;
        dynamics.chassisVel = this.solveForwardKinematics(wheelVel);
        dynamics.chassisAccel = this.solveForwardKinematics(wheelAccel);
        dynamics.curvature = dynamics.chassisVel.angular/dynamics.chassisVel.linear;
        if(!Number.isFinite(dynamics.curvature))
            dynamics.curvature = 0;
        dynamics.dcurvature = dynamics.chassisAccel.angular - 
                        dynamics.chassisAccel.linear*dynamics.curvature;
        dynamics.dcurvature /= dynamics.chassisVel.linear*dynamics.chassisVel.linear;
        if(!Number.isFinite(dynamics.dcurvature))
            dynamics.dcurvature = 0;
        this.solveInverse(dynamics);
        return dynamics;
    }

    // Given target wheel accelerations (dynamics) 
    //  determine the necessary torques  and voltages for each wheel
    solveInverse(dynamics)
    {
        let d = dynamics; // shorthand
        // solve for torques
        let linearForce = d.chassisAccel.linear*this.mass;
        let angularForce = d.chassisAccel.angular*this.moi/this.effWheelbaseRad +
                    d.chassisVel.angular*this.angularDrag/this.effWheelbaseRad;
        d.wheelTorque.left = this.wheelRadius / 2*(linearForce - angularForce);
        
        d.wheelTorque.right = this.wheelRadius / 2*(linearForce + angularForce);

        // solve for input voltages
        d.voltage.left = this.leftTrans.getVoltsForTorque(d.wheelVel.left, 
                                                        d.wheelTorque.left);
        d.voltage.right = this.rightTrans.getVoltsForTorque(d.wheelVel.right, 
                                                        d.wheelTorque.right);
    }
}

export default DifferentialDrive;
