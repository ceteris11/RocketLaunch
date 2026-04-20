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
  FUEL_INIT, FUEL_DRAIN, FUEL_REFILL,
  LAND_SPD, BASE_SPAWN_PX,
} from '../config.js';
import { getScale } from '../camera.js';

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

    this.angle    = 0;
    this.fire     = false;
    this.fuel     = FUEL_INIT;
    this.maxAlt   = 0;
    this.landedOn = null;     // CelestialBody | null
  }

  /**
   * Advance one physics step.
   * @param cmd    {left:bool, right:bool, thrust:bool}
   * @param bodies Array<CelestialBody> — gravity sources & collision targets
   * @returns {null|'crash'|{type:'land', body:CelestialBody}}
   *          An event that just occurred this step (for main.js to react to).
   */
  step(cmd, bodies) {
    if (this.landedOn) { this._stepLanded(cmd); return null; }
    return this._stepFlight(cmd, bodies);
  }

  // ── Landed sub-step ──────────────────────────────────────────────────────
  _stepLanded(cmd) {
    // Refuel only when parked over the base
    if (this.landedOn.nearBaseFrom(this.x, this.y) && this.fuel < FUEL_INIT)
      this.fuel = Math.min(FUEL_INIT, this.fuel + FUEL_REFILL);

    // Takeoff: small radial kick outward
    if (cmd.thrust && this.fuel > 0) {
      const body = this.landedOn;
      const dx = this.x - body.x, dy = this.y - body.y;
      const d  = Math.hypot(dx, dy);
      this.vx = (dx / d) * 2;
      this.vy = (dy / d) * 2;
      this.landedOn = null;
    }
  }

  // ── Flight sub-step ──────────────────────────────────────────────────────
  _stepFlight(cmd, bodies) {
    // Rotation
    if (cmd.left)  this.angle -= ROT_SPD;
    if (cmd.right) this.angle += ROT_SPD;

    // Thrust along current heading
    this.fire = !!cmd.thrust && this.fuel > 0;
    if (this.fire) {
      const rad = (this.angle - 90) * Math.PI / 180;
      this.vx += Math.cos(rad) * THRUST * DT;
      this.vy += Math.sin(rad) * THRUST * DT;
      this.fuel = Math.max(0, this.fuel - FUEL_DRAIN);
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

    // Integrate
    this.x += this.vx * DT;
    this.y += this.vy * DT;

    // Score: highest altitude achieved above the home body
    const homeDist = Math.hypot(this.x - this.homeBody.x, this.y - this.homeBody.y);
    this.maxAlt = Math.max(this.maxAlt, homeDist - this.homeBody.radius);

    // Collision — first body hit wins
    for (const b of bodies) {
      const d = Math.hypot(this.x - b.x, this.y - b.y);
      if (d < b.radius) {
        if (Math.hypot(this.vx, this.vy) > LAND_SPD) return 'crash';
        this._landOn(b);
        return { type: 'land', body: b };
      }
    }
    return null;
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

    const baseKm = BASE_SPAWN_PX / getScale();
    this.x = body.x + nx * (body.radius + baseKm);
    this.y = body.y + ny * (body.radius + baseKm);
    this.vx = 0; this.vy = 0;
    this.fire = false;
    // Face outward: local "up" (-y) of the sprite aligns with the outward normal
    this.angle = Math.atan2(ny, nx) * 180 / Math.PI + 90;
    this.landedOn = body;
  }
}
