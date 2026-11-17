// All drawing of the world, the HUD and the screens. The world is painted in layers
// (arena, pickups, enemies, bullets, player, particles, nova, flash), the HUD sits on top
// in screen space, and the title / pause / game-over screens are panels over a dimmed world.
import { FIELD, PLAYER, ENERGY } from './config.js';
import { PALETTE, FONT, FONT_MONO } from './palette.js';
import { drawArena } from './arena.js';
import { drawPlayer } from './player.js';
import { drawEnemies } from './enemies.js';
import { drawBullets } from './bullets.js';
import { drawPickups } from './pickups.js';
import { drawParticles } from './particles.js';
import { enemiesLeft } from './waves.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function drawWorld(ctx, state) {
  ctx.save();
  ctx.translate(state.shakeX, state.shakeY);
  drawArena(ctx, state.arena, state.time);
  drawPickups(ctx, state);
  drawEnemies(ctx, state);
  drawBullets(ctx, state);
  drawPlayer(ctx, state);
  drawParticles(ctx, state);
  // Nova shockwave: a bright expanding ring with a faint fill, so it reads as a blast, not a blob.
  if (state.novaFx) {
    const n = state.novaFx;
    const p = Math.min(1, n.t / 0.45);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.95 * (1 - p);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4 * (1 - p) + 1.5;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.maxR * p + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.16 * (1 - p);
    ctx.fillStyle = PALETTE.nova;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.maxR * p, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // Damage / nova flash over everything.
  if (state.flash > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.6, state.flash);
    ctx.fillStyle = state.flashColor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
  }
  // Low-health pulse: a red edge that breathes when one heart is left.
  if (state.screen === SCREEN_PLAY && state.hearts === 1 && state.player.alive) {
    const a = 0.10 + 0.08 * Math.sin(state.time * 5);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 77, 94, ${a})`;
    ctx.lineWidth = 26;
    ctx.strokeRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
  }
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function centreText(ctx, text, x, y, font, color) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawHeartShape(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.9);
  ctx.bezierCurveTo(-r * 1.3, -r * 0.2, -r * 0.6, -r, 0, -r * 0.35);
  ctx.bezierCurveTo(r * 0.6, -r, r * 1.3, -r * 0.2, 0, r * 0.9);
  ctx.fill();
  ctx.restore();
}

export function drawHUD(ctx, state) {
  const pad = 20;
  // Score, top-left.
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '600 13px ' + FONT;
  ctx.fillText('SCORE', pad, pad);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '800 34px ' + FONT_MONO;
  ctx.fillText(String(state.score).padStart(6, '0'), pad, pad + 16);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '600 13px ' + FONT;
  ctx.fillText('BEST  ' + String(Math.max(state.best, state.score)).padStart(6, '0'), pad, pad + 56);
  // Wave, top-centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '600 13px ' + FONT;
  ctx.fillText('WAVE', FIELD.width / 2, pad);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '800 30px ' + FONT_MONO;
  ctx.fillText(String(state.wave.number), FIELD.width / 2, pad + 16);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '600 13px ' + FONT;
  ctx.fillText(enemiesLeft(state) + ' wisps left', FIELD.width / 2, pad + 52);
  // Hearts, top-right.
  for (let i = 0; i < 3; i += 1) {
    const hx = FIELD.width - pad - 14 - i * 34;
    drawHeartShape(ctx, hx, pad + 16, 11, i < state.hearts ? PALETTE.heart : '#2a3040');
  }
  // Combo, under the hearts.
  if (state.combo >= 2) {
    const mult = (1 + (state.combo - 1) * 0.25).toFixed(2).replace(/\.?0+$/, '');
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.shard;
    ctx.font = '800 22px ' + FONT_MONO;
    ctx.fillText('x' + mult + '  COMBO ' + state.combo, FIELD.width - pad, pad + 44);
    const cw = 150;
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(FIELD.width - pad - cw, pad + 70, cw, 5);
    ctx.fillStyle = PALETTE.shard;
    ctx.fillRect(FIELD.width - pad - cw, pad + 70, cw * Math.max(0, state.comboTimer / 2.5), 5);
  }
  // Energy bar, bottom-left, with dash / nova cost ticks.
  const bw = 260;
  const bx = pad;
  const by = FIELD.height - pad - 26;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '600 13px ' + FONT;
  ctx.fillText('ENERGY', bx, by - 18);
  ctx.fillStyle = '#1a2340';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, 14, 7);
  ctx.fill();
  const frac = state.energy / ENERGY.max;
  const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
  grad.addColorStop(0, '#2dd4ff');
  grad.addColorStop(1, '#4de8ff');
  ctx.fillStyle = grad;
  if (frac > 0) {
    ctx.beginPath();
    ctx.roundRect(bx, by, Math.max(14, bw * frac), 14, 7);
    ctx.fill();
  }
  // Cost ticks: dash 25, nova 60.
  ctx.fillStyle = 'rgba(7, 10, 22, 0.9)';
  ctx.fillRect(bx + (bw * PLAYER.dashCost) / ENERGY.max - 1, by - 2, 2, 18);
  ctx.fillRect(bx + (bw * PLAYER.novaCost) / ENERGY.max - 1, by - 2, 2, 18);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '600 11px ' + FONT;
  ctx.fillText('SHIFT dash 25', bx + (bw * PLAYER.dashCost) / ENERGY.max + 4, by + 26);
  ctx.fillText('SPACE nova 60', bx + (bw * PLAYER.novaCost) / ENERGY.max + 4, by + 26);
  ctx.restore();
  // Wave banner, centre.
  if (state.banner && state.banner.t > 0) {
    const a = Math.min(1, state.banner.t / 0.4, (2.2 - state.banner.t) / 0.4 + 0.6);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    centreText(ctx, state.banner.text, FIELD.width / 2, 150, '800 54px ' + FONT, PALETTE.text);
    if (state.banner.sub) {
      centreText(ctx, state.banner.sub, FIELD.width / 2, 196, '600 18px ' + FONT, PALETTE.muted);
    }
    ctx.restore();
  }
}

export function drawTitle(ctx, state, best) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 18, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.restore();
  centreText(ctx, 'LUMEN DRIFT', FIELD.width / 2, 168, '800 84px ' + FONT, PALETTE.player);
  centreText(ctx, 'a neon arena survival', FIELD.width / 2, 226, '600 22px ' + FONT, PALETTE.muted);
  panel(ctx, FIELD.width / 2 - 330, 268, 660, 218);
  const lines = [
    ['WASD / arrows', 'move'],
    ['Mouse', 'aim — hold click to fire'],
    ['SHIFT', 'dash  (25 energy, brief invulnerability)'],
    ['SPACE', 'nova bomb  (60 energy, clears the near field)'],
    ['P / ESC', 'pause      ·      M mute'],
  ];
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((row, i) => {
    const y = 300 + i * 34;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 17px ' + FONT_MONO;
    ctx.fillText(row[0], FIELD.width / 2 - 300, y);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 16px ' + FONT;
    ctx.fillText(row[1], FIELD.width / 2 - 150, y);
  });
  ctx.restore();
  centreText(ctx, 'Survive the waves. Collect the light. Do not let the dark take you.', FIELD.width / 2, 520, '600 17px ' + FONT, PALETTE.text);
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  centreText(ctx, 'CLICK  or  press  SPACE  to start', FIELD.width / 2, 566, '800 24px ' + FONT, PALETTE.shard);
  ctx.restore();
  if (best > 0) {
    centreText(ctx, 'BEST  ' + String(best).padStart(6, '0'), FIELD.width / 2, 612, '600 16px ' + FONT_MONO, PALETTE.muted);
  }
}

export function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 18, 0.66)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.restore();
  centreText(ctx, 'PAUSED', FIELD.width / 2, 300, '800 64px ' + FONT, PALETTE.text);
  centreText(ctx, 'P / ESC  or  click  to resume  ·  R  to restart', FIELD.width / 2, 372, '600 19px ' + FONT, PALETTE.muted);
}

export function drawGameOver(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 10, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.restore();
  centreText(ctx, 'SIGNAL LOST', FIELD.width / 2, 176, '800 72px ' + FONT, PALETTE.danger);
  centreText(ctx, 'the dark took the Lumen', FIELD.width / 2, 232, '600 20px ' + FONT, PALETTE.muted);
  panel(ctx, FIELD.width / 2 - 260, 272, 520, 196);
  const over = state.over || { score: state.score, wave: state.wave.number, best: state.best };
  const rows = [
    ['SCORE', String(over.score)],
    ['WAVE REACHED', String(over.wave)],
    ['BEST', String(over.best)],
  ];
  ctx.save();
  ctx.textBaseline = 'middle';
  rows.forEach((row, i) => {
    const y = 308 + i * 52;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '600 16px ' + FONT;
    ctx.fillText(row[0], FIELD.width / 2 - 220, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '800 30px ' + FONT_MONO;
    ctx.fillText(row[1], FIELD.width / 2 + 220, y);
  });
  ctx.restore();
  if (over.isNewBest) {
    centreText(ctx, '★  NEW BEST  ★', FIELD.width / 2, 500, '800 24px ' + FONT, PALETTE.shard);
  }
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  centreText(ctx, 'R  or  click  to play again', FIELD.width / 2, 548, '800 22px ' + FONT, PALETTE.text);
  ctx.restore();
}
