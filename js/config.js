// ============================================================================
// config.js — tunable constants for physics, game feel, and rendering
// ----------------------------------------------------------------------------
// Everything here is a knob. Physical constants are real-world values; game
// tuning constants are intentionally unphysical to make the game feel snappy.
//
// When adding new planets, add their GM/radius here and reference them from
// world/bodies.js — do not hardcode numeric constants in body definitions.
// ============================================================================

// ── Physics: real-world values ─────────────────────────────────────────────
// Units: distances km, time s, gravitational parameter km³/s²

export const GM_EARTH       = 398600;    // Earth's standard gravitational parameter
export const R_EARTH        = 6371;      // Earth radius
export const GM_MOON        = 4902.8;    // Moon's standard gravitational parameter
export const R_MOON         = 1737;      // Moon radius
export const MOON_ALTITUDE  = 384400;    // Moon's surface altitude above Earth's surface

// ── Game tuning (not physically accurate — tuned for feel) ────────────────

export const THRUST   = 20.0;      // rocket thrust acceleration [km/s²]
export const ROT_SPD  = 3;         // rocket rotation rate [deg per frame]
export const DT       = 5 / 60;    // physics timestep per frame (~5× real time)
export const LAND_SPD = 30;        // max touchdown speed before it counts as a crash [km/s]

export const FUEL_INIT   = 100;                             // initial fuel (also the UI maximum)
export const FUEL_DRAIN  = FUEL_INIT / (60 * 60);           // drained per frame while thrusting (~60s full burn)
export const FUEL_REFILL = FUEL_INIT / (5 * 60);            // added per frame at a base (~5s to full)

// ── Rendering / HUD ───────────────────────────────────────────────────────

export const EARTH_SCREEN_RATIO = 0.2;     // Earth radius drawn as this fraction of min(w, h)
export const TILE_KM            = 50000;   // side length of a star tile in world units
export const NUM_STARS          = 300;     // number of stars per tile
export const BASE_PROXIMITY     = 0.94;    // cos(θ) threshold for "near base" (~20° cone)
export const BASE_SPAWN_PX      = 30;      // rocket spawn height above surface in screen pixels
                                           // (converted to km via camera scale — legacy behavior)

// ── Rocket shape (px, must match render/rocket.js sprite) ─────────────────
// Used for capsule-based collision: nose→tail segment + body half-width.
// Fins are cosmetic and excluded from collision.
export const ROCKET_NOSE_PX      = 22;     // center → nose tip
export const ROCKET_TAIL_PX      = 14;     // center → tail midpoint
export const ROCKET_HALFWIDTH_PX = 7;      // body half-width at the tail
