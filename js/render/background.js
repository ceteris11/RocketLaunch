// ============================================================================
// Background: solid sky + tiling star field
// ----------------------------------------------------------------------------
// Stars are generated once inside a single TILE_KM × TILE_KM tile, then that
// tile is drawn in a grid large enough to cover the screen. As the camera
// moves, the tile grid scrolls, giving the illusion of a huge star field at
// a tiny memory cost.
//
// To add depth (parallax): render a second tile at a fraction of the camera
// offset, or introduce near/far tiers each with its own scroll speed.
// ============================================================================

import { TILE_KM, NUM_STARS } from '../config.js';
import { getScale } from '../camera.js';

// Generated once at module load — stars are deterministic for the session.
const stars = Array.from({ length: NUM_STARS }, () => ({
  tx: Math.random() * TILE_KM,
  ty: Math.random() * TILE_KM,
  r:  Math.random() * 1.6 + 0.3,
  a:  Math.random() * 0.65 + 0.35,
}));

/**
 * @param X       CanvasRenderingContext2D
 * @param canvas  HTMLCanvasElement
 * @param cam     anything with {x, y} — the camera target's world position
 */
export function drawBackground(X, canvas, cam) {
  // Flat sky
  X.fillStyle = '#00000d';
  X.fillRect(0, 0, canvas.width, canvas.height);

  const s      = getScale();
  const tilePx = TILE_KM * s;

  // Camera's fractional position within the current tile
  const ox = ((cam.x % TILE_KM) + TILE_KM) % TILE_KM;
  const oy = ((cam.y % TILE_KM) + TILE_KM) % TILE_KM;

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
