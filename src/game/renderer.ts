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
      drawBullets(ctx, state.saucerBullets);
      if (state.saucer) drawSaucer(ctx, state.saucer);
      if (state.ship.alive) drawShip(ctx, state.ship);
      drawHUD(ctx, state);
      if (state.waveAnnouncementTimer > 0) {
        drawWaveAnnouncement(ctx, state);
      }
      break;

    case GamePhase.GameOver:
      drawBullets(ctx, state.bullets);
      drawBullets(ctx, state.saucerBullets);
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
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillRect(p.pos.x - 1, p.pos.y - 1, 2, 2);
  }
  ctx.restore();
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
  ctx.fillText('REACTEROIDS', width / 2, height * 0.2);

  ctx.font = `16px ${FONT_FAMILY}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('ARROWS TO MOVE  \u2022  SPACE TO SHOOT  \u2022  SHIFT FOR HYPERSPACE', width / 2, height * 0.2 + 45);

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
    ctx.fillText('PRESS ENTER TO START', width / 2, height * 0.87);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('PRESS H FOR HIGH SCORES', width / 2, height * 0.93);
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
  ctx.fillText('ENTER YOUR INITIALS', width / 2, height / 2 - 10);

  // 3-letter initial slots
  const slotWidth = 40;
  const slotGap = 12;
  const totalWidth = slotWidth * 3 + slotGap * 2;
  const startX = width / 2 - totalWidth / 2;
  const slotY = height / 2 + 35;

  for (let i = 0; i < 3; i++) {
    const sx = startX + i * (slotWidth + slotGap);
    const letter = state.enteredName[i];

    // Underline
    ctx.strokeStyle = i === state.enteredName.length
      ? TEXT_COLOR
      : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, slotY + 8);
    ctx.lineTo(sx + slotWidth, slotY + 8);
    ctx.stroke();

    if (letter) {
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `bold 36px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(letter, sx + slotWidth / 2, slotY);
    } else if (i === state.enteredName.length) {
      // Blinking cursor on current slot
      if (Math.floor(Date.now() / 350) % 2 === 0) {
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = `bold 36px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('_', sx + slotWidth / 2, slotY);
      }
    }
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('BACKSPACE TO CORRECT', width / 2, height / 2 + 80);
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

function drawWaveAnnouncement(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height, waveAnnouncementTimer, waveAnnouncementDuration } = state;
  if (waveAnnouncementTimer <= 0 || waveAnnouncementDuration <= 0) return;

  const elapsed = waveAnnouncementDuration - waveAnnouncementTimer;
  const duration = waveAnnouncementDuration;

  // Animation phases:
  //   0.0 - 0.4s: scale up from 0.3→1.0 and fade in
  //   0.4s - (duration-0.8s): hold steady
  //   last 0.8s: fade out and drift upward
  const enterTime = 0.4;
  const exitTime = 0.8;
  const holdEnd = duration - exitTime;

  let alpha: number;
  let scale: number;
  let yOffset: number;

  if (elapsed < enterTime) {
    // Ease-out entrance: fast start, smooth stop
    const t = elapsed / enterTime;
    const ease = 1 - (1 - t) * (1 - t); // quadratic ease-out
    alpha = ease;
    scale = 0.3 + 0.7 * ease;
    yOffset = 0;
  } else if (elapsed < holdEnd) {
    // Hold steady
    alpha = 1;
    scale = 1;
    yOffset = 0;
  } else {
    // Fade out and drift up
    const t = (elapsed - holdEnd) / exitTime;
    const ease = t * t; // quadratic ease-in
    alpha = 1 - ease;
    scale = 1;
    yOffset = -30 * ease;
  }

  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(width / 2, height / 2 + yOffset);
  ctx.scale(scale, scale);

  // Draw outlined text (stroke only, no fill) for a clean vector look
  const text = `WAVE ${state.level}`;
  ctx.font = `bold 56px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = TEXT_COLOR;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 0, 0);

  ctx.restore();
}
