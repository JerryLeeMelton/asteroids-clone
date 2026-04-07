import {
  GameState, KeyState, Ship, Asteroid, GamePhase, GameEvent,
  Vec2, AsteroidSize, SaucerSize,
  SHIP_ROTATION_SPEED, SHIP_THRUST, SHIP_DRAG, SHIP_MAX_SPEED, SHIP_RADIUS,
  SHIP_INVINCIBLE_TIME, SHIP_RESPAWN_TIME,
  BULLET_SPEED, BULLET_LIFE, MAX_BULLETS, SHOOT_COOLDOWN,
  ASTEROID_SPEED_RANGE, ASTEROID_RADII, ASTEROID_SCORES, ASTEROID_VERTICES_COUNT,
  SAUCER_SPEED, SAUCER_RADII, SAUCER_SCORES, SAUCER_SHOOT_INTERVAL,
  SAUCER_SPAWN_INTERVAL, SAUCER_BULLET_SPEED, SAUCER_BULLET_LIFE,
  EXTRA_LIFE_SCORE, INITIAL_LIVES, INITIAL_ASTEROIDS, LEVEL_CLEAR_DELAY,
  PARTICLE_COUNT_SHIP, PARTICLE_COUNT_ASTEROID, PARTICLE_LIFE,
  WAVE_ANNOUNCEMENT_DURATION,
} from './types';

// ---- Utility ----

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function wrap(pos: Vec2, width: number, height: number): void {
  pos.x = ((pos.x % width) + width) % width;
  pos.y = ((pos.y % height) + height) % height;
}

function distWrapped(a: Vec2, b: Vec2, w: number, h: number): number {
  let dx = Math.abs(a.x - b.x);
  let dy = Math.abs(a.y - b.y);
  if (dx > w / 2) dx = w - dx;
  if (dy > h / 2) dy = h - dy;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---- Entity Creation ----

function createShip(width: number, height: number): Ship {
  return {
    pos: { x: width / 2, y: height / 2 },
    vel: { x: 0, y: 0 },
    angle: 0,
    radius: SHIP_RADIUS,
    thrusting: false,
    invincibleTimer: SHIP_INVINCIBLE_TIME,
    respawnTimer: 0,
    alive: true,
  };
}

function generateAsteroidVertices(): Vec2[] {
  const verts: Vec2[] = [];
  for (let i = 0; i < ASTEROID_VERTICES_COUNT; i++) {
    const angle = (i / ASTEROID_VERTICES_COUNT) * Math.PI * 2;
    const jag = rand(0.7, 1.3);
    verts.push({
      x: Math.cos(angle) * jag,
      y: Math.sin(angle) * jag,
    });
  }
  return verts;
}

function createAsteroid(
  pos: Vec2,
  size: AsteroidSize,
  nextId: number,
  speedMultiplier: number = 1,
): Asteroid {
  const angle = rand(0, Math.PI * 2);
  const speed = rand(ASTEROID_SPEED_RANGE.min, ASTEROID_SPEED_RANGE.max) * speedMultiplier;
  return {
    pos: { ...pos },
    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    angle: rand(0, Math.PI * 2),
    rotationSpeed: rand(-1.5, 1.5),
    radius: ASTEROID_RADII[size],
    size,
    vertices: generateAsteroidVertices(),
    id: nextId,
  };
}

function spawnAsteroidsForLevel(level: number, width: number, height: number, startId: number): Asteroid[] {
  const count = Math.min(INITIAL_ASTEROIDS + (level - 1), 12);
  const asteroids: Asteroid[] = [];
  const speedMultiplier = 1 + (level - 1) * 0.1;

  for (let i = 0; i < count; i++) {
    let pos: Vec2;
    const edge = Math.floor(rand(0, 4));
    switch (edge) {
      case 0: pos = { x: rand(0, width), y: 0 }; break;
      case 1: pos = { x: width, y: rand(0, height) }; break;
      case 2: pos = { x: rand(0, width), y: height }; break;
      default: pos = { x: 0, y: rand(0, height) }; break;
    }
    asteroids.push(createAsteroid(pos, AsteroidSize.Large, startId + i, speedMultiplier));
  }
  return asteroids;
}

// ---- Initialization ----

export function createGameState(width: number, height: number): GameState {
  const state: GameState = {
    ship: createShip(width, height),
    asteroids: [],
    bullets: [],
    saucerBullets: [],
    particles: [],
    saucer: null,
    score: 0,
    lives: INITIAL_LIVES,
    level: 1,
    gameOver: false,
    started: false,
    phase: GamePhase.Title,
    width,
    height,
    nextId: 1,
    extraLifeThreshold: EXTRA_LIFE_SCORE,
    levelClearTimer: LEVEL_CLEAR_DELAY,
    saucerSpawnTimer: rand(SAUCER_SPAWN_INTERVAL.min, SAUCER_SPAWN_INTERVAL.max),
    shootCooldown: 0,
    wasThrusting: false,
    waveAnnouncementTimer: 0,
    waveAnnouncementDuration: 0,
    enteredName: '',
    newHighScoreRank: null,
    events: [],
  };

  state.asteroids = spawnAsteroidsForLevel(1, width, height, state.nextId);
  state.nextId += state.asteroids.length;

  return state;
}

export function createKeyState(): KeyState {
  return { left: false, right: false, up: false, shoot: false, hyperspace: false };
}

// ---- Game Update ----

export function updateGame(state: GameState, keys: KeyState, dt: number): void {
  if (state.phase !== GamePhase.Playing) return;

  const { ship, width, height } = state;

  // ---- Ship respawn ----
  if (!ship.alive) {
    ship.respawnTimer -= dt;
    if (ship.respawnTimer <= 0) {
      ship.alive = true;
      ship.pos = { x: width / 2, y: height / 2 };
      ship.vel = { x: 0, y: 0 };
      ship.angle = 0;
      ship.invincibleTimer = SHIP_INVINCIBLE_TIME;
    }
  }

  // ---- Ship controls ----
  if (ship.alive) {
    if (keys.left) ship.angle -= SHIP_ROTATION_SPEED * dt;
    if (keys.right) ship.angle += SHIP_ROTATION_SPEED * dt;

    ship.thrusting = keys.up;
    if (keys.up && !state.wasThrusting) state.events.push(GameEvent.ThrustStart);
    if (!keys.up && state.wasThrusting) state.events.push(GameEvent.ThrustStop);
    state.wasThrusting = keys.up;
    if (keys.up) {
      ship.vel.x += Math.sin(ship.angle) * SHIP_THRUST * dt;
      ship.vel.y -= Math.cos(ship.angle) * SHIP_THRUST * dt;
    }

    // Apply drag using frame-independent formula
    const dragFactor = Math.pow(SHIP_DRAG, dt * 60);
    ship.vel.x *= dragFactor;
    ship.vel.y *= dragFactor;

    // Clamp speed
    const speed = Math.sqrt(ship.vel.x * ship.vel.x + ship.vel.y * ship.vel.y);
    if (speed > SHIP_MAX_SPEED) {
      ship.vel.x = (ship.vel.x / speed) * SHIP_MAX_SPEED;
      ship.vel.y = (ship.vel.y / speed) * SHIP_MAX_SPEED;
    }

    // Move
    ship.pos.x += ship.vel.x * dt;
    ship.pos.y += ship.vel.y * dt;
    wrap(ship.pos, width, height);

    // Invincibility countdown
    if (ship.invincibleTimer > 0) {
      ship.invincibleTimer -= dt;
    }

    // Hyperspace — risky! No invincibility on arrival.
    // Player can materialize inside an asteroid and die.
    if (keys.hyperspace) {
      keys.hyperspace = false;
      ship.pos.x = rand(0, width);
      ship.pos.y = rand(0, height);
      ship.invincibleTimer = 0;
      state.events.push(GameEvent.Hyperspace);
    }

    // Shooting
    state.shootCooldown -= dt;
    if (keys.shoot && state.shootCooldown <= 0 && state.bullets.length < MAX_BULLETS) {
      state.shootCooldown = SHOOT_COOLDOWN;
      state.events.push(GameEvent.Shoot);
      const bulletVel: Vec2 = {
        x: Math.sin(ship.angle) * BULLET_SPEED + ship.vel.x * 0.3,
        y: -Math.cos(ship.angle) * BULLET_SPEED + ship.vel.y * 0.3,
      };
      state.bullets.push({
        pos: {
          x: ship.pos.x + Math.sin(ship.angle) * SHIP_RADIUS,
          y: ship.pos.y - Math.cos(ship.angle) * SHIP_RADIUS,
        },
        vel: bulletVel,
        life: BULLET_LIFE,
        id: state.nextId++,
      });
    }
  }

  // ---- Update bullets ----
  for (const b of state.bullets) {
    b.pos.x += b.vel.x * dt;
    b.pos.y += b.vel.y * dt;
    wrap(b.pos, width, height);
    b.life -= dt;
  }
  state.bullets = state.bullets.filter(b => b.life > 0);

  // ---- Update asteroids ----
  for (const a of state.asteroids) {
    a.pos.x += a.vel.x * dt;
    a.pos.y += a.vel.y * dt;
    wrap(a.pos, width, height);
    a.angle += a.rotationSpeed * dt;
  }

  // ---- Saucer logic ----
  updateSaucer(state, dt);

  // ---- Update saucer bullets ----
  for (const b of state.saucerBullets) {
    b.pos.x += b.vel.x * dt;
    b.pos.y += b.vel.y * dt;
    wrap(b.pos, width, height);
    b.life -= dt;
  }
  state.saucerBullets = state.saucerBullets.filter(b => b.life > 0);

  // ---- Update particles ----
  for (const p of state.particles) {
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);

  // ---- Wave announcement countdown ----
  if (state.waveAnnouncementTimer > 0) {
    state.waveAnnouncementTimer -= dt;
    if (state.waveAnnouncementTimer < 0) state.waveAnnouncementTimer = 0;
  }

  // ---- Collisions ----
  checkCollisions(state);

  // ---- Level progression ----
  if (state.asteroids.length === 0 && !state.saucer) {
    state.levelClearTimer -= dt;
    if (state.levelClearTimer <= 0) {
      state.level++;
      state.asteroids = spawnAsteroidsForLevel(state.level, width, height, state.nextId);
      state.nextId += state.asteroids.length;
      state.levelClearTimer = LEVEL_CLEAR_DELAY;
      state.saucerSpawnTimer = rand(SAUCER_SPAWN_INTERVAL.min, SAUCER_SPAWN_INTERVAL.max);
      state.waveAnnouncementTimer = WAVE_ANNOUNCEMENT_DURATION;
      state.waveAnnouncementDuration = WAVE_ANNOUNCEMENT_DURATION;
    }
  }

  // ---- Extra life ----
  if (state.score >= state.extraLifeThreshold) {
    state.lives++;
    state.events.push(GameEvent.ExtraLife);
    state.extraLifeThreshold += EXTRA_LIFE_SCORE;
  }
}

function updateSaucer(state: GameState, dt: number): void {
  const { width, height, ship } = state;

  if (!state.saucer) {
    if (state.asteroids.length > 0) {
      state.saucerSpawnTimer -= dt;
      if (state.saucerSpawnTimer <= 0) {
        const isSmall = state.score > 10000 ? Math.random() < 0.7 :
                        state.score > 5000 ? Math.random() < 0.4 :
                        Math.random() < 0.15;
        const size = isSmall ? SaucerSize.Small : SaucerSize.Large;
        const fromLeft = Math.random() < 0.5;
        state.saucer = {
          pos: { x: fromLeft ? 0 : width, y: rand(50, height - 50) },
          vel: { x: (fromLeft ? 1 : -1) * SAUCER_SPEED, y: 0 },
          radius: SAUCER_RADII[size],
          size,
          shootTimer: rand(SAUCER_SHOOT_INTERVAL.min, SAUCER_SHOOT_INTERVAL.max),
          alive: true,
          id: state.nextId++,
        };
        state.events.push(GameEvent.SaucerSpawn);
      }
    }
    return;
  }

  const saucer = state.saucer;

  saucer.pos.x += saucer.vel.x * dt;
  saucer.pos.y += saucer.vel.y * dt;

  if (Math.random() < dt * 0.5) {
    saucer.vel.y = rand(-80, 80);
  }

  if (saucer.pos.y < 30) { saucer.pos.y = 30; saucer.vel.y = Math.abs(saucer.vel.y); }
  if (saucer.pos.y > height - 30) { saucer.pos.y = height - 30; saucer.vel.y = -Math.abs(saucer.vel.y); }

  if (saucer.pos.x < -50 || saucer.pos.x > width + 50) {
    state.saucer = null;
    state.saucerSpawnTimer = rand(SAUCER_SPAWN_INTERVAL.min, SAUCER_SPAWN_INTERVAL.max);
    return;
  }

  saucer.shootTimer -= dt;
  if (saucer.shootTimer <= 0 && ship.alive) {
    saucer.shootTimer = rand(SAUCER_SHOOT_INTERVAL.min, SAUCER_SHOOT_INTERVAL.max);
    let angle: number;
    if (saucer.size === SaucerSize.Small) {
      angle = Math.atan2(ship.pos.x - saucer.pos.x, -(ship.pos.y - saucer.pos.y));
      angle += rand(-0.2, 0.2);
    } else {
      angle = rand(0, Math.PI * 2);
    }
    state.events.push(GameEvent.SaucerShoot);
    state.saucerBullets.push({
      pos: { ...saucer.pos },
      vel: { x: Math.sin(angle) * SAUCER_BULLET_SPEED, y: -Math.cos(angle) * SAUCER_BULLET_SPEED },
      life: SAUCER_BULLET_LIFE,
      id: state.nextId++,
    });
  }
}

function spawnExplosion(state: GameState, pos: Vec2, count: number, speed: number): void {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const spd = rand(speed * 0.3, speed);
    const initialLife = rand(PARTICLE_LIFE * 0.5, PARTICLE_LIFE);
    state.particles.push({
      pos: { ...pos },
      vel: { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
      life: initialLife,
      maxLife: initialLife,
    });
  }
}

function addScore(state: GameState, points: number): void {
  state.score += points;
}

function destroyShip(state: GameState): void {
  state.ship.alive = false;
  state.events.push(GameEvent.ExplodeShip);
  state.events.push(GameEvent.ThrustStop);
  state.wasThrusting = false;
  spawnExplosion(state, state.ship.pos, PARTICLE_COUNT_SHIP, 120);
  state.lives--;
  if (state.lives <= 0) {
    state.gameOver = true;
    state.phase = GamePhase.GameOver;
  } else {
    state.ship.respawnTimer = SHIP_RESPAWN_TIME;
  }
}

function splitAsteroid(newAsteroids: Asteroid[], state: GameState, asteroid: Asteroid): void {
  spawnExplosion(state, asteroid.pos, PARTICLE_COUNT_ASTEROID, 60);
  const sizeEvents = {
    [AsteroidSize.Large]: GameEvent.ExplodeLarge,
    [AsteroidSize.Medium]: GameEvent.ExplodeMedium,
    [AsteroidSize.Small]: GameEvent.ExplodeSmall,
  };
  state.events.push(sizeEvents[asteroid.size]);
  if (asteroid.size === AsteroidSize.Large) {
    const speedMult = 1 + (state.level - 1) * 0.1;
    for (let i = 0; i < 2; i++) {
      newAsteroids.push(createAsteroid(asteroid.pos, AsteroidSize.Medium, state.nextId++, speedMult * 1.2));
    }
  } else if (asteroid.size === AsteroidSize.Medium) {
    const speedMult = 1 + (state.level - 1) * 0.1;
    for (let i = 0; i < 2; i++) {
      newAsteroids.push(createAsteroid(asteroid.pos, AsteroidSize.Small, state.nextId++, speedMult * 1.4));
    }
  }
}

function checkCollisions(state: GameState): void {
  const { ship, width, height } = state;

  // Bullet vs Asteroid — collect new asteroids separately to avoid
  // mutating the array during iteration
  const bulletsToRemove = new Set<number>();
  const asteroidsToRemove = new Set<number>();
  const newAsteroids: Asteroid[] = [];

  for (const bullet of state.bullets) {
    if (bulletsToRemove.has(bullet.id)) continue;
    for (const asteroid of state.asteroids) {
      if (asteroidsToRemove.has(asteroid.id)) continue;
      if (distWrapped(bullet.pos, asteroid.pos, width, height) < asteroid.radius) {
        bulletsToRemove.add(bullet.id);
        asteroidsToRemove.add(asteroid.id);
        addScore(state, ASTEROID_SCORES[asteroid.size]);
        splitAsteroid(newAsteroids, state, asteroid);
        break;
      }
    }
  }

  // Bullet vs Saucer
  if (state.saucer) {
    for (const bullet of state.bullets) {
      if (bulletsToRemove.has(bullet.id)) continue;
      if (distWrapped(bullet.pos, state.saucer.pos, width, height) < state.saucer.radius) {
        bulletsToRemove.add(bullet.id);
        addScore(state, SAUCER_SCORES[state.saucer.size]);
        state.events.push(GameEvent.SaucerDestroyed);
        spawnExplosion(state, state.saucer.pos, 15, 100);
        state.saucer = null;
        state.saucerSpawnTimer = rand(SAUCER_SPAWN_INTERVAL.min, SAUCER_SPAWN_INTERVAL.max);
        break;
      }
    }
  }

  state.bullets = state.bullets.filter(b => !bulletsToRemove.has(b.id));
  state.asteroids = state.asteroids.filter(a => !asteroidsToRemove.has(a.id));
  // Merge in child asteroids from splits
  if (newAsteroids.length > 0) {
    state.asteroids.push(...newAsteroids);
  }

  // Ship vs Asteroid
  if (ship.alive && ship.invincibleTimer <= 0) {
    for (const asteroid of state.asteroids) {
      if (distWrapped(ship.pos, asteroid.pos, width, height) < ship.radius + asteroid.radius * 0.8) {
        destroyShip(state);
        return;
      }
    }
  }

  // Ship vs Saucer
  if (ship.alive && ship.invincibleTimer <= 0 && state.saucer) {
    if (distWrapped(ship.pos, state.saucer.pos, width, height) < ship.radius + state.saucer.radius) {
      addScore(state, SAUCER_SCORES[state.saucer.size]);
      state.events.push(GameEvent.SaucerDestroyed);
      spawnExplosion(state, state.saucer.pos, 15, 100);
      state.saucer = null;
      state.saucerSpawnTimer = rand(SAUCER_SPAWN_INTERVAL.min, SAUCER_SPAWN_INTERVAL.max);
      destroyShip(state);
      return;
    }
  }

  // Ship vs Saucer bullets
  if (ship.alive && ship.invincibleTimer <= 0) {
    const saucerBulletsToRemove = new Set<number>();
    for (const bullet of state.saucerBullets) {
      if (distWrapped(ship.pos, bullet.pos, width, height) < ship.radius) {
        saucerBulletsToRemove.add(bullet.id);
        destroyShip(state);
        break;
      }
    }
    if (saucerBulletsToRemove.size > 0) {
      state.saucerBullets = state.saucerBullets.filter(b => !saucerBulletsToRemove.has(b.id));
    }
  }
}

export function resetGame(state: GameState): void {
  state.ship = createShip(state.width, state.height);
  state.asteroids = [];
  state.bullets = [];
  state.saucerBullets = [];
  state.particles = [];
  state.saucer = null;
  state.score = 0;
  state.lives = INITIAL_LIVES;
  state.level = 1;
  state.gameOver = false;
  state.started = true;
  state.phase = GamePhase.Playing;
  state.nextId = 1;
  state.extraLifeThreshold = EXTRA_LIFE_SCORE;
  state.levelClearTimer = LEVEL_CLEAR_DELAY;
  state.saucerSpawnTimer = rand(SAUCER_SPAWN_INTERVAL.min, SAUCER_SPAWN_INTERVAL.max);
  state.shootCooldown = 0;
  state.wasThrusting = false;
  state.enteredName = '';
  state.newHighScoreRank = null;
  state.events = [];
  state.waveAnnouncementTimer = WAVE_ANNOUNCEMENT_DURATION;
  state.waveAnnouncementDuration = WAVE_ANNOUNCEMENT_DURATION;

  state.asteroids = spawnAsteroidsForLevel(1, state.width, state.height, state.nextId);
  state.nextId += state.asteroids.length;
}
