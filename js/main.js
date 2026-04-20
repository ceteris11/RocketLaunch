// ============================================================================
// main.js — entry point: boot canvas, wire systems, run the game loop
// ----------------------------------------------------------------------------
//
// ─── ARCHITECTURE OVERVIEW ───────────────────────────────────────────────────
//
//   config.js              Tuning constants (physics, game feel, rendering)
//   camera.js              World → screen projection, camera target
//   input.js               DOM events → neutral command state
//   world/
//     body.js              CelestialBody class (mass, radius, orbit, base)
//     bodies.js            The solar system — EARTH, MOON, BODIES[]
//   entities/
//     rocket.js            Player ship: physics step + collision + landing
//     explosion.js         Crash effect (data only)
//   render/
//     background.js        Sky + tiling star field
//     bodies.js            Planet + base drawers, registered by renderStyle
//     rocket.js            Rocket sprite
//     explosion.js         Crash particles
//     hud.js               Top bar, overlays, direction indicators, banner
//   main.js                This file. State container + game loop.
//
// ─── DATA FLOW EACH FRAME ────────────────────────────────────────────────────
//
//   1. input.js has been populating `state` as DOM events fire.
//   2. update():
//        a. advance gameTime
//        b. orbit all bodies  (parents first; see world/bodies.js)
//        c. read input commands
//        d. rocket.step(cmd, BODIES) — returns 'crash', land event, or null
//        e. advance any active Explosion
//   3. draw():
//        background → bodies → bases → rocket → explosion → HUD overlay
//
// ─── EXTENDING ───────────────────────────────────────────────────────────────
//
//   New planet:
//     • Add constants to config.js
//     • Instantiate a CelestialBody in world/bodies.js and append to BODIES
//     • Register a renderStyle in render/bodies.js STYLE_MAP
//
//   Alien ships (NPCs):
//     • Add entities/alien.js with an Alien class (state + step)
//     • Keep an `aliens: []` list here, update + render each frame
//     • Collide alien vs rocket in a new entities/collisions.js if needed
//
//   Multiplayer:
//     • Extract the game-state bag (rocket, aliens, explosions, gameTime)
//       into a World object in world/world.js and export a step(cmds) that
//       takes a per-player-id command map.
//     • Drive remote Rockets from network packets: setCommand() on a
//       per-player input channel, step deterministically each tick.
//     • DT is already fixed — if you also replace the screen-scale-dependent
//       BASE_SPAWN_PX logic in entities/rocket.js, the sim becomes fully
//       deterministic for rollback / replay.
// ============================================================================

'use strict';

import { DT } from './config.js';
import { BODIES, EARTH }          from './world/bodies.js';
import { Rocket }                 from './entities/rocket.js';
import { Explosion }              from './entities/explosion.js';
import { initInput, readCommands, CMD } from './input.js';
import { initCamera }             from './camera.js';
import { drawBackground }         from './render/background.js';
import { drawBodies, drawBases }  from './render/bodies.js';
import { drawRocket }             from './render/rocket.js';
import { drawExplosion }          from './render/explosion.js';
import {
  updateHUD, updateMinimap, drawAllDirIndicators, drawOverlay, drawLandedBanner,
} from './render/hud.js';

// ─── Canvas setup ────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
resize();
addEventListener('resize', resize);

// ─── Game state ──────────────────────────────────────────────────────────────
// Kept here because the set is small and only this file mutates `phase`.
// For multiplayer, promote this to a World class (see header comment).
const rocket   = new Rocket(EARTH);
let   phase    = 'title';   // 'title' | 'play' | 'dead'
let   explosion = null;
let   gameTime = 0;         // seconds since game start — drives body orbits

initCamera(canvas, rocket);

// ─── Input wiring (phase transitions) ────────────────────────────────────────
// input.js keeps per-key state; the callback here only decides when to
// transition between title/play/dead phases.
initInput(canvas, (key) => {
  if (phase === 'title') { phase = 'play'; return; }
  if (phase === 'dead' && key === CMD.START) {
    rocket.reset();
    explosion = null;
    phase = 'play';
  }
});

// ─── Main loop ───────────────────────────────────────────────────────────────
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  if (phase === 'play') {
    gameTime += DT;
    // Advance orbits. BODIES is ordered so parents update before children.
    for (const b of BODIES) b.updateOrbit(gameTime);

    const cmd   = readCommands();
    const event = rocket.step(cmd, BODIES);

    if (event === 'crash') {
      explosion = new Explosion();
      phase     = 'dead';
    }
    // (Other events: { type:'land', body } — currently no-op at this layer.)
  }

  if (explosion) {
    explosion.update(1 / 60);
    if (explosion.done) explosion = null;
  }
}

function draw() {
  drawBackground(ctx, canvas, rocket);
  drawBodies(ctx,    canvas, BODIES);
  drawBases(ctx,     canvas, BODIES);

  if (phase !== 'dead') drawRocket(ctx, rocket);
  if (explosion)        drawExplosion(ctx, canvas, explosion);

  // Off-screen arrows for every body (the camera is locked on the rocket,
  // so no body needs to be "skipped" here — pass null).
  drawAllDirIndicators(ctx, canvas, rocket, BODIES, null);

  updateHUD(rocket, EARTH);
  updateMinimap(rocket, BODIES);

  if (phase === 'play')  drawLandedBanner(ctx, canvas, rocket);
  if (phase === 'title') drawTitleScreen();
  if (phase === 'dead')  drawDeadScreen();
}

// ─── Phase-specific overlays ─────────────────────────────────────────────────
function drawTitleScreen() {
  drawOverlay(ctx, canvas,
    '🚀  ROCKET LAUNCH',
    '지구에서 로켓을 쏴 우주를 탐험하세요!',
    '↑ 가속   ← → 방향 전환   ↓ 브레이크',
    '아무 키나 눌러 시작');

  // Extra hint lines specific to the title screen
  const cx = canvas.width / 2, cy = canvas.height / 2;
  ctx.textAlign = 'center';
  ctx.font = '14px "Courier New",monospace';
  ctx.fillStyle = '#ff8'; ctx.fillText('⚡ Shift 키로 하이퍼드라이브 (빛의 속도)', cx, cy + 44);
  ctx.fillStyle = '#f99'; ctx.fillText('300 km/s 초과 속도로 착륙하면 충돌합니다.', cx, cy + 62);
}

function drawDeadScreen() {
  drawOverlay(ctx, canvas,
    '💥  충돌!',
    '최대 거리: ' + Math.floor(rocket.maxAlt).toLocaleString('ko-KR') + ' km',
    '너무 빠른 속도로 지면에 충돌했습니다',
    'SPACE 키로 다시 시작');
}

loop();
