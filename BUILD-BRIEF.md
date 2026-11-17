# BUILD BRIEF — LUMEN DRIFT (best-game-01)

Build an original 2D arena survival game for make.fun's `best-game-01` bounty ("Make the best game", $1,000, deadline 2026-11-19 01:00 WIB). Repo: **Masasiya00/makefun-best-game** (public, created 2026-11-17T00:16:17Z, after opening 2026-11-15T18:00Z). Kit: `~/workspace/makefun/best-game-01-kit/best-game-01-kit/`. Build dir: `~/workspace/makefun-best-game-build`.

## The game: LUMEN DRIFT
A neon top-down arena survival game. You are the Lumen, a small light-ship, alone in a dark arena. Void wisps spawn in waves and hunt you. Survive as long as you can, score as high as you can.

- **Move:** WASD / arrow keys. **Aim:** mouse. **Shoot:** hold left mouse (auto-fire, hitscan/projectile bolts). **Dash:** Shift (short burst + brief invulnerability, costs energy). **Nova bomb:** Space (clears nearby enemies, costs a lot of energy, screen flash + shake).
- **Enemies (3 types, unlock by wave):** Chaser (fast, follows you), Shooter (keeps distance, fires slow projectiles), Splitter (slow, splits into 2 small wisps on death). Waves grow: more enemies, faster, new types from wave 3 (Shooter) and wave 5 (Splitter). Wave-clear bonus + brief breather.
- **Energy:** powers Dash + Nova. Recharges slowly over time, faster inside the two "light wells" (glowing zones on the arena floor), and +energy from light shards. **Shards:** enemies drop light shards; collect for score + energy. **Health:** 3 hits; a hit costs 1 heart + brief invulnerability + knockback. Rare heart pickup (wave 4+).
- **Score + combo:** each kill = points x combo multiplier; combo rises on quick successive kills, decays after ~2.5s without a kill. Best score saved in localStorage.
- **HUD:** score, best, wave, enemies left, hearts, energy bar, combo meter. Wave banner on each new wave. Damage flash + low-health pulse.
- **Screens:** Start/title (name, how to play, click to start), Pause (P or Esc, resume/restart), Game Over (final score, best, wave reached, restart with R or click). Mute with M.
- **Feel:** procedural WebAudio sounds (shoot, hit, pickup, explosion, wave clear, game over) — no audio files. Particles (explosions, trails, shard sparkles), screen shake on nova/death, glow via shadowBlur. Starfield background + subtle vignette.
- **Look:** coherent neon palette — deep dark-blue arena (#0b1020), cyan player (#4de8ff), magenta/orange enemies (#ff4d7e / #ff9a3d), gold shards (#ffd75e), green light wells. All art procedural (canvas shapes + glow), nothing downloaded, no network.

## Technical (hard constraints)
- Static files under `game/`, no build step. `game/index.html` opens in desktop Chrome and plays with **no network request**. Every script/image/sound/font is a file under `game/` or a `data:` URI.
- Plain 2D canvas (no engine needed; do NOT vendor three.js — this is a 2D game). ES modules, split into files with one clear job each, named for what they do: `main.js` (loop + screens), `player.js`, `enemies.js`, `bullets.js`, `pickups.js`, `waves.js`, `particles.js`, `audio.js` (procedural WebAudio), `hud.js`, `input.js`, `arena.js` (wells + background), `palette.js`.
- `main.ts` at the repo root copies `game/` + `screenshots/` to `/output` and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-game.ts` (copy the kit starter's main.ts + vendor file; adapt paths, keep the library unchanged). Run locally: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
- `screenshots/` — 3 or 4 real renders, 1280x800, each ≤256 KiB: start/title, mid-play with HUD + action, nova bomb moment, game over screen. First by name is the cover. Deterministic captures: `?shot=<name>&seed=1` renders a fixed frame and sets `window.__shotReady`; `window.__lumen.snapshot()` reports live state for automated playtests.
- `LICENSE` MIT at root. `.makefun/owner.json` in the first commit: `{"wallet": "DrhbBJ4F1N5V49DjbGnhSqUG3asV1VCEtHn1PxvRNFsB"}`.
- `README.md` at root: game description + how to play + the three make.fun badges for best-game-01 + link to https://make.fun/bounty/best-game-01. Repo About (set after push): homepage https://make.fun/bounty/best-game-01, topics makefun,ai-agents,bounties,games.
- `serve.ts` — tiny static dev server for `game/` on port 8080 (copy the pattern from the FPS build's serve.ts).
- `shots.json` — the deterministic capture list (`?shot=start|play|nova|end`).

## Verification (do this before you call the build done)
- `node --check` on every `.js` file. `node main.ts` with MAKEFUN_OUTPUT_DIR=out must succeed and write dossier.json.
- Headless playtest (puppeteer + Chrome, SwiftShader): load `?shot=play&seed=1`, wait for `window.__shotReady`, confirm `window.__lumen.snapshot()` shows a live round (phase, wave, health, score) and **0 console errors**. Fix any 404 (e.g. add an inline SVG favicon so /favicon.ico does not 404).
- Screenshots must be real renders of the game (take them headless from the deterministic shots), never edited or borrowed.

## Hard stop
Finish the build, the playtest and the screenshots, then push to Masasiya00/makefun-best-game and report. Do NOT submit (the main agent bundles, checks and submits). If you cannot finish, report exactly what is done and what is missing.
