// The arena: the dark floor, the grid, the starfield, and the two light wells where energy
// recharges fast. The wells and the stars are fixed by the seeded random, so the same seed
// always draws the same arena.
import { FIELD, WELLS } from './config.js';
import { PALETTE } from './palette.js';
import { range } from './random.js';

export function createArena(random) {
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: range(random, 0, FIELD.width),
      y: range(random, 0, FIELD.height),
      r: range(random, 0.6, 2.1),
      tw: range(random, 0, Math.PI * 2),
      speed: range(random, 0.4, 1.4),
    });
  }
  // The well glow is painted once to an offscreen canvas and blitted each frame: a radial
  // gradient per well per frame would allocate and cost far more than this.
  const wellCanvas = document.createElement('canvas');
  const wellR = WELLS[0].r;
  wellCanvas.width = wellR * 2 + 8;
  wellCanvas.height = wellR * 2 + 8;
  const wg = wellCanvas.getContext('2d');
  const grad = wg.createRadialGradient(wellR + 4, wellR + 4, 4, wellR + 4, wellR + 4, wellR);
  grad.addColorStop(0, 'rgba(57, 217, 138, 0.28)');
  grad.addColorStop(0.7, 'rgba(57, 217, 138, 0.10)');
  grad.addColorStop(1, 'rgba(57, 217, 138, 0)');
  wg.fillStyle = grad;
  wg.fillRect(0, 0, wellCanvas.width, wellCanvas.height);
  // The vignette is painted once too: dark corners that frame the arena.
  const vigCanvas = document.createElement('canvas');
  vigCanvas.width = FIELD.width;
  vigCanvas.height = FIELD.height;
  const vg = vigCanvas.getContext('2d');
  const vgrad = vg.createRadialGradient(
    FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
    FIELD.width / 2, FIELD.height / 2, FIELD.width * 0.62,
  );
  vgrad.addColorStop(0, 'rgba(4, 6, 12, 0)');
  vgrad.addColorStop(1, 'rgba(4, 6, 12, 0.55)');
  vg.fillStyle = vgrad;
  vg.fillRect(0, 0, FIELD.width, FIELD.height);
  return { stars, wells: WELLS.map((w) => ({ ...w })), wellCanvas, vigCanvas };
}

export function isInWell(arena, x, y) {
  for (const w of arena.wells) {
    const dx = x - w.x;
    const dy = y - w.y;
    if (dx * dx + dy * dy < w.r * w.r) return true;
  }
  return false;
}

export function drawArena(ctx, arena, time) {
  ctx.fillStyle = PALETTE.arena;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Starfield with a slow twinkle.
  for (const s of arena.stars) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * s.speed + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = PALETTE.star;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Faint grid.
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 80; x < FIELD.width; x += 80) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD.height);
  }
  for (let y = 80; y < FIELD.height; y += 80) {
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.width, y);
  }
  ctx.stroke();
  // Arena edge.
  ctx.strokeStyle = PALETTE.arenaEdge;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, FIELD.width - 4, FIELD.height - 4);
  // Light wells: the pre-rendered glow blitted, plus a pulsing ring and core.
  for (const w of arena.wells) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.6 + w.x);
    const size = arena.wellCanvas.width;
    ctx.drawImage(arena.wellCanvas, w.x - size / 2, w.y - size / 2);
    ctx.strokeStyle = PALETTE.well;
    ctx.globalAlpha = 0.45 + 0.35 * pulse;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.well;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 4 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Vignette, painted once at boot.
  ctx.drawImage(arena.vigCanvas, 0, 0);
}
