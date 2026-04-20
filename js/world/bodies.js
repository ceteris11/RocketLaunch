// ============================================================================
// bodies.js — the solar system (the specific bodies in this game)
// ----------------------------------------------------------------------------
// All celestial-body instances live here. Everything else iterates the exported
// BODIES array for gravity, collision, rendering, and indicators — no code
// anywhere else should reference Earth/Moon/etc. by name.
//
// ── Adding a planet ─────────────────────────────────────────────────────────
//   1. Add its GM / radius / orbital distance to config.js
//   2. Instantiate a CelestialBody below (usually with EARTH as parent, or
//      with parent = null for a sun at the origin)
//   3. Append to the BODIES array
//   4. Register the renderStyle key in render/bodies.js STYLE_MAP
//
// ── Orbital motion ──────────────────────────────────────────────────────────
//   - Currently every body has orbitAngularVel = 0 (locked positions), so the
//     world matches the original game exactly. Flip any to non-zero and the
//     body will orbit. For real-time-ish Moon orbit: 2*Math.PI / (27.3*86400).
//   - For nested orbits (moon-of-planet), list the parent before the child.
//     updateOrbit() relies on the parent's position being current.
// ============================================================================

import { CelestialBody } from './body.js';
import {
  GM_EARTH, R_EARTH,
  GM_MOON,  R_MOON,  MOON_ALTITUDE,
} from '../config.js';

// ── Earth (origin, fixed) ──────────────────────────────────────────────────
export const EARTH = new CelestialBody({
  name: 'earth',
  displayName: '지구',
  indicatorColor: '#4af',
  x: 0, y: 0,
  radius: R_EARTH,
  gm: GM_EARTH,
  renderStyle: 'earth',
  // Base sits on Earth's top (Moon-facing side in the legacy layout)
  base: { localNx: 0, localNy: -1, color: '#4af' },
});

// ── Moon (orbits Earth) ────────────────────────────────────────────────────
// Phase = -π/2 places the Moon directly "above" Earth (y = -orbitRadius),
// matching the original fixed Moon position.
export const MOON = new CelestialBody({
  name: 'moon',
  displayName: '달',
  indicatorColor: '#ccc',
  radius: R_MOON,
  gm: GM_MOON,
  renderStyle: 'moon',
  parent: EARTH,
  orbitRadius: R_EARTH + MOON_ALTITUDE,
  orbitAngularVel: 0,           // TODO: enable real orbit — 2*PI / (27.3*86400)
  orbitPhase: -Math.PI / 2,
  // Base on Earth-facing side of Moon
  base: { localNx: 0, localNy: 1, color: '#fa4' },
});

/**
 * Ordered list of all bodies in the simulation. Iterated by:
 *   - entities/rocket.js  → gravity + collision
 *   - render/bodies.js    → draw bodies + bases
 *   - render/hud.js       → direction indicators
 *   - main.js             → updateOrbit() each frame
 *
 * Order matters for orbital updates: parents must come before children.
 */
export const BODIES = [EARTH, MOON];
