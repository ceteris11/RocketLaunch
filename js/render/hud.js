// ============================================================================
// HUD, overlays, landed banner, and off-screen direction indicators
// ----------------------------------------------------------------------------
// Mixes two rendering channels:
//   - DOM (top-bar HUD cards)  → updated via updateHUD()
//   - Canvas (everything else) → drawn inside the main render pipeline
//
// Kept in one file because all of it is "UI chrome" and shares style choices.
// ============================================================================

import { FUEL_INIT } from '../config.js';
import { w2s } from '../camera.js';

// Cache DOM refs once (they never change)
const scoreEl = document.getElementById('score');
const altEl   = document.getElementById('alt');
const spdEl   = document.getElementById('spd');
const fbarEl  = document.getElementById('fbar');

const fmt = n => Math.floor(n).toLocaleString('ko-KR');

// ── Top-bar HUD (DOM) ──────────────────────────────────────────────────────
/** Update the numeric readouts + fuel bar. Called every frame. */
export function updateHUD(rkt, homeBody) {
  const dist = Math.hypot(rkt.x - homeBody.x, rkt.y - homeBody.y);
  const alt  = Math.max(0, dist - homeBody.radius);
  const spd  = Math.hypot(rkt.vx, rkt.vy);

  scoreEl.textContent = fmt(rkt.maxAlt) + ' km';
  altEl.textContent   = fmt(alt)        + ' km';
  spdEl.textContent   = spd.toFixed(2)  + ' km/s';

  const pct = (rkt.fuel / FUEL_INIT) * 100;
  fbarEl.style.width      = pct + '%';
  fbarEl.style.background = rkt.fuel > 50 ? '#4c4' : rkt.fuel > 20 ? '#fa0' : '#f44';
}

// ── Off-screen direction indicators ────────────────────────────────────────
/**
 * Draw a labelled arrow on the screen edge pointing at (worldX, worldY).
 * Fades when the target is already comfortably on-screen.
 */
export function drawDirIndicator(X, canvas, rkt, worldX, worldY, label, color) {
  const [sx, sy] = w2s(worldX, worldY);
  const cx = canvas.width / 2, cy = canvas.height / 2;

  // Screen-space angle from center toward target
  const angle = Math.atan2(sy - cy, sx - cx);

  // Indicator sits on a ring at 82% of min(halfWidth, halfHeight)
  const R  = Math.min(cx, cy) * 0.82;
  const ax = cx + Math.cos(angle) * R;
  const ay = cy + Math.sin(angle) * R;

  const onScreen = sx > 60 && sx < canvas.width - 60 && sy > 60 && sy < canvas.height - 60;

  const dist = Math.hypot(worldX - rkt.x, worldY - rkt.y);
  const dStr = dist >= 1e6  ? (dist / 1e6).toFixed(1) + 'M km'
             : dist >= 1000 ? Math.round(dist / 1000) + 'k km'
             :                Math.round(dist) + ' km';

  X.save();
  X.globalAlpha = onScreen ? 0.28 : 0.88;

  // Arrow head (a right-pointing triangle rotated to face the target)
  X.save();
  X.translate(ax, ay);
  X.rotate(angle);
  X.fillStyle = color;
  X.beginPath();
  X.moveTo(18, 0); X.lineTo(-3, -9); X.lineTo(-3, 9);
  X.closePath();
  X.fill();
  X.restore();

  // Label above, distance below (unrotated so both stay readable)
  X.fillStyle = color; X.textAlign = 'center';
  X.font = 'bold 11px "Courier New",monospace'; X.fillText(label, ax, ay - 20);
  X.font = '10px "Courier New",monospace';       X.fillText(dStr, ax, ay + 23);

  X.restore();
}

/** Draw an indicator for every body except `skip` (the one the camera tracks). */
export function drawAllDirIndicators(X, canvas, rkt, bodies, skip = null) {
  for (const b of bodies) {
    if (b === skip) continue;
    drawDirIndicator(X, canvas, rkt, b.x, b.y, b.displayName, b.indicatorColor);
  }
}

// ── Centered full-screen overlay (title / crash screen) ────────────────────
export function drawOverlay(X, canvas, t1, t2, t3, hint) {
  X.fillStyle = 'rgba(0,0,12,.65)';
  X.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2, cy = canvas.height / 2;
  X.textAlign = 'center';

  X.font = 'bold 40px "Courier New",monospace'; X.fillStyle = '#fff';
  X.fillText(t1, cx, cy - 75);

  if (t2) { X.font = '21px "Courier New",monospace'; X.fillStyle = '#9df'; X.fillText(t2, cx, cy - 18); }
  if (t3) { X.font = '17px "Courier New",monospace'; X.fillStyle = '#8cf'; X.fillText(t3, cx, cy + 22); }

  // Blinking "press any key" hint
  if (hint && Math.floor(Date.now() / 600) % 2) {
    X.font = 'bold 17px "Courier New",monospace'; X.fillStyle = '#ff0';
    X.fillText(hint, cx, cy + 100);
  }
}

// ── Bottom banner shown while landed (refueling status etc.) ──────────────
export function drawLandedBanner(X, canvas, rkt) {
  if (!rkt.landedOn) return;
  const body      = rkt.landedOn;
  const atBase    = body.nearBaseFrom(rkt.x, rkt.y);
  const refueling = atBase && rkt.fuel < FUEL_INIT;

  const msg =
      refueling            ? '⛽  연료 충전 중...'
    : atBase               ? '✅  기지 — 연료 충전 완료'
    : body.name === 'moon' ? '🌙  달 착륙'
    : body.name === 'earth'? '🌍  지구 착륙'
    :                        `🪐  ${body.displayName} 착륙`;

  X.save();
  X.fillStyle = 'rgba(0,10,30,0.8)';
  X.fillRect(canvas.width / 2 - 210, canvas.height - 82, 420, 58);
  X.textAlign = 'center';
  X.font = 'bold 18px "Courier New",monospace';
  X.fillStyle = refueling ? '#fa0' : '#4f4';
  X.fillText(msg, canvas.width / 2, canvas.height - 52);
  X.font = '12px "Courier New",monospace';
  X.fillStyle = 'rgba(180,210,255,0.7)';
  X.fillText('↑ 키를 눌러 이륙', canvas.width / 2, canvas.height - 32);
  X.restore();
}
