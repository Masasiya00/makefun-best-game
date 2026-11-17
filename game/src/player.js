// The Lumen: a small light-ship. Moves with acceleration + friction, aims at the mouse, fires
// bolts while the button is held, dashes (burst + brief invulnerability, costs energy) and fires
// a nova bomb (clears nearby enemies, costs a lot of energy).
import { FIELD, PLAYER, ENERGY } from './config.js';
import { PALETTE } from './palette.js';
import { spawnBolt } from './bullets.js';
import { damageEnemy } from './enemies.js';
import { burst, trail, addShake } from './particles.js';
import { glowSprite, drawGlow } from './sprites.js';
import { sfx } from './audio.js';
import { isInWell } from './arena.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    invuln: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: -1,
    fireCooldown: 0,
    trailTimer: 0,
    alive: true,
  };
}

export function updatePlayer(state, dt, input, actions) {
  const p = state.player;
  if (!p.alive) return;
  const move = input.move();
  const aim = input.aim();
  p.angle = Math.atan2(aim.y - p.y, aim.x - p.x);

  if (actions & 4) { // ACTION_DASH
    if (state.energy >= PLAYER.dashCost && p.dashCooldown <= 0 && (move.x !== 0 || move.y !== 0)) {
      state.energy -= PLAYER.dashCost;
      p.dashTime = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown;
      p.dashDirX = move.x;
      p.dashDirY = move.y;
      p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.12);
      sfx.dash();
      burst(state, p.x, p.y, PALETTE.player, 8, 160, 0.3, 3);
    }
  }
  if (actions & 8) { // ACTION_NOVA
    if (state.energy >= PLAYER.novaCost) {
      state.energy -= PLAYER.novaCost;
      fireNova(state);
    }
  }

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.vx = p.dashDirX * PLAYER.dashSpeed;
    p.vy = p.dashDirY * PLAYER.dashSpeed;
  } else {
    p.vx += move.x * PLAYER.accel * dt;
    p.vy += move.y * PLAYER.accel * dt;
    const drag = Math.max(0, 1 - PLAYER.friction * dt);
    p.vx *= drag;
    p.vy *= drag;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > PLAYER.maxSpeed) {
      p.vx = (p.vx / speed) * PLAYER.maxSpeed;
      p.vy = (p.vy / speed) * PLAYER.maxSpeed;
    }
  }
  p.x = Math.min(FIELD.width - p.radius, Math.max(p.radius, p.x + p.vx * dt));
  p.y = Math.min(FIELD.height - p.radius, Math.max(p.radius, p.y + p.vy * dt));
  if (p.x === p.radius || p.x === FIELD.width - p.radius) p.vx = 0;
  if (p.y === p.radius || p.y === FIELD.height - p.radius) p.vy = 0;

  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);

  // Energy: slow recharge, faster inside a light well.
  const inWell = isInWell(state.arena, p.x, p.y);
  state.energy = Math.min(ENERGY.max, state.energy + (inWell ? ENERGY.wellRegen : ENERGY.regen) * dt);

  // Firing: hold to shoot, one bolt per interval from the nose.
  p.fireCooldown -= dt;
  if (input.isFiring() && p.fireCooldown <= 0) {
    p.fireCooldown = PLAYER.fireInterval;
    const nx = p.x + Math.cos(p.angle) * (p.radius + 6);
    const ny = p.y + Math.sin(p.angle) * (p.radius + 6);
    spawnBolt(state, nx, ny, p.angle);
    sfx.shoot();
  }

  // Engine trail.
  p.trailTimer -= dt;
  if (p.trailTimer <= 0) {
    p.trailTimer = 0.05;
    const bx = p.x - Math.cos(p.angle) * p.radius;
    const by = p.y - Math.sin(p.angle) * p.radius;
    trail(state, bx, by, PALETTE.player);
  }
}

function fireNova(state) {
  const p = state.player;
  state.novaFx = { x: p.x, y: p.y, t: 0, maxR: PLAYER.novaRadius };
  state.flash = 0.32;
  state.flashColor = PALETTE.nova;
  addShake(state, 12);
  sfx.nova();
  for (const e of state.enemies) {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    if (dx * dx + dy * dy < PLAYER.novaRadius * PLAYER.novaRadius) {
      damageEnemy(state, e, PLAYER.novaDamage, Math.atan2(dy, dx));
    }
  }
}

export function damagePlayer(state, amount, fromX, fromY) {
  const p = state.player;
  if (!p.alive || p.invuln > 0) return false;
  state.hearts -= amount;
  p.invuln = PLAYER.invulnerable;
  state.flash = 0.5;
  state.flashColor = PALETTE.danger;
  state.combo = 0;
  state.comboTimer = 0;
  addShake(state, 9);
  sfx.hurt();
  burst(state, p.x, p.y, PALETTE.danger, 14, 260, 0.5, 4);
  const dx = p.x - fromX;
  const dy = p.y - fromY;
  const d = Math.hypot(dx, dy) || 1;
  p.vx += (dx / d) * PLAYER.knockback;
  p.vy += (dy / d) * PLAYER.knockback;
  if (state.hearts <= 0) {
    p.alive = false;
    burst(state, p.x, p.y, PALETTE.player, 40, 340, 0.9, 5);
    burst(state, p.x, p.y, PALETTE.nova, 24, 220, 0.7, 4);
    addShake(state, 14);
    sfx.explosion();
  }
  return true;
}

export function drawPlayer(ctx, state) {
  const p = state.player;
  if (!p.alive) return;
  const blink = p.invuln > 0 && Math.floor(state.time * 14) % 2 === 0;
  // Glow first (pre-rendered sprite, 'lighter'), then the hull on top: neon without shadowBlur.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, glowSprite(PALETTE.player, 46), p.x, p.y, 1, blink ? 0.35 : 0.85);
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.globalAlpha = blink ? 0.45 : 1;
  // Hull: a dart.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  // Core.
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
