# Reacteroids

A clone of the 1979 Atari arcade classic **Asteroids**, built in TypeScript and React. Rendered in vector graphics with the HTML5 Canvas 2D API.

## Features

- **Vector-style rendering**
- **Full arcade feature set**
- **Flying saucers**
- **CRT post-processing shader**
- **Classic high score leaderboard**
- **Zero runtime dependencies** beyond React. The game code is pure TypeScript

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

- **TypeScript**
- **React 18**
- **HTML5 Canvas 2D**
- **Create React App**
- **Next.js API Route**

## Planned features
- **Sound Effects** - sound support is implemented but proper sound effects need to be designed and put into the game.
