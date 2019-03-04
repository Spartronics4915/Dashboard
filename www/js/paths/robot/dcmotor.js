
let kEpsilon = 1e-9;
export class DCMotorTransmission
{
    constructor(constants)
    {
        this.frictionV = constants.Ks;
        this.speedPerV = constants.Kv;
        this.torquePerV = constants.Ka;
    }

    freeSpeedAtVolts(V)
    {
        if(V > kEpsilon)
            return Math.max(0, (V - this.frictionV)*this.speedPerV);
        else
        if(V < -kEpsilon)
            return Math.min(0, (V + this.frictionV)*this.speedPerV);
        else
            return 0;
    }

    getTorqueForVolts(currentSpeed, V)
    {
        let effectiveV = V;
        if(currentSpeed > kEpsilon) // fwd motion, rolling friction
            effectiveV -= this.frictionV;
        else
        if(currentSpeed < -kEpsilon) // rev motion, rolling friction
            effectiveV += this.frictionV;
        else
        if(V > kEpsilon) // static, fwd torque
            effectiveV = Math.max(0.0, V - this.frictionV);
        else
        if(V < -kEpsilon) // static, rev torque
            effectiveV = Math.min(0.0, V + this.frictionV);
        else
            return 0; // Idle
        return this.torquePerV * (effectiveV - currentSpeed/this.speedPerV);
    }

    getVoltsForTorque(currentSpeed, torque)
    {
        let frictionV;
        if(currentSpeed > kEpsilon)
            frictionV = this.frictionV;
        else
        if(currentSpeed < -kEpsilon)
            frictionV = -this.frictionV;
        else
        if(torque > kEpsilon)
            frictionV = this.frictionV;
        else
        if(torque < -kEpsilon)
            frictionV = -this.frictionV;
        else
            return 0;
        return (torque/this.torquePerV) + currentSpeed/this.speedPerV + frictionV;
    }
}

export default DCMotorTransmission;