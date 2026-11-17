// The whole game state in one factory, so the loop (main.js) and the screenshot stager
// (shots.js) build exactly the same world. Pools are pre-allocated here: bullets and
// particles are reused, never allocated per frame, which keeps the frame rate steady.
import { FIELD, ENERGY, PLAYER } from './config.js';
import { createArena } from './arena.js';
import { createPlayer } from './player.js';

export const MAX_PARTICLES = 320;
export const MAX_BOLTS = 64;
export const MAX_EBULLETS = 64;

function makeParticle() {
  return { alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', drag: 0 };
}
function makeBolt() {
  return { alive: false, x: 0, y: 0, vx: 0, vy: 0, radius: 4 };
}
function makeEBullet() {
  return { alive: false, x: 0, y: 0, vx: 0, vy: 0, radius: 7, life: 0 };
}

export function createState(random) {
  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) particles.push(makeParticle());
  const bolts = [];
  for (let i = 0; i < MAX_BOLTS; i += 1) bolts.push(makeBolt());
  const ebullets = [];
  for (let i = 0; i < MAX_EBULLETS; i += 1) ebullets.push(makeEBullet());
  return {
    random,
    arena: createArena(random),
    time: 0,
    screen: 'title',
    wave: { number: 0, queue: [], spawnTimer: 0, interval: 0.9, between: false, betweenTimer: 0 },
    score: 0,
    best: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    lastKillTime: -99,
    hearts: 3,
    energy: ENERGY.max,
    player: createPlayer(),
    enemies: [],
    bolts,
    ebullets,
    shards: [],
    hearts2: [],
    particles,
    particleCursor: 0,
    texts: [],
    shakeMag: 0,
    shakeX: 0,
    shakeY: 0,
    flash: 0,
    flashColor: '#ffffff',
    novaFx: null,
    banner: null,
    muted: false,
    over: null,
    titleDrift: 0,
  };
}
