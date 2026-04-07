export interface Vec2 {
  x: number;
  y: number;
}

export interface Ship {
  pos: Vec2;
  vel: Vec2;
  angle: number; // radians, 0 = up
  radius: number;
  thrusting: boolean;
  invincibleTimer: number; // seconds remaining
  respawnTimer: number;
  alive: boolean;
}

export interface Asteroid {
  pos: Vec2;
  vel: Vec2;
  angle: number;
  rotationSpeed: number;
  radius: number;
  size: AsteroidSize;
  vertices: Vec2[]; // jagged shape offsets
  id: number;
}

export interface Bullet {
  pos: Vec2;
  vel: Vec2;
  life: number; // seconds remaining
  id: number;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
}

export interface Saucer {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  size: SaucerSize;
  shootTimer: number;
  alive: boolean;
  id: number;
}

export interface SaucerBullet {
  pos: Vec2;
  vel: Vec2;
  life: number;
  id: number;
}

export enum AsteroidSize {
  Large = 3,
  Medium = 2,
  Small = 1,
}

export enum SaucerSize {
  Large = 2,
  Small = 1,
}

export enum GameEvent {
  Shoot = 'shoot',
  ThrustStart = 'thrustStart',
  ThrustStop = 'thrustStop',
  ExplodeShip = 'explodeShip',
  ExplodeLarge = 'explodeLarge',
  ExplodeMedium = 'explodeMedium',
  ExplodeSmall = 'explodeSmall',
  SaucerSpawn = 'saucerSpawn',
  SaucerDestroyed = 'saucerDestroyed',
  SaucerShoot = 'saucerShoot',
  ExtraLife = 'extraLife',
  Hyperspace = 'hyperspace',
}

export enum GamePhase {
  Title = 'title',
  Playing = 'playing',
  GameOver = 'gameOver',
  EnteringName = 'enteringName',
  HighScores = 'highScores',
}

export interface GameState {
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  saucerBullets: SaucerBullet[];
  particles: Particle[];
  saucer: Saucer | null;
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  started: boolean;
  phase: GamePhase;
  width: number;
  height: number;
  nextId: number;
  extraLifeThreshold: number;
  levelClearTimer: number;
  saucerSpawnTimer: number;
  // Internal state (moved from module-level to avoid cross-instance leaks)
  shootCooldown: number;
  wasThrusting: boolean;
  // Wave announcement
  waveAnnouncementTimer: number; // seconds remaining, 0 = hidden
  waveAnnouncementDuration: number; // total duration for animation calc
  // High score entry
  enteredName: string;
  newHighScoreRank: number | null;
  // Audio event queue — drained by the component each frame
  events: GameEvent[];
}

export interface KeyState {
  left: boolean;
  right: boolean;
  up: boolean;
  shoot: boolean;
  hyperspace: boolean;
}

// Constants
export const SHIP_ROTATION_SPEED = 4.5; // radians per second
export const SHIP_THRUST = 300; // pixels per second^2
export const SHIP_DRAG = 0.98; // velocity multiplier per frame at 60fps
export const SHIP_MAX_SPEED = 500;
export const SHIP_RADIUS = 15;
export const SHIP_INVINCIBLE_TIME = 2.5;
export const SHIP_RESPAWN_TIME = 1.5;

export const BULLET_SPEED = 600;
export const BULLET_LIFE = 1.0; // seconds
export const MAX_BULLETS = 4;
export const SHOOT_COOLDOWN = 0.15; // seconds

export const ASTEROID_SPEED_RANGE = { min: 30, max: 80 };
export const ASTEROID_RADII = {
  [AsteroidSize.Large]: 45,
  [AsteroidSize.Medium]: 22,
  [AsteroidSize.Small]: 11,
};
export const ASTEROID_SCORES = {
  [AsteroidSize.Large]: 20,
  [AsteroidSize.Medium]: 50,
  [AsteroidSize.Small]: 100,
};
export const ASTEROID_VERTICES_COUNT = 10;

export const SAUCER_SPEED = 150;
export const SAUCER_RADII = {
  [SaucerSize.Large]: 20,
  [SaucerSize.Small]: 10,
};
export const SAUCER_SCORES = {
  [SaucerSize.Large]: 200,
  [SaucerSize.Small]: 1000,
};
export const SAUCER_SHOOT_INTERVAL = { min: 1.0, max: 2.5 };
export const SAUCER_SPAWN_INTERVAL = { min: 15, max: 30 };
export const SAUCER_BULLET_SPEED = 350;
export const SAUCER_BULLET_LIFE = 1.5;

export const EXTRA_LIFE_SCORE = 10000;
export const INITIAL_LIVES = 3;
export const INITIAL_ASTEROIDS = 4;
export const LEVEL_CLEAR_DELAY = 2.0; // seconds before next wave
export const PARTICLE_COUNT_SHIP = 30;
export const PARTICLE_COUNT_ASTEROID = 6;
export const PARTICLE_LIFE = 1.0;
export const WAVE_ANNOUNCEMENT_DURATION = 3.0; // seconds to show "Wave X"
