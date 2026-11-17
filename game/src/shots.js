// The screenshot scenes behind ?shot=start|play|nova|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot (aim at the
// nearest wisp, fire when close, dash away when crowded, nova when surrounded, chase shards),
// so the frame is what a short game really looks like and the same seed always gives the same
// frame. No wall-clock anywhere: the pilot and the world both run on the fixed step.
import { STEP, FIELD } from './config.js';
import { ACTION_DASH, ACTION_NOVA } from './input.js';
import { spawnEnemy } from './enemies.js';
import { startWave } from './waves.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './hud.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 16;
const NOVA_SECONDS = 13;
const END_LIMIT_SECONDS = 150;

/** The autopilot's move/aim/fire for one step. `passive` means: no firing, drift at the enemy. */
function autopilot(state, input, passive) {
  const p = state.player;
  let nearest = null;
  let nearestD = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestD) {
      nearestD = d;
      nearest = e;
    }
  }
  if (passive) {
    if (nearest) {
      input.setMove(nearest.x - p.x, nearest.y - p.y);
      input.setAim(nearest.x, nearest.y);
    } else {
      input.setMove(0, 0);
    }
    input.setFiring(false);
    return;
  }
  if (nearest) {
    input.setAim(nearest.x, nearest.y);
    input.setFiring(nearestD < 560);
  } else {
    input.setFiring(false);
  }
  // Move: flee when crowded, else chase the nearest shard, else close on the nearest wisp.
  // Near an edge, drift back toward the middle so the action stays in the frame.
  let mx = 0;
  let my = 0;
  const edge = 150;
  if (p.x < edge || p.x > FIELD.width - edge || p.y < edge || p.y > FIELD.height - edge) {
    mx = FIELD.width / 2 - p.x;
    my = FIELD.height / 2 - p.y;
  } else if (nearest && nearestD < 130) {
    mx = p.x - nearest.x;
    my = p.y - nearest.y;
  } else if (state.shards.length > 0) {
    let s = null;
    let sd = Infinity;
    for (const sh of state.shards) {
      const d = Math.hypot(sh.x - p.x, sh.y - p.y);
      if (d < sd) {
        sd = d;
        s = sh;
      }
    }
    if (s && sd < 320) {
      mx = s.x - p.x;
      my = s.y - p.y;
    }
  }
  if (mx === 0 && my === 0 && nearest) {
    mx = nearest.x - p.x;
    my = nearest.y - p.y;
  }
  if (mx === 0 && my === 0) {
    mx = FIELD.width / 2 - p.x;
    my = FIELD.height / 2 - p.y;
  }
  input.setMove(mx, my);
  // Dash away when something is right on top of us.
  if (nearest && nearestD < 95 && state.energy >= 25 && p.dashCooldown <= 0) {
    input.queueAction(ACTION_DASH);
  }
  // Nova when surrounded and charged.
  let close = 0;
  for (const e of state.enemies) {
    if (Math.hypot(e.x - p.x, e.y - p.y) < 260) close += 1;
  }
  if (close >= 4 && state.energy >= 60) input.queueAction(ACTION_NOVA);
}

/**
 * Set `state` to the named scene (start, play, nova or end; any other name is start) and
 * return the screen to draw over it. `step` is main.js's single fixed-step function, given
 * the frame's one-shot input each call (the autopilot queues dash/nova into the input).
 */
export function stageShot(name, state, input, step) {
  if (name === 'play' || name === 'nova' || name === 'end') {
    // The world only advances the play rules while the screen is 'play' — set it before
    // stepping, or the loop runs the title attract branch and nothing spawns, moves or fires.
    state.screen = SCREEN_PLAY;
    startWave(state, 1);
    const limit = name === 'play' ? PLAY_SECONDS : name === 'nova' ? NOVA_SECONDS : END_LIMIT_SECONDS;
    // The end scene plays well first (so the game-over screen shows a real score and wave),
    // then stops fighting and drifts into the wisps until it dies.
    const goodSeconds = name === 'end' ? 20 : 0;
    for (let i = 0; i < limit / STEP; i += 1) {
      if (!state.player.alive) break;
      const passive = name === 'end' && state.time >= goodSeconds;
      autopilot(state, input, passive);
      step(input.takeActions());
    }
    if (name === 'nova' && state.player.alive) {
      // Stage the nova moment itself: centre the player (so the ring frames the middle of
      // the shot and never covers the HUD), full energy, wisps pulled close, fire it, freeze mid-flash.
      const p = state.player;
      p.x = FIELD.width / 2;
      p.y = FIELD.height / 2;
      p.vx = 0;
      p.vy = 0;
      state.energy = 100;
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        spawnEnemy(state, 'chaser', p.x + Math.cos(a) * 150, p.y + Math.sin(a) * 150);
      }
      input.queueAction(ACTION_NOVA);
      for (let i = 0; i < 0.15 / STEP; i += 1) {
        autopilot(state, input, false);
        step(input.takeActions());
      }
    }
    const over = !state.player.alive;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY };
  }
  // Title: an attract mode — wisps drift across a living arena behind the title panel.
  state.screen = SCREEN_TITLE;
  for (let i = 0; i < 3; i += 1) spawnEnemy(state, 'chaser', 200 + i * 300, 160 + i * 120);
  for (let i = 0; i < 2; i += 1) spawnEnemy(state, 'shooter', 300 + i * 500, 500 - i * 100);
  state.player.invuln = 999;
  for (let i = 0; i < START_SECONDS / STEP; i += 1) step(0);
  state.player.invuln = 0;
  return { screen: SCREEN_TITLE };
}
