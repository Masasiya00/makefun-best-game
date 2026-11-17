// The void wisps: three enemy types with different behaviour, plus the small wisps a
// Splitter leaves behind. Chasers hunt the player; Shooters keep their distance and fire slow
// orbs; Splitters are slow and tough, and split into two wisps when they die.
import { FIELD, ENEMY, COMBO } from './config.js';
import { PALETTE } from './palette.js';
import { spawnEnemyShot } from './bullets.js';
import { damagePlayer } from './player.js';
import { dropShards, dropHeart } from './pickups.js';
import { burst, floatText } from './particles.js';
import { glowSprite, drawGlow } from './sprites.js';
import { sfx } from './audio.js';
import { range } from './random.js';

let nextId = 1;

export function spawnEnemy(state, kind, x, y) {
  const def = ENEMY[kind];
  const wave = state.wave.number;
  state.enemies.push({
    id: nextId,
    kind,
    x, y,
    vx: 0, vy: 0,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed + def.speedPerWave * (wave - 1),
    radius: def.radius,
    points: def.points,
    color: def.color,
    fireTimer: range(state.random, 1.2, 2.4),
    wobble: state.random() * Math.PI * 2,
    hitFlash: 0,
  });
  nextId += 1;
}

export function spawnAtEdge(state, kind) {
  const m = 40;
  const side = Math.floor(state.random() * 4);
  let x;
  let y;
  if (side === 0) { x = range(state.random, m, FIELD.width - m); y = m; }
  else if (side === 1) { x = range(state.random, m, FIELD.width - m); y = FIELD.height - m; }
  else if (side === 2) { x = m; y = range(state.random, m, FIELD.height - m); }
  else { x = FIELD.width - m; y = range(state.random, m, FIELD.height - m); }
  spawnEnemy(state, kind, x, y);
}

function steer(enemy, tx, ty, speed, dt, wobble) {
  const dx = tx - enemy.x;
  const dy = ty - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  // Wobble from the enemy's own accumulated time (seeded, deterministic) — never wall-clock.
  const wob = wobble ? Math.sin(enemy.wobble * 2.1) * 0.35 : 0;
  const a = Math.atan2(dy, dx) + wob;
  enemy.vx += Math.cos(a) * speed * 3 * dt;
  enemy.vy += Math.sin(a) * speed * 3 * dt;
  const s = Math.hypot(enemy.vx, enemy.vy);
  if (s > speed) {
    enemy.vx = (enemy.vx / s) * speed;
    enemy.vy = (enemy.vy / s) * speed;
  }
}

export function updateEnemies(state, dt) {
  const p = state.player;
  for (const e of state.enemies) {
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.wobble += dt;
    if (e.kind === 'chaser' || e.kind === 'wisp') {
      steer(e, p.x, p.y, e.speed, dt, true);
    } else if (e.kind === 'shooter') {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const def = ENEMY.shooter;
      if (d > def.keepDistance + 40) steer(e, p.x, p.y, e.speed, dt, false);
      else if (d < def.keepDistance - 60) steer(e, 2 * e.x - p.x, 2 * e.y - p.y, e.speed, dt, false);
      else {
        e.vx *= Math.max(0, 1 - 3 * dt);
        e.vy *= Math.max(0, 1 - 3 * dt);
      }
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && p.alive) {
        e.fireTimer = def.fireInterval * (0.85 + state.random() * 0.3);
        spawnEnemyShot(state, e.x, e.y, Math.atan2(dy, dx), def.projSpeed);
        sfx.enemyHit();
      }
    } else if (e.kind === 'splitter') {
      steer(e, p.x, p.y, e.speed, dt, false);
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.x = Math.min(FIELD.width - e.radius, Math.max(e.radius, e.x));
    e.y = Math.min(FIELD.height - e.radius, Math.max(e.radius, e.y));
  }
  // Gentle separation so enemies do not stack on one point.
  for (let i = 0; i < state.enemies.length; i += 1) {
    for (let j = i + 1; j < state.enemies.length; j += 1) {
      const a = state.enemies[i];
      const b = state.enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rr = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.01 && d2 < rr * rr) {
        const d = Math.sqrt(d2);
        const push = (rr - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
  // Contact damage to the player.
  if (p.alive) {
    for (const e of state.enemies) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const rr = p.radius + e.radius - 2;
      if (dx * dx + dy * dy < rr * rr) {
        damagePlayer(state, 1, e.x, e.y);
        break;
      }
    }
  }
  // Remove the dead (damageEnemy marks hp <= 0; death is resolved here, once per frame).
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    if (state.enemies[i].hp <= 0) {
      const e = state.enemies[i];
      state.enemies.splice(i, 1);
      resolveDeath(state, e);
    }
  }
}

export function damageEnemy(state, enemy, dmg, angle) {
  if (enemy.hp <= 0) return;
  enemy.hp -= dmg;
  enemy.hitFlash = 0.09;
  const kb = enemy.kind === 'splitter' ? 40 : 130;
  enemy.vx += Math.cos(angle) * kb;
  enemy.vy += Math.sin(angle) * kb;
  sfx.enemyHit();
}

function resolveDeath(state, e) {
  // Combo: a kill inside the window raises the multiplier.
  if (state.time - state.lastKillTime < COMBO.window) state.combo = Math.min(COMBO.max, state.combo + 1);
  else state.combo = 1;
  state.lastKillTime = state.time;
  state.comboTimer = COMBO.window;
  const mult = 1 + (state.combo - 1) * COMBO.perKill;
  const points = Math.round(e.points * mult);
  state.score += points;
  state.kills += 1;
  floatText(state, e.x, e.y - 10, '+' + points, state.combo >= 4 ? PALETTE.shard : PALETTE.text);
  burst(state, e.x, e.y, e.color, e.kind === 'splitter' ? 26 : 16, 260, 0.55, 4);
  sfx.explosion();
  dropShards(state, e.x, e.y, e.kind === 'splitter' ? 3 : e.kind === 'shooter' ? 2 : 1);
  if (e.kind === 'splitter') {
    spawnEnemy(state, 'wisp', e.x - 18, e.y);
    spawnEnemy(state, 'wisp', e.x + 18, e.y);
  } else if (e.kind === 'shooter' && state.wave.number >= 4 && state.random() < 0.12) {
    dropHeart(state, e.x, e.y);
  }
}

export function drawEnemies(ctx, state) {
  // Glow pass first (pre-rendered sprites, 'lighter'), then the shapes: neon without shadowBlur.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of state.enemies) {
    drawGlow(ctx, glowSprite(e.color, e.radius + 26), e.x, e.y, 1, 0.75);
  }
  ctx.restore();
  for (const e of state.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
    if (e.kind === 'chaser' || e.kind === 'wisp') {
      // Spiked wisp: a circle with teeth.
      ctx.beginPath();
      const spikes = e.kind === 'wisp' ? 6 : 8;
      for (let i = 0; i < spikes * 2; i += 1) {
        const a = (i / (spikes * 2)) * Math.PI * 2 + state.time * 1.5;
        const r = i % 2 === 0 ? e.radius : e.radius * 0.62;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a0b12';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'shooter') {
      // Diamond with a core.
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-e.radius * 0.75, -e.radius * 0.75, e.radius * 1.5, e.radius * 1.5);
      ctx.fillStyle = '#fff2d6';
      ctx.fillRect(-4, -4, 8, 8);
    } else {
      // Splitter: a big ring with a pulsing core.
      ctx.lineWidth = 5;
      ctx.strokeStyle = e.color;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = e.color;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.55 + Math.sin(state.time * 5) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Health pips for tough enemies.
    if (e.maxHp > 2 && e.hp < e.maxHp) {
      ctx.fillStyle = '#ffffff';
      const w = e.radius * 1.6;
      ctx.fillRect(-w / 2, -e.radius - 10, w * (e.hp / e.maxHp), 3);
    }
    ctx.restore();
  }
}
