// ============================================================================
// bodies.js — the solar system (the specific bodies in this game)
// ----------------------------------------------------------------------------
// All celestial-body instances live here. Everything else iterates the exported
// BODIES array for gravity, collision, rendering, and indicators — no code
// anywhere else should reference Sun/Earth/Moon/etc. by name.
//
// ── Adding a planet ─────────────────────────────────────────────────────────
//   1. Add its GM / radius / orbital distance to config.js
//   2. Instantiate a CelestialBody below (usually with SUN as parent, or
//      with parent = null for a body at the origin)
//   3. Append to the BODIES array (parents must precede children)
//   4. Register the renderStyle key in render/bodies.js STYLE_MAP
//
// ── Orbital motion ──────────────────────────────────────────────────────────
//   - Currently every body has orbitAngularVel = 0 (locked positions). Flip
//     any to non-zero and the body will orbit. Real orbital periods would be
//     too slow for gameplay — use something like 2π / (period_in_sim_seconds).
//   - For nested orbits (moon-of-planet), list the parent before the child.
//     updateOrbit() relies on the parent's position being current.
// ============================================================================

import { CelestialBody } from './body.js';
import {
  GM_SUN,     R_SUN,
  GM_MERCURY, R_MERCURY, MERCURY_ORBIT,
  GM_VENUS,   R_VENUS,   VENUS_ORBIT,
  GM_EARTH,   R_EARTH,   EARTH_ORBIT,
  GM_MOON,    R_MOON,    MOON_ALTITUDE,
  GM_MARS,    R_MARS,    MARS_ORBIT,
  GM_JUPITER, R_JUPITER, JUPITER_ORBIT,
  GM_SATURN,  R_SATURN,  SATURN_ORBIT,
  GM_URANUS,  R_URANUS,  URANUS_ORBIT,
  GM_NEPTUNE, R_NEPTUNE, NEPTUNE_ORBIT,
  GM_PLUTO,   R_PLUTO,   PLUTO_ORBIT,
} from '../config.js';

// ── Orbital velocities ─────────────────────────────────────────────────────
// Real physical orbital periods. Since DT already ticks ~5× real time and time
// speed can multiply that by up to 100, a full Earth orbit still takes many
// real hours even at max fast-forward — but tangential velocities match reality
// (Earth ~29.78 km/s, Moon ~1 km/s, etc.).
const EARTH_PERIOD_SEC = 365.25 * 86400;   // 31,557,600 s — one real Earth year
const MOON_PERIOD_SEC  = 27.32 * 86400;    //  2,360,448 s — one real lunar month
const angVel = (days) => 2 * Math.PI / (EARTH_PERIOD_SEC * days / 365.25);

// ── Sun (origin, fixed) ────────────────────────────────────────────────────
export const SUN = new CelestialBody({
  name: 'sun', displayName: '태양', indicatorColor: '#fc0',
  x: 0, y: 0,
  radius: R_SUN, gm: GM_SUN, renderStyle: 'sun',
});

// ── Inner planets ──────────────────────────────────────────────────────────
export const MERCURY = new CelestialBody({
  name: 'mercury', displayName: '수성', indicatorColor: '#b8a890',
  radius: R_MERCURY, gm: GM_MERCURY, renderStyle: 'mercury',
  parent: SUN, orbitRadius: MERCURY_ORBIT, orbitPhase: 0.4 * Math.PI,
  orbitAngularVel: angVel(88),
});

export const VENUS = new CelestialBody({
  name: 'venus', displayName: '금성', indicatorColor: '#e8c880',
  radius: R_VENUS, gm: GM_VENUS, renderStyle: 'venus',
  parent: SUN, orbitRadius: VENUS_ORBIT, orbitPhase: -0.3 * Math.PI,
  orbitAngularVel: angVel(225),
});

// Earth orbits the Sun. Placed at phase 0 so its world position is
// (EARTH_ORBIT, 0), keeping the gameplay "up is away from Earth" intuition
// aligned with the original layout (Moon above Earth).
export const EARTH = new CelestialBody({
  name: 'earth', displayName: '지구', indicatorColor: '#4af',
  radius: R_EARTH, gm: GM_EARTH, renderStyle: 'earth',
  parent: SUN, orbitRadius: EARTH_ORBIT, orbitPhase: 0,
  orbitAngularVel: angVel(365.25),
});

// Moon orbits Earth; phase = -π/2 places it directly "above" Earth
// (y = earth.y - MOON_ORBIT_RADIUS), matching the legacy layout.
export const MOON = new CelestialBody({
  name: 'moon', displayName: '달', indicatorColor: '#ccc',
  radius: R_MOON, gm: GM_MOON, renderStyle: 'moon',
  parent: EARTH, orbitRadius: R_EARTH + MOON_ALTITUDE, orbitPhase: -Math.PI / 2,
  orbitAngularVel: 2 * Math.PI / MOON_PERIOD_SEC,
});

export const MARS = new CelestialBody({
  name: 'mars', displayName: '화성', indicatorColor: '#e05830',
  radius: R_MARS, gm: GM_MARS, renderStyle: 'mars',
  parent: SUN, orbitRadius: MARS_ORBIT, orbitPhase: 0.6 * Math.PI,
  orbitAngularVel: angVel(687),
});

// ── Outer planets ──────────────────────────────────────────────────────────
export const JUPITER = new CelestialBody({
  name: 'jupiter', displayName: '목성', indicatorColor: '#d8a868',
  radius: R_JUPITER, gm: GM_JUPITER, renderStyle: 'jupiter',
  parent: SUN, orbitRadius: JUPITER_ORBIT, orbitPhase: 1.1 * Math.PI,
  orbitAngularVel: angVel(4333),
});

export const SATURN = new CelestialBody({
  name: 'saturn', displayName: '토성', indicatorColor: '#e8c878',
  radius: R_SATURN, gm: GM_SATURN, renderStyle: 'saturn',
  parent: SUN, orbitRadius: SATURN_ORBIT, orbitPhase: 0.8 * Math.PI,
  orbitAngularVel: angVel(10759),
});

export const URANUS = new CelestialBody({
  name: 'uranus', displayName: '천왕성', indicatorColor: '#a0d0d8',
  radius: R_URANUS, gm: GM_URANUS, renderStyle: 'uranus',
  parent: SUN, orbitRadius: URANUS_ORBIT, orbitPhase: 1.4 * Math.PI,
  orbitAngularVel: angVel(30687),
});

export const NEPTUNE = new CelestialBody({
  name: 'neptune', displayName: '해왕성', indicatorColor: '#5080d0',
  radius: R_NEPTUNE, gm: GM_NEPTUNE, renderStyle: 'neptune',
  parent: SUN, orbitRadius: NEPTUNE_ORBIT, orbitPhase: 0.3 * Math.PI,
  orbitAngularVel: angVel(60190),
});

export const PLUTO = new CelestialBody({
  name: 'pluto', displayName: '명왕성', indicatorColor: '#d8b898',
  radius: R_PLUTO, gm: GM_PLUTO, renderStyle: 'pluto',
  parent: SUN, orbitRadius: PLUTO_ORBIT, orbitPhase: -0.7 * Math.PI,
  orbitAngularVel: angVel(90560),
});

/**
 * Ordered list of all bodies in the simulation. Iterated by:
 *   - entities/rocket.js  → gravity + collision
 *   - render/bodies.js    → draw bodies + bases
 *   - render/hud.js       → direction indicators + minimap
 *   - main.js             → updateOrbit() each frame
 *
 * Order matters for orbital updates: parents must come before children.
 */
export const BODIES = [
  SUN,
  MERCURY, VENUS, EARTH, MOON, MARS,
  JUPITER, SATURN, URANUS, NEPTUNE, PLUTO,
];
