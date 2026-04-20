// ============================================================================
// HUD, overlays, landed banner, and off-screen direction indicators
// ----------------------------------------------------------------------------
// Mixes two rendering channels:
//   - DOM (top-bar HUD cards)  → updated via updateHUD()
//   - Canvas (everything else) → drawn inside the main render pipeline
//
// Kept in one file because all of it is "UI chrome" and shares style choices.
// ============================================================================

import { w2s } from '../camera.js';

// Cache DOM refs once (they never change)
const scoreEl = document.getElementById('score');
const altEl   = document.getElementById('alt');
const spdEl   = document.getElementById('spd');
const miniEl  = document.getElementById('minimap');
const miniCtx = miniEl ? miniEl.getContext('2d') : null;

// Minimap zoom: 1× = full solar system, higher = zoom in on rocket
let miniZoom = 2;
const zoomContainer = document.getElementById('mini-zoom');
if (zoomContainer) {
  zoomContainer.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn || !btn.dataset.zoom) return;
    miniZoom = parseInt(btn.dataset.zoom, 10);
    zoomContainer.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
  });
}

const fmt = n => Math.floor(n).toLocaleString('ko-KR');

// ── Top-bar HUD (DOM) ──────────────────────────────────────────────────────
/** Update the numeric readouts. Called every frame. */
export function updateHUD(rkt, homeBody) {
  const dist = Math.hypot(rkt.x - homeBody.x, rkt.y - homeBody.y);
  const alt  = Math.max(0, dist - homeBody.radius);
  const spd  = Math.hypot(rkt.vx, rkt.vy);

  scoreEl.textContent = fmt(rkt.maxAlt) + ' km';
  altEl.textContent   = fmt(alt)        + ' km';
  spdEl.textContent   = spd.toFixed(2)  + ' km/s';
}

// ── Minimap (top-bar canvas) ───────────────────────────────────────────────
/**
 * Draw a scaled-down overview of the rocket + all bodies into the HUD canvas.
 * Bounds auto-fit so everything is always visible; each body has a minimum
 * display radius so distant ones still read as dots.
 */
export function updateMinimap(rkt, bodies) {
  if (!miniCtx) return;

  // Keep canvas backing-store resolution in sync with the element's display
  // size (it's flex-sized from CSS). Without this the canvas would stretch
  // and distort whenever the card's height changed.
  const rect = miniEl.getBoundingClientRect();
  const dispW = Math.max(1, Math.floor(rect.width));
  const dispH = Math.max(1, Math.floor(rect.height));
  if (miniEl.width !== dispW)  miniEl.width  = dispW;
  if (miniEl.height !== dispH) miniEl.height = dispH;

  const W = miniEl.width, H = miniEl.height;
  miniCtx.clearRect(0, 0, W, H);

  // World-space bounds covering rocket + every body + every orbit.
  // Using the orbit radius (not just the body position) keeps the view stable
  // as bodies move along their orbits.
  let minX = rkt.x, maxX = rkt.x, minY = rkt.y, maxY = rkt.y;
  for (const b of bodies) {
    const reach = b.parent ? b.orbitRadius : b.radius;
    const cx = b.parent ? b.parent.x : b.x;
    const cy = b.parent ? b.parent.y : b.y;
    minX = Math.min(minX, cx - reach);
    maxX = Math.max(maxX, cx + reach);
    minY = Math.min(minY, cy - reach);
    maxY = Math.max(maxY, cy + reach);
  }
  // 10% margin (guard against degenerate zero-extent case)
  const padX = Math.max((maxX - minX) * 0.1, 500);
  const padY = Math.max((maxY - minY) * 0.1, 500);
  minX -= padX; maxX += padX; minY -= padY; maxY += padY;

  // Scale = fit-all-bodies × miniZoom. Anchor on bounds centroid at 1× (full
  // solar system view), otherwise follow the rocket so the user can explore.
  const baseScale = Math.min(W / (maxX - minX), H / (maxY - minY));
  const scale = baseScale * miniZoom;
  const cx    = miniZoom === 1 ? (minX + maxX) / 2 : rkt.x;
  const cy    = miniZoom === 1 ? (minY + maxY) / 2 : rkt.y;
  const offX  = W / 2 - cx * scale;
  const offY  = H / 2 - cy * scale;
  const wx2mx = wx => wx * scale + offX;
  const wy2my = wy => wy * scale + offY;

  // Orbit paths — faint circles drawn before the bodies so bodies sit on top.
  miniCtx.strokeStyle = 'rgba(200,220,255,0.22)';
  miniCtx.lineWidth   = 0.6;
  for (const b of bodies) {
    if (!b.parent || !b.orbitRadius) continue;
    const r = b.orbitRadius * scale;
    if (r < 0.5) continue;  // sub-pixel — skip to avoid rendering noise
    miniCtx.beginPath();
    miniCtx.arc(wx2mx(b.parent.x), wy2my(b.parent.y), r, 0, Math.PI * 2);
    miniCtx.stroke();
  }

  // Bodies — every body, clamped to a minimum visible radius.
  for (const b of bodies) {
    miniCtx.fillStyle = b.indicatorColor || '#aaaaaa';
    miniCtx.beginPath();
    miniCtx.arc(wx2mx(b.x), wy2my(b.y), Math.max(1.5, b.radius * scale), 0, Math.PI * 2);
    miniCtx.fill();
  }

  // Rocket — dot + heading tick
  const mx = wx2mx(rkt.x), my = wy2my(rkt.y);
  const rad = (rkt.angle - 90) * Math.PI / 180;
  miniCtx.strokeStyle = '#ffcc33';
  miniCtx.lineWidth = 1.5;
  miniCtx.beginPath();
  miniCtx.moveTo(mx, my);
  miniCtx.lineTo(mx + Math.cos(rad) * 6, my + Math.sin(rad) * 6);
  miniCtx.stroke();
  miniCtx.fillStyle = '#ffcc33';
  miniCtx.beginPath(); miniCtx.arc(mx, my, 2.5, 0, Math.PI * 2); miniCtx.fill();
}

// ── Off-screen direction indicators ────────────────────────────────────────
/**
 * Draw a labelled arrow on the screen edge pointing at (worldX, worldY).
 * Fades when the target is already comfortably on-screen.
 * `radius` is the target body's radius — subtracted from the raw distance so
 * the label reflects surface-to-rocket distance, not center-to-rocket.
 */
export function drawDirIndicator(X, canvas, rkt, worldX, worldY, label, color, radius = 0) {
  const [sx, sy] = w2s(worldX, worldY);
  const cx = canvas.width / 2, cy = canvas.height / 2;

  // Screen-space angle from center toward target
  const angle = Math.atan2(sy - cy, sx - cx);

  // Indicator sits on a ring at 82% of min(halfWidth, halfHeight)
  const R  = Math.min(cx, cy) * 0.82;
  const ax = cx + Math.cos(angle) * R;
  const ay = cy + Math.sin(angle) * R;

  const onScreen = sx > 60 && sx < canvas.width - 60 && sy > 60 && sy < canvas.height - 60;

  const dist = Math.max(0, Math.hypot(worldX - rkt.x, worldY - rkt.y) - radius);
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
    drawDirIndicator(X, canvas, rkt, b.x, b.y, b.displayName, b.indicatorColor, b.radius);
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

// ── Bottom banner shown while landed ──────────────────────────────────────
export function drawLandedBanner(X, canvas, rkt) {
  if (!rkt.landedOn) return;
  const body = rkt.landedOn;

  const msg =
      body.name === 'moon'  ? '🌙  달 착륙'
    : body.name === 'earth' ? '🌍  지구 착륙'
    :                         `🪐  ${body.displayName} 착륙`;

  X.save();
  X.fillStyle = 'rgba(0,10,30,0.8)';
  X.fillRect(canvas.width / 2 - 210, canvas.height - 82, 420, 58);
  X.textAlign = 'center';
  X.font = 'bold 18px "Courier New",monospace';
  X.fillStyle = '#4f4';
  X.fillText(msg, canvas.width / 2, canvas.height - 52);
  X.font = '12px "Courier New",monospace';
  X.fillStyle = 'rgba(180,210,255,0.7)';
  X.fillText('↑ 키를 눌러 이륙', canvas.width / 2, canvas.height - 32);
  X.restore();
}
