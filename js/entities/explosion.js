// ============================================================================
// Explosion — one-shot visual effect spawned when the rocket crashes
// ----------------------------------------------------------------------------
// Pure data container: holds elapsed time + a batch of spark particles.
// Rendering lives in render/explosion.js.
//
// Lifecycle:
//   new Explosion() → update(dt) each frame → done === true after ~2.5s
//   main.js discards it when `done` is true.
//
// Adding new effect types (shockwaves, smoke trails, debris) is as simple as
// mimicking this module: state object + matching drawer + lifetime flag.
// ============================================================================

const SPARK_COLORS = ['#ff8', '#fa4', '#f84', '#f44', '#fff'];
const LIFETIME_SEC = 2.5;

export class Explosion {
  constructor() {
    this.t    = 0;
    this.done = false;
    this.sparks = Array.from({ length: 55 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 50 + Math.random() * 250,
      size:  1 + Math.random() * 4,
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      life:  0.4 + Math.random() * 1.3,
    }));
  }

  update(dtSec) {
    this.t += dtSec;
    if (this.t > LIFETIME_SEC) this.done = true;
  }
}
