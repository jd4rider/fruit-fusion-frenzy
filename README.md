# Fruit Fusion Frenzy

A physics fruit-merging arcade game for [Little Joy Arcade](https://littlejoyarcade.site), built with Phaser 3, TypeScript, Vite and Matter.js.

**Drop it. Merge it. Unleash the frenzy!**

- Live build: <https://jd4rider.github.io/fruit-fusion-frenzy/play/>
- Journey: 500 levels across ten themed worlds, every one validated
- Arcade modes: Classic Endless, Fusion Blitz, Fusion Rush, Zen Garden, Daily Challenge

## The game

Fruit drops into a glass jar, bounces, rolls and settles. Two matching fruit that touch fuse into the next tier: blueberry → cherry → lime → apricot → peach → apple → pear → orange → grapefruit → melon → watermelon. Two watermelons trigger a **Golden Harvest** that clears them for a large bonus.

A single drop can set off a chain. Bigger chains pay more, and every fusion charges **Fusion Fever** — twelve seconds of double points. Fruit that rests above the dotted line fills the jar; if it stays there, the run ends.

### Modes

| Mode | Rule |
| --- | --- |
| Classic Endless | Play until the jar overflows |
| Fusion Blitz | Two minutes, maximum score |
| Fusion Rush | Complete five escalating missions |
| Zen Garden | No timer; the jar recycles itself instead of ending |
| Daily Challenge | A seeded ninety-second score chase, one per day |
| Puzzle Journey | 500 objective levels with a drop limit and star ratings |

### Controls

- **Touch** — drag over the jar to aim and release to drop, or switch to tap-twice in Settings
- **Keyboard** — A/D or arrows to aim, Space/Enter to drop, R to restart, P/Esc to pause
- **Gamepad** — left stick aims, A drops, Start pauses

## Engineering

The simulation lives in `src/game/` and is independent of Phaser:

- `physics.ts` — Matter world, fixed 60 Hz steps, transactional merge queue, chain tracking, Fusion Fever, overflow detection
- `session.ts` — mode rules, timers, drop limits, objectives, results
- `bot.ts` — deterministic autoplayer used to author Journey levels and validate them
- `journey.ts` — the generated, validated level catalogue
- `saves.ts` / `achievements.ts` — versioned local progress with input sanitising and cloud merge

Rendering (`src/phaser/`) reads snapshots from the simulation. All art — fruit, faces, jars, backdrops, logo — is drawn procedurally on canvas at runtime, and all audio is synthesised with the Web Audio API, so the game has no asset downloads.

### Merge safety

Matter collision callbacks never create or destroy bodies. A qualifying contact reserves both fruit, queues a merge request, and the request is resolved after the physics step. A per-step proximity scan catches pairs that touched before their short merge cooldown elapsed, so nothing can be merged twice and nothing can get stuck.

### Journey validation

`npm run levels` regenerates `src/data/journey.json`. For every level the autoplayer explores a run with no objective, records the drop where a milestone was reached, then replays the published level with its objective and drop limit. Only levels where the bot actually wins are written, with the winning aim sequence stored as evidence. `tests/journey.test.ts` replays every recorded solution on the production physics.

## Development

```bash
npm install
npm run dev        # http://localhost:5176
npm run test       # 35 unit, merge, journey replay and save tests
npm run typecheck
npm run build
npm run levels     # regenerate + validate all 500 Journey levels
```

## Deployment

GitHub Pages is the only deployment. `.github/workflows/pages.yml` runs the tests, builds the production bundle and publishes it to `/play/` on `jd4rider.github.io/fruit-fusion-frenzy`. The catalogue row lives in the arcade's `public.games` table (migration `0033_fruit_fusion_frenzy.sql`) and mirrors `arcade-manifest.json`.

The `public/arcade-client.js` drop-in mirrors the save key into a signed-in player's arcade account. When it is absent or offline the game plays normally and saves locally.

## Notes

Fruit Fusion Frenzy is an original Little Joy Arcade game inspired by the fruit-merging genre. All artwork, audio, level content and copy are original to this project.
