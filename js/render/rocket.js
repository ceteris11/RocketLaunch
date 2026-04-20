// ============================================================================
// Rocket rendering
// ----------------------------------------------------------------------------
// Drawn at fixed screen pixel size (it does not scale with zoom — zoom is
// fixed anyway). Local origin = rocket center; local "up" (-y) = heading when
// angle = 0.
//
// For multiplayer, call drawRocket() for each rocket instance. To distinguish
// players, pass a tint and multiply it into the body fill in this file.
// ============================================================================

import { w2s } from '../camera.js';

export function drawRocket(X, rkt) {
  const [rx, ry] = w2s(rkt.x, rkt.y);
  X.save();
  X.translate(rx, ry);
  X.rotate(rkt.angle * Math.PI / 180);

  // ── Flame (flickers when firing) ────────────────────────────────────────
  if (rkt.fire) {
    const fl = 18 + Math.random() * 18;
    const fg = X.createLinearGradient(0, 15, 0, 15 + fl);
    fg.addColorStop(0,    'rgba(255,230,70,1)');
    fg.addColorStop(0.45, 'rgba(255,110,20,.85)');
    fg.addColorStop(1,    'rgba(255,30,0,0)');
    X.beginPath();
    X.moveTo(-5, 15); X.lineTo(5, 15); X.lineTo(3, 15 + fl); X.lineTo(-3, 15 + fl);
    X.closePath();
    X.fillStyle = fg; X.fill();
  }

  // ── Brake retro-thrusters (two small flames from nose sides, angled outward) ─
  if (rkt.brake) {
    const fl = 8 + Math.random() * 8;
    for (const s of [-1, 1]) {
      const fg = X.createLinearGradient(s * 3, -12, s * 5, -12 - fl);
      fg.addColorStop(0,    'rgba(255,230,70,1)');
      fg.addColorStop(0.45, 'rgba(255,110,20,.85)');
      fg.addColorStop(1,    'rgba(255,30,0,0)');
      X.beginPath();
      X.moveTo(s * 2, -12);
      X.lineTo(s * 4, -12);
      X.lineTo(s * 6, -12 - fl);
      X.lineTo(s * 5, -12 - fl);
      X.closePath();
      X.fillStyle = fg; X.fill();
    }
  }

  // ── Body (grey triangle) ────────────────────────────────────────────────
  X.beginPath();
  X.moveTo(0, -22); X.lineTo(-7, 14); X.lineTo(7, 14);
  X.closePath();
  X.fillStyle = '#d8d8d8'; X.fill();
  X.strokeStyle = '#aaa'; X.lineWidth = 0.8; X.stroke();

  // ── Nose cone (red) ─────────────────────────────────────────────────────
  X.beginPath();
  X.moveTo(0, -22); X.lineTo(-5, -8); X.lineTo(5, -8);
  X.closePath();
  X.fillStyle = '#e84040'; X.fill();

  // ── Fins (orange) ───────────────────────────────────────────────────────
  X.fillStyle = '#e07830';
  X.beginPath(); X.moveTo(-7, 14); X.lineTo(-15, 22); X.lineTo(-7, 2); X.closePath(); X.fill();
  X.beginPath(); X.moveTo( 7, 14); X.lineTo( 15, 22); X.lineTo( 7, 2); X.closePath(); X.fill();

  // ── Cockpit window ──────────────────────────────────────────────────────
  X.beginPath(); X.arc(0, -4, 4, 0, Math.PI * 2);
  X.fillStyle = '#a8eeff'; X.fill();
  X.strokeStyle = '#888'; X.lineWidth = 1; X.stroke();

  X.restore();
}
