// ============================================================================
// Background: solid sky + tiling star field
// ----------------------------------------------------------------------------
// Stars are generated once inside a single TILE_KM × TILE_KM tile, then that
// tile is drawn in a grid large enough to cover the screen.
//
// The field is stationary during normal flight (so the player never feels a
// jarring scroll from ordinary motion). It only drifts while hyperdrive is
// active, giving slow parallax feedback that you're crossing vast distances.
// The drift speed is a tiny fraction of the rocket velocity — at c the stars
// should slide past, not streak.
// ============================================================================

import { TILE_KM, NUM_STARS, DT } from '../config.js';
import { getScale, getViewMultiplier } from '../camera.js';

// Generated once at module load — stars are deterministic for the session.
const stars = Array.from({ length: NUM_STARS }, () => ({
  tx: Math.random() * TILE_KM,
  ty: Math.random() * TILE_KM,
  r:  Math.random() * 1.6 + 0.3,
  a:  Math.random() * 0.65 + 0.35,
}));

// Persistent drift — only advances while hyperdrive is active.
let starOffsetX = 0, starOffsetY = 0;

// Fraction of rocket velocity applied to the star drift.
// At c (299,792 km/s) and DT ≈ 0.083 s this yields ~50 km/frame, which at
// typical zoom levels reads as a gentle slide rather than a streaking warp.
const STAR_DRIFT_FACTOR = 0.002;

/**
 * @param X          CanvasRenderingContext2D
 * @param canvas     HTMLCanvasElement
 * @param rkt        rocket — uses {hyperdrive, vx, vy} for drift
 * @param timeSpeed  simulation multiplier (matches main.js physics sub-steps)
 */
export function drawBackground(X, canvas, rkt, timeSpeed = 1) {
  // Flat sky
  X.fillStyle = '#00000d';
  X.fillRect(0, 0, canvas.width, canvas.height);

  // Drift only while in hyperdrive; scale with simulation speed so fast-forward
  // mode shows correspondingly faster star motion.
  if (rkt.hyperdrive) {
    starOffsetX += rkt.vx * DT * STAR_DRIFT_FACTOR * timeSpeed;
    starOffsetY += rkt.vy * DT * STAR_DRIFT_FACTOR * timeSpeed;
  }

  // Stars only render at 1× view scale — zoomed-out views hide them so the
  // field doesn't turn into a dense speckle (and the tile loop can't explode).
  if (getViewMultiplier() !== 1) return;

  const s      = getScale();
  const tilePx = TILE_KM * s;

  // Drift's fractional position within the current tile (wraps cleanly)
  const ox = ((starOffsetX % TILE_KM) + TILE_KM) % TILE_KM;
  const oy = ((starOffsetY % TILE_KM) + TILE_KM) % TILE_KM;

  // How many tiles we need to cover the screen (+2 safety margin)
  const cols = Math.ceil(canvas.width  / tilePx) + 2;
  const rows = Math.ceil(canvas.height / tilePx) + 2;

  for (const st of stars) {
    // Base position of this star in the "current" tile, in screen px
    const bx = canvas.width  / 2 + (st.tx - ox) * s;
    const by = canvas.height / 2 + (st.ty - oy) * s;

    // Starting tile index so repeated copies cover the whole viewport
    const i0 = Math.floor(-bx / tilePx);
    const j0 = Math.floor(-by / tilePx);

    for (let i = i0; i <= i0 + cols; i++) {
      for (let j = j0; j <= j0 + rows; j++) {
        const px = bx + i * tilePx;
        const py = by + j * tilePx;
        if (px < -2 || px > canvas.width + 2 || py < -2 || py > canvas.height + 2) continue;
        X.beginPath();
        X.arc(px, py, st.r, 0, Math.PI * 2);
        X.fillStyle = `rgba(255,255,255,${st.a})`;
        X.fill();
      }
    }
  }
}
