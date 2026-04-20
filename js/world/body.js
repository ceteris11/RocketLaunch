// ============================================================================
// CelestialBody — planets, moons, suns
// ----------------------------------------------------------------------------
// A single class represents anything the rocket can orbit, land on, or collide
// with. Each body:
//   - Has a mass (via `gm`, the standard gravitational parameter)
//   - Has a radius (for collision + rendering)
//   - May have a parent (for orbital motion)
//   - May have a base (a landing pad fixed to the surface)
//
// Motion model:
//   Each frame, main.js calls updateOrbit(gameTime) on every body. If the body
//   has a parent and a non-zero orbitAngularVel, it moves on a circular orbit.
//   Nested orbits work by ordering BODIES so parents are updated before
//   children (see world/bodies.js).
//
// Extending:
//   - A planet with its own moons: give the moons `parent: thatPlanet` and
//     ensure the planet appears earlier in BODIES than its moons.
//   - Elliptical orbits: add eccentricity fields here and swap the circular
//     position formula in updateOrbit() for a Kepler solver.
//   - A sun at the origin: instantiate with parent = null and a huge gm.
// ============================================================================

import { BASE_PROXIMITY } from '../config.js';

export class CelestialBody {
  /**
   * @param {object} opts
   * @param {string} opts.name            Short identifier ('earth', 'mars', ...)
   * @param {string} [opts.displayName]   UI label (defaults to name)
   * @param {string} [opts.indicatorColor] Off-screen pointer arrow color
   * @param {number} opts.radius          Body radius [km]
   * @param {number} opts.gm              Gravitational parameter [km³/s²]
   * @param {string} opts.renderStyle     Key into render/bodies.js STYLE_MAP
   * @param {number} [opts.x]             Initial world x (overridden if orbiting)
   * @param {number} [opts.y]             Initial world y (overridden if orbiting)
   * @param {CelestialBody} [opts.parent] Parent for orbital motion (null = fixed)
   * @param {number} [opts.orbitRadius]   Orbit radius around parent [km]
   * @param {number} [opts.orbitAngularVel] Angular velocity [rad/s] (0 = locked)
   * @param {number} [opts.orbitPhase]    Starting orbital phase [rad]
   * @param {object} [opts.base]          { localNx, localNy, color } or null
   */
  constructor({
    name, displayName, indicatorColor = '#ccc',
    x = 0, y = 0,
    radius, gm, renderStyle,
    parent = null,
    orbitRadius = 0,
    orbitAngularVel = 0,
    orbitPhase = 0,
    base = null,
  }) {
    this.name        = name;
    this.displayName = displayName || name;
    this.indicatorColor = indicatorColor;

    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;     // world-frame velocity from orbital motion
    this.radius = radius;
    this.gm = gm;
    this.renderStyle = renderStyle;

    this.parent = parent;
    this.orbitRadius     = orbitRadius;
    this.orbitAngularVel = orbitAngularVel;
    this.orbitPhase      = orbitPhase;

    this.base = base;

    // Snap to starting position based on orbit parameters
    this.updateOrbit(0);
  }

  /**
   * Advance the body's position based on elapsed game time.
   * Bodies with no parent (or zero angular velocity) stay put.
   * @param {number} tSec seconds since game start
   */
  updateOrbit(tSec) {
    if (!this.parent) return;
    const a = this.orbitPhase + this.orbitAngularVel * tSec;
    const r = this.orbitRadius;
    const w = this.orbitAngularVel;
    this.x = this.parent.x + Math.cos(a) * r;
    this.y = this.parent.y + Math.sin(a) * r;
    // Tangential world-frame velocity, inherited from parent for nested orbits.
    this.vx = this.parent.vx - Math.sin(a) * w * r;
    this.vy = this.parent.vy + Math.cos(a) * w * r;
  }

  /** World-space position of the landing base, or null if no base. */
  basePos() {
    if (!this.base) return null;
    return [
      this.x + this.base.localNx * this.radius,
      this.y + this.base.localNy * this.radius,
    ];
  }

  /**
   * Is the given world point within ~20° of this body's base direction?
   * Returns false if the body has no base.
   */
  nearBaseFrom(x, y) {
    if (!this.base) return false;
    const dx = x - this.x, dy = y - this.y;
    const d  = Math.hypot(dx, dy);
    if (d === 0) return false;
    const dot = (dx * this.base.localNx + dy * this.base.localNy) / d;
    return dot > BASE_PROXIMITY;
  }
}
