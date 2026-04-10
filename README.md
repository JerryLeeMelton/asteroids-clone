# Reacteroids

A faithful clone of the 1979 Atari arcade classic **Asteroids**, built in TypeScript and React. Rendered with the HTML5 Canvas 2D API — no game engine, no physics library, no sprite sheets. Every line, particle, and explosion is drawn by hand.

## Features

- **Vector-style rendering** — wireframe ship, jagged asteroids, and thrust flame drawn procedurally each frame
- **Full arcade feature set** — rotation, thrust with inertia, screen wrap, hyperspace, 4-bullet limit, and progressive waves
- **Flying saucers** — large and small UFOs that hunt the player and fire back
- **CRT post-processing shader** — scanlines, RGB grille, barrel distortion, vignette, phosphor glow, and signal noise (pure Canvas 2D, no WebGL)
- **Classic 3-letter high score entry** with a local leaderboard (localStorage) or optional server-backed global leaderboard
- **Sound effects** — thrust loop, shooting, explosions, saucer alerts, extra life (optional, toggle with `audioEnabled`)
- **Wave announcements**, extra life at 10,000 points, and period-accurate scoring
- **Zero runtime dependencies** beyond React — the game code is pure TypeScript

## Architecture

The codebase cleanly separates concerns so the game logic is fully portable:

```
src/
├── components/
│   └── AsteroidsGame.tsx    React component — owns the canvas, RAF loop, and input
└── game/
    ├── types.ts              Entity types, enums, and tunable constants
    ├── engine.ts             Pure update logic (no DOM, no React)
    ├── renderer.ts           Canvas 2D draw routines
    ├── crt.ts                Post-processing CRT filter
    ├── audio.ts              Sound effect manager with per-effect pools
    └── scores.ts             High score persistence (localStorage + optional API)
```

The engine is a pure function: `updateGame(state, keys, dt)` mutates a plain `GameState` object. You could swap out React for Vue, Svelte, or a `<canvas>` in a plain HTML page without touching a single line of game logic.

## Usage

### As a standalone app

```bash
yarn install
yarn start
```

Open [http://localhost:3000](http://localhost:3000).

### As a React component

```tsx
import AsteroidsGame from './components/AsteroidsGame';

<AsteroidsGame
  width={800}
  height={600}
  crtEnabled={true}
  audioEnabled={true}
  scoresApiUrl="/api/asteroids/scores"  // optional — falls back to localStorage
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number` | `800` | Canvas width in pixels |
| `height` | `number` | `600` | Canvas height in pixels |
| `crtEnabled` | `boolean` | `true` | Toggle CRT post-processing filter |
| `crtOptions` | `Partial<CRTOptions>` | — | Fine-tune scanlines, curvature, glow, etc. |
| `audioEnabled` | `boolean` | `false` | Enable sound effects |
| `audioOptions` | `Partial<AudioOptions>` | — | Audio base path, extension, volume |
| `scoresApiUrl` | `string` | — | Optional leaderboard API endpoint |
| `className` | `string` | — | CSS class for the container |
| `style` | `CSSProperties` | — | Inline styles for the container |

### Next.js integration

The component uses browser-only APIs (`window`, `requestAnimationFrame`, `<canvas>`), so it must be loaded client-side only:

```tsx
import dynamic from 'next/dynamic';

const AsteroidsGame = dynamic(
  () => import('@/components/AsteroidsGame'),
  { ssr: false }
);
```

An App Router API route for a server-backed leaderboard is included at `app/api/asteroids/scores/route.ts`.

## Controls

| Key | Action |
|-----|--------|
| Left / Right Arrow | Rotate ship |
| Up Arrow | Thrust |
| Space | Fire |
| Shift | Hyperspace (risky — you may reappear inside a rock) |
| Enter | Start game / advance screens |
| H | View high scores from the title screen |

Click the game to focus it before playing.

## Scoring

| Target | Points |
|--------|--------|
| Large asteroid | 20 |
| Medium asteroid | 50 |
| Small asteroid | 100 |
| Large saucer | 200 |
| Small saucer | 1000 |

Extra life awarded every 10,000 points.

## Tech stack

- **TypeScript** — strict typing throughout
- **React 18** — component shell and RAF lifecycle
- **HTML5 Canvas 2D** — all rendering
- **Create React App** — build tooling
- **Next.js API Route** — optional server-backed leaderboard

## License

MIT
