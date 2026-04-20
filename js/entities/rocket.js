// ============================================================================
// Rocket — the player ship (or, in multiplayer, any player's ship)
// ----------------------------------------------------------------------------
// State: position, velocity, heading, fuel, max-altitude score, and which body
// (if any) it's currently landed on.
//
// Physics per step():
//   - If landed: refuel near base; if thrust pressed, kick off radially.
//   - If flying: rotate, thrust, sum gravity from every body, integrate,
//                then check collision against every body.
//
// Multiplayer / replay readiness:
//   step() takes a command object as an argument — it never reads input directly.
//   To drive a remote player, construct a Rocket and feed it commands from a
//   network packet. DT is fixed, so replays stay deterministic.
//
// Adding new behavior:
//   - Boost pickup? Add fuel in _stepFlight() on entering a special zone.
//   - Shield? Track a hitpoints field and test it before 'crash' in collision.
//   - Trails? Emit a particle entity each frame (separate system).
// ============================================================================

import {
  THRUST, ROT_SPD, DT,
  LAND_SPD, SPEED_OF_LIGHT, BASE_SPAWN_PX,
  ROCKET_NOSE_PX, ROCKET_TAIL_PX, ROCKET_HALFWIDTH_PX,
} from '../config.js';
import { getBaseScale } from '../camera.js';

// Shortest distance from point (px,py) to segment (ax,ay)-(bx,by).
function distPointSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  const t  = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export class Rocket {
  /** @param {CelestialBody} homeBody  where this rocket's altitude is measured from */
  constructor(homeBody) {
    this.homeBody = homeBody;
    this.reset();
  }

  /** Reset to the launch-pad state above home body. */
  reset() {
    // Spawn 10 km above the home body's surface along its "base" direction
    // (falls back to north if no base). The first collision check will land
    // the rocket cleanly on the pad.
    const nx = this.homeBody.base?.localNx ?? 0;
    const ny = this.homeBody.base?.localNy ?? -1;
    this.x  = this.homeBody.x + nx * (this.homeBody.radius + 10);
    this.y  = this.homeBody.y + ny * (this.homeBody.radius + 10);
    this.vx = 0; this.vy = 0;

    this.angle      = 0;
    this.fire       = false;
    this.brake      = false;
    this.hyperdrive = false;
    // Pre-hyperdrive velocity, restored on release
    this._preHyperVx    = 0;
    this._preHyperVy    = 0;
    this._wasHyperdrive = false;
    this.maxAlt   = 0;
    this.landedOn = null;     // CelestialBody | null
  }

  /**
   * Advance one physics step.
   * @param cmd       {left, right, thrust, brake, hyperdrive}
   * @param bodies    Array<CelestialBody> — gravity sources & collision targets
   * @param timeSpeed Simulation multiplier (main.js runs this many sub-steps per
   *                  render frame). Rotation is divided by it so steering stays
   *                  responsive at 1× feel even at 100× time.
   * @returns {null|'crash'|{type:'land', body:CelestialBody}}
   */
  step(cmd, bodies, timeSpeed = 1) {
    if (this.landedOn) { this._stepLanded(cmd); return null; }
    return this._stepFlight(cmd, bodies, timeSpeed);
  }

  // ── Landed sub-step ──────────────────────────────────────────────────────
  _stepLanded(cmd) {
    // Takeoff: small radial kick outward (thrust or hyperdrive both launch)
    if (cmd.thrust || cmd.hyperdrive) {
      const body = this.landedOn;
      const dx = this.x - body.x, dy = this.y - body.y;
      const d  = Math.hypot(dx, dy);
      this.vx = (dx / d) * 2;
      this.vy = (dy / d) * 2;
      this.landedOn = null;
    }
  }

  // ── Flight sub-step ──────────────────────────────────────────────────────
  _stepFlight(cmd, bodies, timeSpeed = 1) {
    // Rotation — divided by timeSpeed so the per-render-frame turn rate is
    // constant regardless of simulation speed. At 100× the ship would spin
    // wildly if each sub-step added the full ROT_SPD.
    const rotSpd = ROT_SPD / timeSpeed;
    if (cmd.left)  this.angle -= rotSpd;
    if (cmd.right) this.angle += rotSpd;

    // Thrust along current heading
    this.fire = !!cmd.thrust;
    if (this.fire) {
      const rad = (this.angle - 90) * Math.PI / 180;
      this.vx += Math.cos(rad) * THRUST * DT;
      this.vy += Math.sin(rad) * THRUST * DT;
    }

    // Brake: same magnitude as thrust, but in the opposite direction (nose-first retro).
    this.brake = !!cmd.brake;
    if (this.brake) {
      const rad = (this.angle - 90) * Math.PI / 180;
      this.vx -= Math.cos(rad) * THRUST * DT;
      this.vy -= Math.sin(rad) * THRUST * DT;
    }

    // Gravity: sum -G·M/r² * r̂ from every body
    for (const b of bodies) {
      const dx = this.x - b.x, dy = this.y - b.y;
      const r2 = dx * dx + dy * dy;
      const r  = Math.sqrt(r2);
      const a  = b.gm / r2;
      this.vx -= (dx / r) * a * DT;
      this.vy -= (dy / r) * a * DT;
    }

    // Hyperdrive: while held, velocity = c along current heading.
    // Save velocity on press-transition, restore it on release.
    this.hyperdrive = !!cmd.hyperdrive;
    if (this.hyperdrive && !this._wasHyperdrive) {
      this._preHyperVx = this.vx;
      this._preHyperVy = this.vy;
    }
    if (this.hyperdrive) {
      const rad = (this.angle - 90) * Math.PI / 180;
      this.vx = Math.cos(rad) * SPEED_OF_LIGHT;
      this.vy = Math.sin(rad) * SPEED_OF_LIGHT;
    } else if (this._wasHyperdrive) {
      this.vx = this._preHyperVx;
      this.vy = this._preHyperVy;
    }
    this._wasHyperdrive = this.hyperdrive;

    // Cap velocity magnitude at the speed of light
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > SPEED_OF_LIGHT) {
      this.vx = (this.vx / speed) * SPEED_OF_LIGHT;
      this.vy = (this.vy / speed) * SPEED_OF_LIGHT;
    }

    // Integrate
    this.x += this.vx * DT;
    this.y += this.vy * DT;

    // Score: highest altitude achieved above the home body
    const homeDist = Math.hypot(this.x - this.homeBody.x, this.y - this.homeBody.y);
    this.maxAlt = Math.max(this.maxAlt, homeDist - this.homeBody.radius);

    // Collision — treat rocket as a capsule (nose→tail segment + body half-width).
    // First body hit wins.
    const { nx1, ny1, nx2, ny2 } = this._endpoints();
    const halfWidthKm = ROCKET_HALFWIDTH_PX / getBaseScale();
    for (const b of bodies) {
      const d = distPointSegment(b.x, b.y, nx1, ny1, nx2, ny2);
      if (d < b.radius + halfWidthKm) {
        if (Math.hypot(this.vx, this.vy) > LAND_SPD) return 'crash';
        if (!b.nearBaseFrom(this.x, this.y))          return 'crash';
        this._landOn(b);
        return { type: 'land', body: b };
      }
    }
    return null;
  }

  /**
   * Nose and tail endpoints in world km, based on current angle + viewport scale.
   * Rotation matches thrust math in _stepFlight: local -y (nose) direction in
   * world space is (cos(angle-90), sin(angle-90)).
   */
  _endpoints() {
    const s = getBaseScale();
    const noseKm = ROCKET_NOSE_PX / s;
    const tailKm = ROCKET_TAIL_PX / s;
    const rad = (this.angle - 90) * Math.PI / 180;
    const ux  = Math.cos(rad), uy = Math.sin(rad);
    return {
      nx1: this.x + ux * noseKm, ny1: this.y + uy * noseKm,
      nx2: this.x - ux * tailKm, ny2: this.y - uy * tailKm,
    };
  }

  /**
   * Snap the rocket to the surface of `body`, pointing outward, velocity zero.
   *
   * Note: the spawn-height conversion uses screen scale (pixels → km) to match
   * the legacy behavior where the rocket sits visually on the pad regardless of
   * canvas size. This ties physics to viewport, so for deterministic multiplayer
   * replace BASE_SPAWN_PX with a fixed km value.
   */
  _landOn(body) {
    const dx = this.x - body.x, dy = this.y - body.y;
    const d  = Math.hypot(dx, dy);
    const nx = dx / d, ny = dy / d;

    const s      = getBaseScale();
    const baseKm = BASE_SPAWN_PX  / s;
    const tailKm = ROCKET_TAIL_PX / s;
    // Tail sits at body.radius + baseKm; center is one tail-length further out.
    this.x = body.x + nx * (body.radius + baseKm + tailKm);
    this.y = body.y + ny * (body.radius + baseKm + tailKm);
    this.vx = 0; this.vy = 0;
    this.fire = false;
    // Face outward: local "up" (-y) of the sprite aligns with the outward normal
    this.angle = Math.atan2(ny, nx) * 180 / Math.PI + 90;
    this.landedOn = body;
  }
}
