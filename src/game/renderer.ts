import {
  GameState, Ship, Asteroid, Saucer, GamePhase, SHIP_RADIUS,
} from './types';
import { HighScore } from './scores';

const STROKE_COLOR = '#ffffff';
const DIM_STROKE = 'rgba(255, 255, 255, 0.5)';
const THRUST_COLOR = '#ff6633';
const BULLET_COLOR = '#ffffff';
const SAUCER_COLOR = '#ffffff';
const TEXT_COLOR = '#ffffff';
const FONT_FAMILY = '"Courier New", monospace';

export interface RenderContext {
  highScores: HighScore[];
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  renderCtx: RenderContext,
): void {
  const { width, height } = state;

  // Clear
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Always draw ambient asteroids and particles
  drawAsteroids(ctx, state.asteroids);
  drawParticles(ctx, state.particles);

  switch (state.phase) {
    case GamePhase.Title:
      drawTitleScreen(ctx, state, renderCtx.highScores);
      break;

    case GamePhase.Playing:
      drawBullets(ctx, state.bullets);
      drawSaucerBullets(ctx, state);
      if (state.saucer) drawSaucer(ctx, state.saucer);
      if (state.ship.alive) drawShip(ctx, state.ship);
      drawHUD(ctx, state);
      break;

    case GamePhase.GameOver:
      drawBullets(ctx, state.bullets);
      drawSaucerBullets(ctx, state);
      if (state.saucer) drawSaucer(ctx, state.saucer);
      drawHUD(ctx, state);
      drawGameOver(ctx, state);
      break;

    case GamePhase.EnteringName:
      drawHUD(ctx, state);
      drawNameEntry(ctx, state);
      break;

    case GamePhase.HighScores:
      drawHighScoresScreen(ctx, state, renderCtx.highScores);
      break;
  }
}

function drawShip(ctx: CanvasRenderingContext2D, ship: Ship): void {
  if (ship.invincibleTimer > 0 && Math.floor(ship.invincibleTimer * 10) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(ship.pos.x, ship.pos.y);
  ctx.rotate(ship.angle);

  const r = SHIP_RADIUS;

  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.7, r * 0.7);
  ctx.lineTo(r * 0.3, r * 0.35);
  ctx.lineTo(-r * 0.3, r * 0.35);
  ctx.lineTo(-r * 0.7, r * 0.7);
  ctx.closePath();

  ctx.strokeStyle = ship.invincibleTimer > 0 ? DIM_STROKE : STROKE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  if (ship.thrusting) {
    const flicker = 0.7 + Math.random() * 0.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.4);
    ctx.lineTo(0, r * (0.5 + 0.4 * flicker));
    ctx.lineTo(r * 0.25, r * 0.4);
    ctx.strokeStyle = THRUST_COLOR;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

function drawAsteroids(ctx: CanvasRenderingContext2D, asteroids: Asteroid[]): void {
  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';

  for (const asteroid of asteroids) {
    ctx.save();
    ctx.translate(asteroid.pos.x, asteroid.pos.y);
    ctx.rotate(asteroid.angle);

    const verts = asteroid.vertices;
    ctx.beginPath();
    ctx.moveTo(verts[0].x * asteroid.radius, verts[0].y * asteroid.radius);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x * asteroid.radius, verts[i].y * asteroid.radius);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawBullets(ctx: CanvasRenderingContext2D, bullets: { pos: { x: number; y: number } }[]): void {
  ctx.fillStyle = BULLET_COLOR;
  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.arc(bullet.pos.x, bullet.pos.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSaucerBullets(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = BULLET_COLOR;
  for (const bullet of state.saucerBullets) {
    ctx.beginPath();
    ctx.arc(bullet.pos.x, bullet.pos.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSaucer(ctx: CanvasRenderingContext2D, saucer: Saucer): void {
  const { pos, radius } = saucer;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.strokeStyle = SAUCER_COLOR;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';

  const r = radius;

  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(-r * 0.5, r * 0.5);
  ctx.lineTo(r * 0.5, r * 0.5);
  ctx.lineTo(r, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.6, 0);
  ctx.lineTo(-r * 0.3, -r * 0.4);
  ctx.lineTo(r * 0.3, -r * 0.4);
  ctx.lineTo(r * 0.6, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.4);
  ctx.lineTo(0, -r * 0.7);
  ctx.lineTo(r * 0.2, -r * 0.4);
  ctx.stroke();

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: { pos: { x: number; y: number }; life: number; maxLife: number }[]): void {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(p.pos.x - 1, p.pos.y - 1, 2, 2);
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `24px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.fillText(state.score.toString().padStart(6, '0'), 20, 35);

  for (let i = 0; i < state.lives; i++) {
    const x = 30 + i * 25;
    const y = 60;
    const r = 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.7, r * 0.7);
    ctx.lineTo(r * 0.3, r * 0.35);
    ctx.lineTo(-r * 0.3, r * 0.35);
    ctx.lineTo(-r * 0.7, r * 0.7);
    ctx.closePath();
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.fillText(`WAVE ${state.level}`, state.width - 20, 35);
}

function drawScoresTable(
  ctx: CanvasRenderingContext2D,
  scores: HighScore[],
  x: number,
  startY: number,
  highlightRank: number | null,
): void {
  const lineHeight = 26;

  // Header
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.fillText('RANK', x - 140, startY);
  ctx.textAlign = 'center';
  ctx.fillText('SCORE', x, startY);
  ctx.textAlign = 'right';
  ctx.fillText('NAME', x + 140, startY);

  if (scores.length === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('NO SCORES YET', x, startY + lineHeight * 2);
    return;
  }

  for (let i = 0; i < scores.length; i++) {
    const y = startY + lineHeight * (i + 1);
    const isHighlighted = highlightRank !== null && i === highlightRank - 1;

    if (isHighlighted) {
      // Blinking highlight for new score
      const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 200);
      ctx.fillStyle = `rgba(255, 255, 100, ${alpha})`;
    } else {
      ctx.fillStyle = TEXT_COLOR;
    }

    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${(i + 1).toString().padStart(2, ' ')}.`, x - 140, y);
    ctx.textAlign = 'center';
    ctx.fillText(scores[i].score.toString().padStart(8, ' '), x, y);
    ctx.textAlign = 'right';
    ctx.fillText(scores[i].name, x + 140, y);
  }
}

function drawTitleScreen(ctx: CanvasRenderingContext2D, state: GameState, highScores: HighScore[]): void {
  const { width, height } = state;

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';

  ctx.font = `bold 48px ${FONT_FAMILY}`;
  ctx.fillText('ASTEROIDS', width / 2, height * 0.2);

  ctx.font = `16px ${FONT_FAMILY}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('ARROW KEYS TO MOVE  \u2022  SPACE TO SHOOT  \u2022  SHIFT FOR HYPERSPACE', width / 2, height * 0.2 + 45);

  // High scores on title screen
  if (highScores.length > 0) {
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `bold 20px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('HIGH SCORES', width / 2, height * 0.35);
    drawScoresTable(ctx, highScores, width / 2, height * 0.35 + 25, null);
  }

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `20px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('PRESS ENTER TO START', width / 2, height * 0.9);
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = state;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';
  ctx.font = `bold 40px ${FONT_FAMILY}`;
  ctx.fillText('GAME OVER', width / 2, height / 2 - 30);

  ctx.font = `20px ${FONT_FAMILY}`;
  ctx.fillText(`SCORE: ${state.score}`, width / 2, height / 2 + 15);

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.fillText('PRESS ENTER TO CONTINUE', width / 2, height / 2 + 55);
  }
}

function drawNameEntry(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = state;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';

  ctx.font = `bold 28px ${FONT_FAMILY}`;
  ctx.fillText('NEW HIGH SCORE!', width / 2, height / 2 - 80);

  ctx.font = `20px ${FONT_FAMILY}`;
  ctx.fillText(`SCORE: ${state.score}`, width / 2, height / 2 - 45);

  ctx.font = `16px ${FONT_FAMILY}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('ENTER YOUR NAME', width / 2, height / 2 - 10);

  // Name entry field with cursor
  const name = state.enteredName;
  const cursor = Math.floor(Date.now() / 400) % 2 === 0 ? '_' : ' ';
  const displayName = name + (name.length < 10 ? cursor : '');

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold 32px ${FONT_FAMILY}`;
  ctx.fillText(displayName, width / 2, height / 2 + 35);

  // Underline slots
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  const slotWidth = 20;
  const totalWidth = slotWidth * 10;
  const startX = width / 2 - totalWidth / 2;
  for (let i = 0; i < 10; i++) {
    const sx = startX + i * slotWidth;
    ctx.beginPath();
    ctx.moveTo(sx + 2, height / 2 + 42);
    ctx.lineTo(sx + slotWidth - 2, height / 2 + 42);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.fillText('PRESS ENTER TO SUBMIT', width / 2, height / 2 + 80);
}

function drawHighScoresScreen(ctx: CanvasRenderingContext2D, state: GameState, highScores: HighScore[]): void {
  const { width, height } = state;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';

  ctx.font = `bold 28px ${FONT_FAMILY}`;
  ctx.fillText('HIGH SCORES', width / 2, height * 0.15);

  ctx.font = `20px ${FONT_FAMILY}`;
  ctx.fillText(`YOUR SCORE: ${state.score}`, width / 2, height * 0.15 + 35);

  drawScoresTable(ctx, highScores, width / 2, height * 0.28, state.newHighScoreRank);

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('PRESS ENTER TO PLAY AGAIN', width / 2, height * 0.9);
  }
}
