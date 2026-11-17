// Keyboard and pointer input. Held keys give a move direction; the mouse gives an aim point;
// one-shot presses (start, restart, pause, dash, nova, mute) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost and never counted twice.
// Firing is a held mouse button.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_NOVA = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter', 'KeyR', 'Space']);
const PAUSE = new Set(['KeyP', 'Escape']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const NOVA = new Set(['Space']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 640;
  let mouseY = 360;
  let firing = false;
  /** A forced move vector (the screenshot autopilot); null means read the keys. */
  let forcedMove = null;

  function toGameCoords(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    mouseX = (event.clientX - rect.left) * scaleX;
    mouseY = (event.clientY - rect.top) * scaleY;
  }

  // Separate ifs (not else-if): Space is both CONFIRM (start/restart) and NOVA (in play),
  // so one press must be able to set both flags.
  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
    }
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    }
    if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    }
    if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
      event.preventDefault();
    }
    if (NOVA.has(event.code)) {
      if (!event.repeat) actions |= ACTION_NOVA;
      event.preventDefault();
    }
    if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    keys.clear();
    firing = false;
  });
  canvas.addEventListener('pointermove', toGameCoords);
  canvas.addEventListener('pointerdown', (event) => {
    toGameCoords(event);
    if (event.button === 0) {
      firing = true;
      actions |= ACTION_CONFIRM;
    }
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) firing = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Normalised move vector from WASD / arrows (or the autopilot's forced vector). */
    move() {
      if (forcedMove) return forcedMove;
      const x = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const y = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
      const len = Math.hypot(x, y);
      return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
    },
    /** The mouse aim point in game coordinates. */
    aim() {
      return { x: mouseX, y: mouseY };
    },
    /** Whether the fire button is held. */
    isFiring() {
      return firing;
    },
    /** Force the move vector (used by the screenshot autopilot); pass null to read the keys. */
    setMove(x, y) {
      if (x === null || y === null) {
        forcedMove = null;
        return;
      }
      const len = Math.hypot(x, y);
      forcedMove = len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
    },
    /** Set the aim point (used by the screenshot autopilot). */
    setAim(x, y) {
      mouseX = x;
      mouseY = y;
    },
    /** Hold or release fire (used by the screenshot autopilot). */
    setFiring(value) {
      firing = value;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Queue a one-shot action (used by the screenshot autopilot). */
    queueAction(flag) {
      actions |= flag;
    },
  };
}
