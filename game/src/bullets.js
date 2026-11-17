// Projectiles: the player's light bolts and the Shooters' slow orbs. Both live in fixed
// pools allocated once: spawning reuses a dead slot, so firing never allocates per frame.
// Bolts damage the first enemy they touch; orbs drift and hurt the player on contact.
import { FIELD, PLAYER } from './config.js';
import { PALETTE } from './palette.js';
import { damageEnemy } from './enemies.js';
import { damagePlayer } from './player.js';
import { burst } from './particles.js';
import { glowSprite, drawGlow } from './sprites.js';
import { MAX_BOLTS, MAX_EBULLETS } from './state.js';

export function spawnBolt(state, x, y, angle) {
  for (let i = 0; i < MAX_BOLTS; i += 1) {
    const b = state.bolts[i];
    if (b.alive) continue;
    b.alive = true;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * PLAYER.boltSpeed;
    b.vy = Math.sin(angle) * PLAYER.boltSpeed;
    b.radius = PLAYER.boltRadius;
    return;
  }
}

export function spawnEnemyShot(state, x, y, angle, speed) {
  for (let i = 0; i < MAX_EBULLETS; i += 1) {
    const b = state.ebullets[i];
    if (b.alive) continue;
    b.alive = true;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.radius = 7;
    b.life = 5;
    return;
  }
}

export function updateBullets(state, dt) {
  for (const b of state.bolts) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
    if (!dead) {
      for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.radius + b.radius;
        if (dx * dx + dy * dy < rr * rr) {
          damageEnemy(state, e, 1, Math.atan2(b.vy, b.vx));
          burst(state, b.x, b.y, PALETTE.bolt, 4, 120, 0.2, 2.5);
          dead = true;
          break;
        }
      }
    }
    if (dead) b.alive = false;
  }
  const p = state.player;
  for (const b of state.ebullets) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20;
    if (!dead && p.alive) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const rr = p.radius + b.radius;
      if (dx * dx + dy * dy < rr * rr) {
        damagePlayer(state, 1, b.x, b.y);
        dead = true;
      }
    }
    if (dead) b.alive = false;
  }
}

export function drawBullets(ctx, state) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const boltGlow = glowSprite(PALETTE.bolt, 14);
  for (const b of state.bolts) {
    if (!b.alive) continue;
    drawGlow(ctx, boltGlow, b.x, b.y, 1, 0.9);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const orbGlow = glowSprite(PALETTE.enemyBullet, 16);
  for (const b of state.ebullets) {
    if (!b.alive) continue;
    drawGlow(ctx, orbGlow, b.x, b.y, 1, 0.9);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff2d6';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
