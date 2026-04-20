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

// Main-view zoom out multiplier. 1× = default (Earth ≈ EARTH_SCREEN_RATIO of
// the viewport); higher values shrink the view so larger bodies (Saturn, Sun)
// fit on screen. Divides getScale() so km → px gets smaller.
let viewMultiplier = 1;

export function initCamera(canvasEl, initialTarget) {
  canvas = canvasEl;
  target = initialTarget;
}

/** Change what the camera follows. Pass anything with {x, y}. */
export function setTarget(t) { target = t; }

/** Set the main-view zoom-out multiplier (1 = default, >1 = wider view). */
export function setViewMultiplier(m) { viewMultiplier = m; }
export function getViewMultiplier()   { return viewMultiplier; }

/** Current pixels-per-km (affected by viewMultiplier). Use for rendering. */
export function getScale() {
  return getBaseScale() / viewMultiplier;
}

/** View-independent pixels-per-km — use for physics/collision math that must
 *  not shift when the user changes the main-view zoom. */
export function getBaseScale() {
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
