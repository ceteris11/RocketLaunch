// ============================================================================
// Explosion rendering (paired with entities/explosion.js)
// ----------------------------------------------------------------------------
// Always renders at the center of the canvas — the camera was tracking the
// rocket when it died, so "center" is effectively "where the rocket was."
// If multiplayer shifts the camera off the dying rocket, extend Explosion to
// carry a world position and project it through w2s() here.
// ============================================================================

export function drawExplosion(X, canvas, ex) {
  const t  = ex.t;
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;

  // Bright screen flash in the first ~0.14s
  if (t < 0.14) {
    X.fillStyle = `rgba(255,210,60,${((1 - t / 0.14) * 0.72).toFixed(2)})`;
    X.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Primary shockwave ring
  const r1a = Math.max(0, 1 - t * 1.8);
  X.beginPath(); X.arc(cx, cy, t * 230, 0, Math.PI * 2);
  X.strokeStyle = `rgba(255,140,0,${r1a})`; X.lineWidth = 6; X.stroke();

  // Secondary shockwave (slightly delayed)
  if (t > 0.08) {
    const r2a = Math.max(0, 1 - (t - 0.08) * 2.2);
    X.beginPath(); X.arc(cx, cy, (t - 0.08) * 150, 0, Math.PI * 2);
    X.strokeStyle = `rgba(255,60,0,${r2a})`; X.lineWidth = 3; X.stroke();
  }

  // Sparks (each one lives for its own `life` seconds)
  X.save();
  for (const s of ex.sparks) {
    if (t > s.life) continue;
    X.globalAlpha = Math.max(0, 1 - t / s.life);
    X.fillStyle = s.color;
    X.beginPath();
    X.arc(
      cx + Math.cos(s.angle) * s.speed * t,
      cy + Math.sin(s.angle) * s.speed * t,
      s.size * (1 - t / s.life * 0.5),
      0, Math.PI * 2
    );
    X.fill();
  }
  X.restore();
}
