// ============================================================================
// camera.js — viewport & world-to-screen projection
// ----------------------------------------------------------------------------
// The camera stays centered on a "target" object with an {x, y} position.
// Default target is the rocket; swap via setTarget() for spectator / replay /
// cinematic modes. Scale is fixed (Earth fills a constant fraction of the
// screen), so the whole scene effectively orbits around whatever you center on.
// ============================================================================

import { R_EARTH, EARTH_SCREEN_RATIO } from './config.js';

let canvas = null;
let target = null;   // any object exposing { x, y } in world km

export function initCamera(canvasEl, initialTarget) {
  canvas = canvasEl;
  target = initialTarget;
}

/** Change what the camera follows. Pass anything with {x, y}. */
export function setTarget(t) { target = t; }

/** Current pixels-per-km. Recomputed each call so it tracks canvas resizes. */
export function getScale() {
  return Math.min(canvas.width, canvas.height) * EARTH_SCREEN_RATIO / R_EARTH;
}

/** World coordinates (km) → screen coordinates (px). Returns [sx, sy]. */
export function w2s(wx, wy) {
  const s = getScale();
  return [
    canvas.width  / 2 + (wx - target.x) * s,
    canvas.height / 2 + (wy - target.y) * s,
  ];
}
