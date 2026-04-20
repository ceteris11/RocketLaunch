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

// Sun
export const GM_SUN          = 1.32712e11;
export const R_SUN           = 695700;

// Inner planets
export const GM_MERCURY      = 22032;
export const R_MERCURY       = 2440;
export const MERCURY_ORBIT   = 57900000;   // 0.39 AU

export const GM_VENUS        = 324859;
export const R_VENUS         = 6052;
export const VENUS_ORBIT     = 108200000;  // 0.72 AU

export const GM_EARTH        = 398600;
export const R_EARTH         = 6371;
export const EARTH_ORBIT     = 149600000;  // 1.00 AU

export const GM_MOON         = 4902.8;
export const R_MOON          = 1737;
export const MOON_ALTITUDE   = 384400;     // Moon's surface altitude above Earth's surface

export const GM_MARS         = 42828;
export const R_MARS          = 3390;
export const MARS_ORBIT      = 227900000;  // 1.52 AU

// Outer planets
export const GM_JUPITER      = 1.267e8;
export const R_JUPITER       = 69911;
export const JUPITER_ORBIT   = 778600000;  // 5.20 AU

export const GM_SATURN       = 3.793e7;
export const R_SATURN        = 58232;
export const SATURN_ORBIT    = 1433500000; // 9.58 AU

export const GM_URANUS       = 5.794e6;
export const R_URANUS        = 25362;
export const URANUS_ORBIT    = 2872500000; // 19.2 AU

export const GM_NEPTUNE      = 6.837e6;
export const R_NEPTUNE       = 24622;
export const NEPTUNE_ORBIT   = 4495100000; // 30.1 AU

export const GM_PLUTO        = 869;
export const R_PLUTO         = 1188;
export const PLUTO_ORBIT     = 5906400000; // 39.5 AU

// ── Game tuning (not physically accurate — tuned for feel) ────────────────

export const THRUST   = 100.0;     // rocket thrust acceleration [km/s²]
export const ROT_SPD  = 3;         // rocket rotation rate [deg per frame]
export const DT       = 5 / 60;    // physics timestep per frame (~5× real time)
export const LAND_SPD = 300;       // max touchdown speed before it counts as a crash [km/s]

// Universal speed cap (km/s). Hyperdrive forces |v| = SPEED_OF_LIGHT while held,
// and |v| is clamped to this value every frame regardless of thrust/gravity.
export const SPEED_OF_LIGHT = 299792.458;

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
