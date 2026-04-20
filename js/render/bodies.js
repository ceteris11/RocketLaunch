// ============================================================================
// Rendering for celestial bodies and their landing bases
// ----------------------------------------------------------------------------
// Each body has a `renderStyle` string that keys into STYLE_MAP. Add a new
// planet look by writing a draw function and registering it here — no
// changes needed in the body, physics, or main loop.
//
// Style functions receive (ctx, body, canvas). Culling (skipping off-screen
// bodies) is the style's responsibility because different looks have
// different reach (e.g. Earth's atmosphere halo extends past the body radius).
// ============================================================================

import { w2s, getScale } from '../camera.js';

// ── Earth: blue ocean + soft atmosphere + ellipse continents ──────────────
function drawEarth(X, body /* , canvas */) {
  const s = getScale();
  const [ex, ey] = w2s(body.x, body.y);
  const er = body.radius * s;

  // Atmosphere halo
  if (er > 1) {
    const atm = X.createRadialGradient(ex, ey, er * 0.87, ex, ey, er * 1.42);
    atm.addColorStop(0,    'rgba(80,170,255,.22)');
    atm.addColorStop(0.55, 'rgba(20,60,200,.07)');
    atm.addColorStop(1,    'transparent');
    X.beginPath(); X.arc(ex, ey, er * 1.42, 0, Math.PI * 2);
    X.fillStyle = atm; X.fill();
  }

  // Body (ocean gradient)
  const o = X.createRadialGradient(ex - er * 0.28, ey - er * 0.28, 0, ex, ey, er);
  o.addColorStop(0,    '#5ab4ff');
  o.addColorStop(0.45, '#1e62b5');
  o.addColorStop(1,    '#0a2d5e');
  X.beginPath(); X.arc(ex, ey, Math.max(er, 2), 0, Math.PI * 2);
  X.fillStyle = o; X.fill();

  // Continents — only when the planet is big enough on screen to matter
  if (er > 12) {
    X.save();
    X.beginPath(); X.arc(ex, ey, er, 0, Math.PI * 2); X.clip();
    X.fillStyle = 'rgba(60,165,60,.65)';
    const shapes = [
      [-0.22, -0.35, 0.24, 0.30,  0.5],
      [ 0.14,  0.10, 0.28, 0.20,  0.3],
      [-0.40,  0.22, 0.16, 0.11,  0.4],
      [ 0.38, -0.16, 0.19, 0.14, -0.3],
      [ 0.05, -0.56, 0.13, 0.08,  0.2],
    ];
    for (const [cx, cy, rx, ry, rot] of shapes) {
      X.beginPath();
      X.ellipse(ex + cx * er, ey + cy * er, rx * er, ry * er, rot, 0, Math.PI * 2);
      X.fill();
    }
    X.restore();
  }
}

// ── Moon: grey radial gradient (cratered look could be added with clips) ──
function drawMoon(X, body, canvas) {
  const s = getScale();
  const [mx, my] = w2s(body.x, body.y);
  const mr = Math.max(body.radius * s, 2);

  // Cull if fully off-screen
  if (mx < -mr - 50 || mx > canvas.width + mr + 50) return;
  if (my < -mr - 50 || my > canvas.height + mr + 50) return;

  const g = X.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);
  g.addColorStop(0,   '#e8e8e8');
  g.addColorStop(0.6, '#b0b0b0');
  g.addColorStop(1,   '#606060');
  X.beginPath(); X.arc(mx, my, mr, 0, Math.PI * 2);
  X.fillStyle = g; X.fill();
}

// ── Style registry — add new planet looks here ─────────────────────────────
const STYLE_MAP = {
  earth: drawEarth,
  moon:  drawMoon,
  // mars: drawMars,  ← example: write drawMars() above and enable here
};

// ── Public API ─────────────────────────────────────────────────────────────

export function drawBodies(X, canvas, bodies) {
  for (const b of bodies) {
    const fn = STYLE_MAP[b.renderStyle];
    if (fn) fn(X, b, canvas);
  }
}

export function drawBases(X, canvas, bodies) {
  for (const b of bodies) {
    if (b.base) drawBase(X, canvas, b);
  }
}

/**
 * Draw a small landing pad stuck to `body`'s surface along its base normal.
 * Pad geometry is in screen pixels (it does not scale with the camera), so it
 * reads identically whether the body is zoomed in or out.
 */
function drawBase(X, canvas, body) {
  const [wx, wy] = body.basePos();
  const [sx, sy] = w2s(wx, wy);

  // Rough off-screen cull (base is small, skip strict checks)
  if (Math.abs(sx - canvas.width  / 2) > canvas.width  + 60) return;
  if (Math.abs(sy - canvas.height / 2) > canvas.height + 60) return;

  // Rotate so the pad sits tangent to the surface: local -y = away from planet
  const angle = Math.atan2(body.base.localNx, -body.base.localNy);
  X.save();
  X.translate(sx, sy);
  X.rotate(angle);

  // Pole — fits between fin roots at ±7px
  X.fillStyle = '#555'; X.fillRect(-2, -16, 4, 16);
  // Cap at rocket-engine height, 14px wide = rocket body width
  X.fillStyle = '#666'; X.fillRect(-7, -18, 14, 2);
  // Accent stripe (body-specific color)
  X.fillStyle = body.base.color; X.fillRect(-7, -19, 14, 1);
  // Beacon lights
  X.fillStyle = '#ff0';
  X.beginPath(); X.arc(-10, -17, 2.5, 0, Math.PI * 2); X.fill();
  X.beginPath(); X.arc( 10, -17, 2.5, 0, Math.PI * 2); X.fill();
  // Label
  X.fillStyle = '#fff';
  X.font = 'bold 9px monospace';
  X.textAlign = 'center';
  X.fillText('기지', 0, -26);

  X.restore();
}
