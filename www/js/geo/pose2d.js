/* global app */

const kEps = 1E-9;

class Translation2d 
{
    constructor(x, y) 
    {
        this.x = x;
        this.y = y;
    }

    static fromIdentity()
    {
        return new Translation2d(0,0);
    }

    static fromDelta(x0, x1)
    {
        return new Translation2d(x1.x - x0.x, x1.y - x0.y);
    }

    static dot(a, b) 
    {
        return a.x * b.x + a.y * b.y;
    }

    static getAngleBetween(a, b)  // returns Rotation2d
    {
        let cos = this.dot(a, b) / (a.length() * b.length());
        if (Number.isNaN(cos))
            return new Rotation2d(1, 0, false);
        else
            return Rotation2d.fromRadians(
                Math.acos(Math.min(1.0, Math.max(cos, -1.0))));
    }

    static cross(a, b) 
    {
        return a.x * b.y - a.y * b.x;
    }

    static subtract(t2, t1)
    {
        return new Translation2d(t2.x - t1.x, t2.y - t1.y);
    }

    static add(t1, t2)
    {
        return new Translation2d(t2.x + t1.x, t2.y + t1.y);
    }

    length() 
    {
        return Math.hypot(this.x, this.y);
    }

    lengthSq() 
    {
        return this.x * this.x + this.y * this.y;
    }

    translateBy(other)
    {
        return Translation2d.add(this, other);
    }

    rotateBy(rotation) 
    {
        return new Translation2d(this.x * rotation.cos - this.y * rotation.sin, 
                                 this.x * rotation.sin + this.y * rotation.cos);
    }

    direction()
    {
        return new Rotation2d(this.x, this.y, true);
    }

    inverse() 
    {
        return new Translation2d(-this.x, -this.y);
    }

    interpolate(other, x) 
    {
        if (x <= 0) 
            return new Translation2d(this.x, this.y);
        else 
        if (x >= 1) 
            return new Translation2d(other.x, other.y);
        else
            return this.extrapolate(other, x);
    }

    extrapolate(other, pct) 
    {
        return new Translation2d(this.x + pct * (other.x - this.x),
                                 this.y + pct * (other.y - this.y));
    }

    scale(s) 
    {
        return new Translation2d(this.x * s, this.y * s);
    }

    distance(other) 
    {
        return this.inverse().translateBy(other).length();
    }

    equals(other, epsilon)
    {
        if(epsilon == undefined)
            epsilon = kEps;
        if(Math.abs(other.x - this.x) > epsilon) return false;
        if(Math.abs(other.y - this.y) > epsilon) return false;
        return true;
    }

    // place a circle at our location, presumes that ctx has been
    // scaled accordingly
    draw(ctx, color, radius) 
    {
        color = color || "#2CFF2C";
        ctx.beginPath();
        ctx.arc(this.x, this.x, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 0;
        ctx.stroke();
    }
}

class Rotation2d 
{
    constructor(x, y, donormalize) 
    {
        this.cos = x;
        this.sin = y;
        if (donormalize)
            this.normalize();
    }
    
    static fromIdentity()
    {
        return new Rotation2d(1, 0, false);
    }

    static fromRotation2d(rot)
    {
        return new Rotation2d(rot.cos, rot.sin, false);
    }

    static fromRadians(rads) 
    {
        return new Rotation2d(Math.cos(rads), Math.sin(rads), false);
    }

    static fromDegrees(deg) 
    {
        return this.fromRadians(Rotation2d.d2r(deg));
    }

    static d2r(d) 
    {
        return d * (Math.PI / 180);
    }
    
    static r2d(r) 
    {
        return r * (180 / Math.PI);
    }

    normalize()
    {
        let magnitude = Math.hypot(this.cos, this.sin);
        if (magnitude > kEps) 
        {
            this.cos /= magnitude;
            this.sin /= magnitude;
        } 
        else 
        {
            this.sin = 0;
            this.cos = 1;
        }
    }

    tan() 
    {
        if (Math.abs(this.cos) < kEps) 
        {
            if (this.sin >= 0.0)
                return Number.POSITIVE_INFINITY;
            else
                return Number.NEGATIVE_INFINITY;
        }
        return this.sin / this.cos;
    }

    getRadians() 
    {
        return Math.atan2(this.sin, this.cos);
    }

    getDegrees() 
    {
        return Rotation2d.r2d(this.getRadians());
    }

    rotateBy(other) 
    {
        return new Rotation2d(
            this.cos * other.cos - this.sin * other.sin,
            this.cos * other.sin + this.sin * other.cos, true);
    }

    perp()  // ie: normal
    {
        return new Rotation2d(-this.sin, this.cos, false);
    }

    inverse() 
    {
        return new Rotation2d(this.cos, -this.sin, false);
    }

    isParallel(other)
    {
        // angles are the same (hm: we assume normalized)
        if(Math.abs(other.cos - this.cos) > kEps) return false;
        if(Math.abs(other.sin - this.sin) > kEps) return false;
        return true;
    }

    toTranslation()
    {
        return new Translation2d(this.cos, this.sin);
    }

    interpolate(other, x) 
    {
        if (x <= 0) 
            return new Rotation2d(this.cos, this.sin, false);
        else 
        if (x >= 1) 
            return new Rotation2d(other.cos, other.sin, false);
        else
        {
            let dtheta = this.inverse().rotateBy(other).getRadians();
            return this.rotateBy(Rotation2d.fromRadians(dtheta * x));
        }
    }

    distance(other)  // dtheta in radians
    {
        return this.inverse().rotateBy(other).getRadians();
    }
}

class Twist2d
{
    constructor(dx, dy, dtheta)
    {
        this.dx = dx;
        this.dy = dy;
        this.dtheta = dtheta;
    }

    static fromIdentity()
    {
        return Twist2d(0, 0, 0);
    }

    static fromTwist(t)
    {
        return Twist2d(t.dx, t.dy, t.dtheta);
    }

    scaled(scale)
    {
        return new Twist2d(this.dx*scale, this.dy*scale,
                            this.dtheta*scale);
    }

    length()
    {
        if(this.dy == 0) // common case for diff-drive robot
            return Math.abs(this.dx);
        else
            return Math.hypot(this.dx, this.dy);
    }

    curvature()
    {
        if(Math.abs(this.dtheta) < kEps)
            return 0;
        else
            return this.dtheta / this.length(); // length of zero means straight
    }

    // interpolating twist is invalid for common cases, consider
    // using Pose2d.interpolate.

    interpolate(other, pct)
    {
        if(pct <= 0)
            return Twist2d.fromTwist(this);
        else
        if(pct >= 1)
            return Twist2d.fromTwist(other);
        else
        {
            return new Twist2d(
                this.dx + pct(other.dx - this.dx),
                this.dy + pct(other.dy - this.dy),
                this.dtheta + pct(other.dtheta - this.dtheta));
        }
    }
}

class Pose2d 
{
    constructor(translation, rotation, comment)
    {
        this.translation = translation;
        this.rotation = rotation;
        this.comment = comment || "";
    }

    static fromIdentity()
    {
        return new Pose2d(Translation2d.fromIdentity(), 
                          Rotation2d.fromIdentity());
    }

    static fromDelta(p0, p1)
    {
        return new Pose2d(
            Translation2d.fromDelta(p0.translation, p1.translation).rotateBy(p0.rotation.inverse()), 
            p1.rotation.rotateBy(p0.rotation.inverse()));
    }

    static getTwist(p0, p1)
    {
        const xform = Pose2d.fromDelta(p0, p1);
        return Pose2d.log(xform);
    }

    static exp(twist)
    {
        let cosTwist = Math.cos(twist.dtheta);
        let sinTwist = Math.sin(twist.dtheta);
        let s, c;

        if (Math.abs(twist.dtheta) < kEps) 
        {
            s = 1.0 - 1.0 / 6.0 * twist.dtheta * twist.dtheta;
            c = .5 * twist.dtheta;
        } 
        else 
        {
            s = sinTwist / twist.dtheta;
            c = (1.0 - cosTwist) / twist.dtheta;
        }

        return new Pose2d(new Translation2d(twist.dx * s - twist.dy * c, 
                                            twist.dx * c + twist.dy * s),
                          new Rotation2d(cosTwist, sinTwist, false));
    }

    static log(transform) 
    {
        let dtheta = transform.getRotation().getRadians();
        let half_dtheta = 0.5 * dtheta;
        let cos_minus_one = transform.getRotation().cos - 1.0;
        let halftheta_by_tan_of_halfdtheta;
        if (Math.abs(cos_minus_one) < kEps) 
        {
            halftheta_by_tan_of_halfdtheta = 1.0 - 1.0 / 12.0 * dtheta * dtheta;
        } 
        else 
        {
            halftheta_by_tan_of_halfdtheta = -(half_dtheta * transform.getRotation().sin) / cos_minus_one;
        }
        let translation_part = transform.getTranslation()
            .rotateBy(new Rotation2d(halftheta_by_tan_of_halfdtheta, -half_dtheta, false));
        return new Twist2d(translation_part.x, translation_part.y, dtheta);
    }

    getTranslation()
    {
        return this.translation;
    }

    getRotation()
    {
        return this.rotation;
    }

    transformBy(other) 
    {
        return new Pose2d(
            this.translation.translateBy(other.translation.rotateBy(this.rotation)),
            this.rotation.rotateBy(other.rotation));
    }

    inverse() 
    {
        let invRot = this.rotation.inverse();
        return new Pose2d(this.translation.inverse().rotateBy(invRot), invRot);
    }

    perp() 
    {
        return new Pose2d(this.translation, this.rotation.perp());
    }

    isColinear(otherPose)
    {
        // Return true if this pose is (nearly) colinear with the another.
        //  we can compare our heading with than of another pose.
        //  We must also verify that that heading is nearly the same as
        //  the vector between our two positions.
        if(!this.rotation.isParallel(otherPose.rotation))
            return false;
        const twist = Pose2d.log(this.inverse().transformBy(otherPose));
        return (Math.abs(twist.dy) < kEps) && (Math.abs(twist.dtheta)< kEps);
    }

    intersection(otherPose)
    {
        app.warning("pose2d intersection isn't implemented"); 
        // used by pure-pursuit
    }

    interpolate(other, x) 
    {
        if (x <= 0) 
        {
            return new Pose2d(this.translation, this.rotation, this.comment);
        } 
        else 
        if (x >= 1) 
        {
            return new Pose2d(other.translation, other.rotation, other.comment);
        }
        else
        {
            let twist = Pose2d.log(this.inverse().transformBy(other));
            return this.transformBy(Pose2d.exp(twist.scaled(x)));
        }
    }

    distance(other) 
    {
        return Pose2d.log(this.inverse().transformBy(other)).perp();
    }

    heading(other) 
    {
        return Math.atan2(this.translation.y - other.translation.y, 
                          this.translation.x - other.translation.x);
    }

    draw(ctx, drawHeading, radius) 
    {
        this.translation.draw(null, radius);
        if (drawHeading)
        {
            let x = this.translation.x;
            let y = this.translation.x;
            let len = 25;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + len * this.rotation.cos, 
                       y + len * this.rotation.sin);
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
        }
    }

    toString() 
    {
        return "new Pose2d(" +
            "new Translation2d(" + 
                this.translation.x + ", " + this.translation.y + 
                "), " +
            "new Rotation2d(" + 
                this.rotation.cos + ", " + this.rotation.sin + ", " + 
                this.rotation.normalize + "))";
    }

    transform(other) 
    {
        other.position.rotate(this.rotation);
        this.translation.translate(other.translation);
        this.rotation.rotate(other.rotation);
    }
}

if(window.geo == undefined)
    window.geo = {};

window.geo.Pose2d = Pose2d;
window.geo.Translation2d = Translation2d;
window.geo.Rotation2d = Rotation2d;
window.geo.Twist2d = Twist2d;
