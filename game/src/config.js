// Every tuning number in one place. The playfield is a fixed 1280x720 logical area; the
// renderer scales it to the window, so no rule below depends on the screen size.
import { PALETTE } from './palette.js';

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  accel: 2600,
  maxSpeed: 345,
  friction: 6.5,
  fireInterval: 0.14,
  boltSpeed: 660,
  boltRadius: 4,
  dashSpeed: 950,
  dashTime: 0.16,
  dashCost: 25,
  dashCooldown: 0.9,
  novaCost: 60,
  novaRadius: 270,
  novaDamage: 3,
  invulnerable: 1.6,
  knockback: 420,
};

export const ENEMY = {
  chaser: { hp: 2, speed: 148, speedPerWave: 9, radius: 16, points: 50, color: PALETTE.enemyChaser },
  shooter: { hp: 3, speed: 96, speedPerWave: 6, radius: 15, points: 80, color: PALETTE.enemyShooter, fireInterval: 2.3, projSpeed: 185, keepDistance: 290 },
  splitter: { hp: 5, speed: 68, speedPerWave: 4, radius: 24, points: 100, color: PALETTE.enemySplitter },
  wisp: { hp: 1, speed: 215, speedPerWave: 10, radius: 10, points: 20, color: PALETTE.enemyWisp },
};

export const ENERGY = {
  max: 100,
  regen: 4,
  wellRegen: 16,
  shard: 6,
};

export const COMBO = {
  window: 2.5,
  max: 8,
  perKill: 0.25,
};

export const WAVE = {
  /** Seconds of breather after a wave is cleared. */
  breather: 2.5,
  /** Seconds between spawns at wave 1; shrinks each wave to a floor. */
  spawnInterval: 0.9,
  spawnIntervalPerWave: 0.05,
  minSpawnInterval: 0.35,
  /** Points bonus for clearing a wave, times the wave number. */
  clearBonus: 100,
};

export const WELLS = [
  { x: 300, y: 180, r: 78 },
  { x: 980, y: 540, r: 78 },
];

export const SHARD = { radius: 7, magnet: 130, collect: 26, points: 5, life: 14 };
export const HEART_DROP_WAVE = 4;

export { PALETTE };
