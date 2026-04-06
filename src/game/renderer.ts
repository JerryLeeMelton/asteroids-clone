import {
  GameState, Ship, Asteroid, Saucer, SHIP_RADIUS,
} from './types';

const STROKE_COLOR = '#ffffff';
const DIM_STROKE = 'rgba(255, 255, 255, 0.5)';
const THRUST_COLOR = '#ff6633';
const BULLET_COLOR = '#ffffff';
const SAUCER_COLOR = '#ffffff';
const TEXT_COLOR = '#ffffff';
const FONT_FAMILY = '"Courier New", monospace';

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = state;

  // Clear
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  if (!state.started) {
    drawTitleScreen(ctx, state);
    return;
  }

  // Draw game objects
  drawAsteroids(ctx, state.asteroids);
  drawBullets(ctx, state.bullets);
  drawSaucerBullets(ctx, state);
  drawParticles(ctx, state.particles);

  if (state.saucer) {
    drawSaucer(ctx, state.saucer);
  }

  if (state.ship.alive) {
    drawShip(ctx, state.ship);
  }

  drawHUD(ctx, state);

  if (state.gameOver) {
    drawGameOver(ctx, state);
  }
}

function drawShip(ctx: CanvasRenderingContext2D, ship: Ship): void {
  // Blink when invincible
  if (ship.invincibleTimer > 0 && Math.floor(ship.invincibleTimer * 10) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(ship.pos.x, ship.pos.y);
  ctx.rotate(ship.angle);

  const r = SHIP_RADIUS;

  // Ship outline - classic triangular shape with notched back
  ctx.beginPath();
  ctx.moveTo(0, -r);           // nose
  ctx.lineTo(r * 0.7, r * 0.7);  // right wing
  ctx.lineTo(r * 0.3, r * 0.35); // right notch
  ctx.lineTo(-r * 0.3, r * 0.35); // left notch
  ctx.lineTo(-r * 0.7, r * 0.7); // left wing
  ctx.closePath();

  ctx.strokeStyle = ship.invincibleTimer > 0 ? DIM_STROKE : STROKE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Thrust flame
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
    ctx.moveTo(
      verts[0].x * asteroid.radius,
      verts[0].y * asteroid.radius,
    );
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(
        verts[i].x * asteroid.radius,
        verts[i].y * asteroid.radius,
      );
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

  // Classic saucer shape: top dome, middle band, bottom
  const r = radius;

  // Bottom half ellipse
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(-r * 0.5, r * 0.5);
  ctx.lineTo(r * 0.5, r * 0.5);
  ctx.lineTo(r, 0);
  ctx.stroke();

  // Middle band
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();

  // Top dome
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, 0);
  ctx.lineTo(-r * 0.3, -r * 0.4);
  ctx.lineTo(r * 0.3, -r * 0.4);
  ctx.lineTo(r * 0.6, 0);
  ctx.stroke();

  // Dome top
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
  // Score
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `24px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.fillText(state.score.toString().padStart(6, '0'), 20, 35);

  // Lives as small ships
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

  // Level indicator (subtle, top right)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = `14px ${FONT_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.fillText(`WAVE ${state.level}`, state.width - 20, 35);
}

function drawTitleScreen(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = state;

  // Draw any floating asteroids for ambiance
  drawAsteroids(ctx, state.asteroids);

  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = 'center';

  // Title
  ctx.font = `bold 48px ${FONT_FAMILY}`;
  ctx.fillText('ASTEROIDS', width / 2, height / 2 - 60);

  // Subtitle
  ctx.font = `16px ${FONT_FAMILY}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('ARROW KEYS TO MOVE  \u2022  SPACE TO SHOOT  \u2022  SHIFT FOR HYPERSPACE', width / 2, height / 2);

  // Blinking "press enter"
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `20px ${FONT_FAMILY}`;
    ctx.fillText('PRESS ENTER TO START', width / 2, height / 2 + 60);
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = state;

  // Dim overlay
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
    ctx.fillText('PRESS ENTER TO PLAY AGAIN', width / 2, height / 2 + 55);
  }
}
