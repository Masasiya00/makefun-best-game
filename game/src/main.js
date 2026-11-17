// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over. The player can win nothing but
// survival: the score, the wave and the best are the goal, and losing all three hearts ends it.
//
// ?seed=N fixes the pattern. ?shot=start|play|nova|end (with &seed=N) stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady for a screenshot.
// window.__lumen.snapshot() reports the live state for automated playtests.
import { FIELD, STEP } from './config.js';
import { PALETTE, BEST_KEY } from './palette.js';
import { createRandom } from './random.js';
import { createState } from './state.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { updatePlayer } from './player.js';
import { updateEnemies } from './enemies.js';
import { updateBullets } from './bullets.js';
import { updatePickups } from './pickups.js';
import { updateWaves, startWave } from './waves.js';
import { updateParticles } from './particles.js';
import { unlockAudio, setMuted, isMuted } from './audio.js';
import { drawWorld, drawHUD, drawTitle, drawPaused, drawGameOver, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './hud.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const ctx = canvas.getContext('2d');
const state = createState(createRandom(seed));
const input = createInput(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resize);
resize();

function render() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
  const ox = (canvas.width - FIELD.width * scale) / 2;
  const oy = (canvas.height - FIELD.height * scale) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, ox, oy);
  drawWorld(ctx, state);
  if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSED) drawHUD(ctx, state);
  if (state.screen === SCREEN_TITLE) drawTitle(ctx, state, state.best);
  else if (state.screen === SCREEN_PAUSED) drawPaused(ctx);
  else if (state.screen === SCREEN_OVER) drawGameOver(ctx, state);
}

function announce(message) {
  status.textContent = message;
}

function endGame() {
  state.screen = SCREEN_OVER;
  const isNewBest = state.score > state.best;
  if (isNewBest) {
    state.best = state.score;
    saveBest(state.best);
  }
  state.over = { score: state.score, wave: state.wave.number, best: state.best, isNewBest };
  announce(`Game over. Score ${state.score}. Best ${state.best}. Wave ${state.wave.number}.`);
}

/** One fixed step of the world (used by the loop and by the screenshot stager). `actions` is
 * the frame's one-shot input, given to the first step only so a dash/nova fires exactly once. */
function stepWorld(actions) {
  state.time += STEP;
  state.flash = Math.max(0, state.flash - STEP * 1.8);
  if (state.novaFx) {
    state.novaFx.t += STEP;
    if (state.novaFx.t > 0.5) state.novaFx = null;
  }
  if (state.banner) {
    state.banner.t -= STEP;
    if (state.banner.t <= 0) state.banner = null;
  }
  state.comboTimer -= STEP;
  if (state.comboTimer <= 0) state.combo = 0;
  if (state.screen === SCREEN_TITLE) {
    // Attract mode: the arena lives, the player idles in the middle.
    updateEnemies(state, STEP);
    updateParticles(state, STEP);
    return;
  }
  if (state.screen !== SCREEN_PLAY) return;
  updatePlayer(state, STEP, input, actions);
  updateEnemies(state, STEP);
  updateBullets(state, STEP);
  updatePickups(state, STEP);
  updateWaves(state, STEP);
  updateParticles(state, STEP);
  if (!state.player.alive) endGame();
}

function snapshot() {
  return {
    phase: state.screen,
    wave: state.wave.number,
    score: state.score,
    best: Math.max(state.best, state.score),
    health: state.hearts,
    energy: Math.round(state.energy),
    combo: state.combo,
    kills: state.kills,
    enemies: state.enemies.length,
    shards: state.shards.length,
    playerPos: [Math.round(state.player.x), Math.round(state.player.y)],
    time: Math.round(state.time * 100) / 100,
    muted: isMuted(),
  };
}
window.__lumen = { snapshot };

function runShot(name) {
  const scene = stageShot(name, state, input, stepWorld);
  state.screen = scene.screen;
  if (scene.screen === SCREEN_OVER) {
    state.over = { score: state.score, wave: state.wave.number, best: Math.max(state.best, state.score), isNewBest: state.score > state.best };
  }
  let painted = 0;
  function paint() {
    render();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  state.best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // One-shot presses accumulate here until a step or a screen transition consumes them:
  // taking them eagerly in the frame and dropping them when no fixed step runs that frame
  // would lose a dash/nova pressed between steps, which reads as input lag.
  let pendingActions = 0;

  function startGame() {
    unlockAudio();
    const keepBest = state.best;
    const fresh = createState(createRandom(Math.floor(Math.random() * 4294967296)));
    Object.assign(state, fresh);
    state.best = keepBest;
    state.screen = SCREEN_PLAY;
    startWave(state, 1);
    accumulator = 0;
    announce('Playing. 3 hearts. Survive the waves.');
  }

  // Consumes the bits it acts on; returns true on a screen transition (which eats the rest,
  // so a Space that starts the game cannot also fire a nova on the first frame).
  function handleActions() {
    if (pendingActions & ACTION_MUTE) {
      pendingActions &= ~ACTION_MUTE;
      setMuted(!isMuted());
      announce(isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (state.screen === SCREEN_TITLE || state.screen === SCREEN_OVER) {
      if (pendingActions & ACTION_CONFIRM) {
        pendingActions = 0;
        startGame();
        return true;
      }
    } else if (state.screen === SCREEN_PLAY) {
      if (pendingActions & ACTION_PAUSE) {
        pendingActions = 0;
        state.screen = SCREEN_PAUSED;
        announce('Paused.');
        return true;
      }
    } else if (state.screen === SCREEN_PAUSED) {
      if (pendingActions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        pendingActions = 0;
        state.screen = SCREEN_PLAY;
        announce('Playing.');
        return true;
      }
    }
    return false;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    pendingActions |= input.takeActions();
    handleActions();
    if (state.screen === SCREEN_TITLE || state.screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (state.screen === SCREEN_TITLE || state.screen === SCREEN_PLAY)) {
        stepWorld(first ? pendingActions : 0);
        if (first) pendingActions = 0;
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    render();
  }

  // Leaving the tab pauses a running game rather than letting wisps hunt unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.screen === SCREEN_PLAY) {
      state.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen Drift. Click or press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
