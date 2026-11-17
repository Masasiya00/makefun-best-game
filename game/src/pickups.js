// Pickups: light shards (score + energy) dropped by every enemy, and rare hearts (wave 4+)
// that restore one hit. Shards drift, magnet toward the player when close, and expire.
import { FIELD, SHARD, ENERGY } from './config.js';
import { PALETTE } from './palette.js';
import { burst, floatText } from './particles.js';
import { glowSprite, drawGlow } from './sprites.js';
import { sfx } from './audio.js';
import { range } from './random.js';

export function dropShards(state, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const a = state.random() * Math.PI * 2;
    const d = range(state.random, 8, 34);
    state.shards.push({
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d,
      vx: Math.cos(a) * 60,
      vy: Math.sin(a) * 60,
      life: SHARD.life,
      spin: state.random() * Math.PI * 2,
    });
  }
}

export function dropHeart(state, x, y) {
  state.hearts2.push({ x, y, life: 12, spin: 0 });
}

export function updatePickups(state, dt) {
  const p = state.player;
  for (let i = state.shards.length - 1; i >= 0; i -= 1) {
    const s = state.shards[i];
    s.life -= dt;
    s.spin += dt * 4;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    if (p.alive && d < SHARD.magnet) {
      const pull = 900 * (1 - d / SHARD.magnet) + 120;
      s.vx += (dx / d) * pull * dt;
      s.vy += (dy / d) * pull * dt;
    }
    s.vx *= Math.max(0, 1 - 3 * dt);
    s.vy *= Math.max(0, 1 - 3 * dt);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.x = Math.min(FIELD.width - 8, Math.max(8, s.x));
    s.y = Math.min(FIELD.height - 8, Math.max(8, s.y));
    if (p.alive && d < SHARD.collect) {
      state.shards.splice(i, 1);
      state.score += SHARD.points;
      state.energy = Math.min(ENERGY.max, state.energy + ENERGY.shard);
      burst(state, s.x, s.y, PALETTE.shard, 5, 120, 0.3, 2.5);
      sfx.pickup();
      continue;
    }
    if (s.life <= 0) state.shards.splice(i, 1);
  }
  for (let i = state.hearts2.length - 1; i >= 0; i -= 1) {
    const h = state.hearts2[i];
    h.life -= dt;
    h.spin += dt * 3;
    const dx = p.x - h.x;
    const dy = p.y - h.y;
    const d = Math.hypot(dx, dy) || 1;
    if (p.alive && d < 30) {
      state.hearts2.splice(i, 1);
      if (state.hearts < 3) {
        state.hearts += 1;
        floatText(state, h.x, h.y - 12, '+1 ♥', PALETTE.heart);
      } else {
        state.score += 150;
        floatText(state, h.x, h.y - 12, '+150', PALETTE.shard);
      }
      sfx.heart();
      burst(state, h.x, h.y, PALETTE.heart, 10, 160, 0.4, 3);
      continue;
    }
    if (h.life <= 0) state.hearts2.splice(i, 1);
  }
}

export function drawPickups(ctx, state) {
  // Glow pass (pre-rendered sprites, 'lighter'), then the shapes: neon without shadowBlur.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const shardGlow = glowSprite(PALETTE.shard, 16);
  for (const s of state.shards) {
    drawGlow(ctx, shardGlow, s.x, s.y, 1, 0.8);
  }
  const heartGlow = glowSprite(PALETTE.heart, 22);
  for (const h of state.hearts2) {
    drawGlow(ctx, heartGlow, h.x, h.y, 1, 0.85);
  }
  ctx.restore();
  for (const s of state.shards) {
    const blink = s.life < 3 && Math.floor(state.time * 6) % 2 === 0;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.spin);
    ctx.globalAlpha = blink ? 0.35 : 1;
    ctx.fillStyle = PALETTE.shard;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  for (const h of state.hearts2) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(Math.sin(h.spin) * 0.3);
    ctx.fillStyle = PALETTE.heart;
    const r = 9;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.9);
    ctx.bezierCurveTo(-r * 1.3, -r * 0.2, -r * 0.6, -r, 0, -r * 0.35);
    ctx.bezierCurveTo(r * 0.6, -r, r * 1.3, -r * 0.2, 0, r * 0.9);
    ctx.fill();
    ctx.restore();
  }
}
