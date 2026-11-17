// Waves: what spawns, when, and what happens when the arena is clear. Wave N grows the
// count and the speed, unlocks Shooters from wave 3 and Splitters from wave 5, and pays a
// clear bonus before a short breather and the next wave.
import { WAVE } from './config.js';
import { spawnAtEdge } from './enemies.js';
import { floatText } from './particles.js';
import { sfx } from './audio.js';

export function waveComposition(n) {
  const list = [];
  const chasers = 4 + n * 2;
  for (let i = 0; i < chasers; i += 1) list.push('chaser');
  if (n >= 3) {
    const shooters = n - 2;
    for (let i = 0; i < shooters; i += 1) list.push('shooter');
  }
  if (n >= 5) {
    const splitters = n - 4;
    for (let i = 0; i < splitters; i += 1) list.push('splitter');
  }
  return list;
}

export function startWave(state, n) {
  state.wave.number = n;
  const queue = waveComposition(n);
  // Shuffle the queue with the seeded random so the same seed stages the same wave.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(state.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  state.wave.queue = queue;
  state.wave.spawnTimer = 0.4;
  state.wave.interval = Math.max(WAVE.minSpawnInterval, WAVE.spawnInterval - (n - 1) * WAVE.spawnIntervalPerWave);
  state.wave.between = false;
  state.banner = { text: 'WAVE ' + n, sub: queue.length + ' wisps incoming', t: 2.2 };
  sfx.waveStart();
}

export function updateWaves(state, dt) {
  const w = state.wave;
  if (w.between) {
    w.betweenTimer -= dt;
    if (w.betweenTimer <= 0) startWave(state, w.number + 1);
    return;
  }
  if (w.queue.length > 0) {
    w.spawnTimer -= dt;
    if (w.spawnTimer <= 0) {
      w.spawnTimer = w.interval;
      spawnAtEdge(state, w.queue.shift());
    }
    return;
  }
  if (state.enemies.length === 0 && state.player.alive) {
    const bonus = WAVE.clearBonus * w.number;
    state.score += bonus;
    floatText(state, state.player.x, state.player.y - 30, 'WAVE CLEAR +' + bonus, '#ffd75e');
    sfx.waveClear();
    w.between = true;
    w.betweenTimer = WAVE.breather;
    state.banner = { text: 'WAVE ' + w.number + ' CLEAR', sub: '+' + bonus + ' — next wave in ' + WAVE.breather + 's', t: 2.0 };
  }
}

export function enemiesLeft(state) {
  return state.enemies.length + state.wave.queue.length;
}
