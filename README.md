[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Masasiya00/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Masasiya00/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# LUMEN DRIFT — a neon arena survival game

A top-down arena survival game in plain 2D canvas, built for make.fun's
`best-game-01` bounty ("Make the best game").

You are the Lumen, a small light-ship alone in a dark arena. Void wisps
spawn in growing waves and hunt you. Survive as long as you can, score as
high as you can.

## Play

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Open the page, click to start, and fight:

- **WASD / arrows** move · **Mouse** aim · **Hold click** fire
- **Shift** dash (25 energy, brief invulnerability) · **Space** nova bomb (60 energy, clears the near field)
- **P / Esc** pause · **M** mute · **R** restart on the game-over screen

## The game

- **Enemies** — three kinds, unlocking by wave: Chasers (fast, hunt you), Shooters (keep their distance, fire slow orbs, from wave 3), Splitters (slow and tough, split into two small wisps on death, from wave 5). Waves grow in count and speed; clearing one pays a bonus and a short breather.
- **Energy** — powers dash and nova. It recharges slowly, faster inside the two green light wells on the arena floor, and faster still from light shards.
- **Shards** — enemies drop light shards; collect them for score and energy. A rare heart pickup (wave 4+) restores one of your three hearts.
- **Score + combo** — each kill pays points times a combo multiplier that rises on quick successive kills and decays after ~2.5 s without one. Your best score is saved in the browser.
- **Feel** — procedural WebAudio sounds (shoot, hit, explosion, pickup, wave clear, game over), particles, screen shake, a nova shockwave, damage flash and a low-health pulse. All art is procedural canvas shapes with pre-rendered neon glow; nothing is downloaded, no network.
- **Performance** — fixed 1/60 s simulation, object pools for bullets and particles, pre-rendered glow sprites instead of per-frame `shadowBlur`, no per-frame allocation in the hot loop. It holds 60 fps on a modest machine.

## Layout

- `game/` — the static game (ES modules, no engine, no build step)
  - `game/src/` — `main.js` (loop + screens), `state.js` (world state + pools), `player.js`, `enemies.js`, `bullets.js`, `pickups.js`, `waves.js`, `particles.js`, `audio.js` (procedural WebAudio), `hud.js` (world + HUD + screens), `input.js`, `arena.js` (wells + starfield), `palette.js`, `sprites.js` (pre-rendered glow), `random.js` (seeded RNG), `shots.js` (deterministic captures)
- `main.ts` — copies `game/` + `screenshots/` to `/output` and writes `dossier.json` (run: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`)
- `screenshots/` — 4 real renders: title, mid-play, nova bomb, game over
- `serve.ts` — static dev server for `game/` on port 8080
- `shots.json` — the deterministic capture list (`?shot=start|play|nova|end`)

Deterministic captures: `?shot=<name>&seed=1` renders a fixed frame and
sets `window.__shotReady`; `window.__lumen.snapshot()` reports live state
for automated playtests.

## License

MIT — see `LICENSE`.
