// ============================================================================
// input.js — keyboard + touch → command state
// ----------------------------------------------------------------------------
// The rest of the game never listens to DOM events directly. Systems (rocket,
// future aliens, future remote players) consume a simple command map through
// isDown(CMD.X) / readCommands().
//
// Why this indirection:
//   - Clean separation: logic doesn't know or care if input came from keyboard,
//     touch, gamepad, replay buffer, or a network packet.
//   - Multiplayer-ready: a networked command ("remote player is thrusting")
//     just calls setCommand(CMD.THRUST, true) on a remote input channel.
//   - Replay/AI: swap in a scripted command producer for demos or bots.
//
// Extending:
//   - Add a new command? Append to CMD and wire it up in initInput().
//   - Need per-player inputs? Make this module a class and instantiate one
//     per player, instead of the current module-level singleton.
// ============================================================================

// Logical command names — kept as the raw key strings so keyboard events map
// directly without a translation table. Change the values if you rebind keys.
export const CMD = {
  LEFT:   'ArrowLeft',
  RIGHT:  'ArrowRight',
  THRUST: 'ArrowUp',
  START:  ' ',            // space — restart from crash
};

const state = Object.create(null);

export function isDown(cmd) { return !!state[cmd]; }
export function setCommand(cmd, pressed) { state[cmd] = !!pressed; }

/** Snapshot of the current command state as a plain object (for rocket.step). */
export function readCommands() {
  return {
    left:   !!state[CMD.LEFT],
    right:  !!state[CMD.RIGHT],
    thrust: !!state[CMD.THRUST],
  };
}

/**
 * Wire up DOM listeners.
 * @param canvas    The game canvas (for tap-to-start on touch devices).
 * @param onKeyDown Callback fired on every key/button press, used by main.js
 *                  to handle phase transitions (title → play, dead → respawn).
 *                  Receives the raw key string (e.g. 'ArrowUp', ' ').
 */
export function initInput(canvas, onKeyDown) {
  // ── Keyboard ──────────────────────────────────────────────────────────
  addEventListener('keydown', e => {
    setCommand(e.key, true);
    // Stop the browser from scrolling the page on arrows/space
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))
      e.preventDefault();
    onKeyDown(e.key);
  });
  addEventListener('keyup', e => setCommand(e.key, false));

  // ── On-screen touch buttons ───────────────────────────────────────────
  bindTouchButton('btn-left',  CMD.LEFT,   onKeyDown);
  bindTouchButton('btn-up',    CMD.THRUST, onKeyDown);
  bindTouchButton('btn-right', CMD.RIGHT,  onKeyDown);

  // Tap anywhere on the canvas = "any key" (used to dismiss title/crash screens)
  canvas.addEventListener('touchstart', () => onKeyDown(CMD.START), { passive: true });
}

function bindTouchButton(id, cmd, onKeyDown) {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener('touchstart', e => {
    e.preventDefault();
    setCommand(cmd, true);
    el.classList.add('pressed');
    onKeyDown(cmd);
  }, { passive: false });

  const release = e => {
    e.preventDefault();
    setCommand(cmd, false);
    el.classList.remove('pressed');
  };
  el.addEventListener('touchend',    release, { passive: false });
  el.addEventListener('touchcancel', release, { passive: false });
}
