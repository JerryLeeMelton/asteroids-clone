/**
 * Sound effects manager for the Reacteroids game.
 *
 * Drop your sound files into the public/sounds/ directory with the filenames
 * listed in SoundEffect below, then enable audio via the component prop.
 *
 * Supported formats: .mp3, .wav, .ogg, .webm (browser-dependent)
 *
 * Expected files in public/sounds/:
 *   shoot.mp3       — Player fires a bullet
 *   thrust.mp3      — Ship thrust (loops while thrusting)
 *   explodeShip.mp3 — Player ship destroyed
 *   explodeLarge.mp3 — Large asteroid destroyed
 *   explodeMedium.mp3 — Medium asteroid destroyed
 *   explodeSmall.mp3 — Small asteroid destroyed
 *   saucerBig.mp3   — Large saucer flying (loops)
 *   saucerSmall.mp3 — Small saucer flying (loops)
 *   saucerShoot.mp3 — Saucer fires
 *   extraLife.mp3   — Extra life awarded
 *   hyperspace.mp3  — Hyperspace jump
 *
 * You can change the base path and file extension via AudioOptions.
 */

export enum SoundEffect {
  Shoot = 'shoot',
  Thrust = 'thrust',
  ExplodeShip = 'explodeShip',
  ExplodeLarge = 'explodeLarge',
  ExplodeMedium = 'explodeMedium',
  ExplodeSmall = 'explodeSmall',
  SaucerBig = 'saucerBig',
  SaucerSmall = 'saucerSmall',
  SaucerShoot = 'saucerShoot',
  ExtraLife = 'extraLife',
  Hyperspace = 'hyperspace',
}

export interface AudioOptions {
  /** Base path to sound files (default '/sounds/') */
  basePath: string;
  /** File extension (default '.mp3') */
  extension: string;
  /** Master volume 0-1 (default 0.5) */
  volume: number;
  /** Number of pooled instances per sound for overlapping playback (default 4) */
  poolSize: number;
}

const DEFAULT_AUDIO_OPTIONS: AudioOptions = {
  basePath: '/sounds/',
  extension: '.mp3',
  volume: 0.5,
  poolSize: 4,
};

interface SoundPool {
  instances: HTMLAudioElement[];
  index: number;
}

export class AudioManager {
  private opts: AudioOptions;
  private pools: Map<string, SoundPool> = new Map();
  private looping: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private loaded: boolean = false;

  constructor(options?: Partial<AudioOptions>) {
    this.opts = { ...DEFAULT_AUDIO_OPTIONS, ...options };
  }

  /**
   * Preload all sound effects. Call once after user interaction
   * (browsers require a gesture before playing audio).
   */
  preload(): void {
    if (this.loaded) return;
    this.loaded = true;

    for (const sound of Object.values(SoundEffect)) {
      this.createPool(sound);
    }
  }

  private createPool(name: string): SoundPool {
    const src = `${this.opts.basePath}${name}${this.opts.extension}`;
    const instances: HTMLAudioElement[] = [];

    for (let i = 0; i < this.opts.poolSize; i++) {
      const audio = new Audio(src);
      audio.volume = this.opts.volume;
      audio.preload = 'auto';
      instances.push(audio);
    }

    const pool: SoundPool = { instances, index: 0 };
    this.pools.set(name, pool);
    return pool;
  }

  /** Play a one-shot sound effect. */
  play(sound: SoundEffect): void {
    if (!this.enabled || !this.loaded) return;

    let pool = this.pools.get(sound);
    if (!pool) {
      pool = this.createPool(sound);
    }

    const audio = pool.instances[pool.index];
    pool.index = (pool.index + 1) % pool.instances.length;

    // Reset and play — catch errors silently (file might not exist yet)
    audio.currentTime = 0;
    audio.volume = this.opts.volume;
    audio.play().catch(() => {});
  }

  /** Start a looping sound (e.g., thrust, saucer). */
  startLoop(sound: SoundEffect): void {
    if (!this.enabled || !this.loaded) return;
    if (this.looping.has(sound)) return;

    const src = `${this.opts.basePath}${sound}${this.opts.extension}`;
    const audio = new Audio(src);
    audio.volume = this.opts.volume;
    audio.loop = true;
    audio.play().catch(() => {});
    this.looping.set(sound, audio);
  }

  /** Stop a looping sound. */
  stopLoop(sound: SoundEffect): void {
    const audio = this.looping.get(sound);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      this.looping.delete(sound);
    }
  }

  /** Stop all looping sounds (e.g., on game over). */
  stopAllLoops(): void {
    for (const audio of this.looping.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.looping.clear();
  }

  /** Set master volume for all sounds. */
  setVolume(volume: number): void {
    this.opts.volume = Math.max(0, Math.min(1, volume));
    // Update running loops
    for (const audio of this.looping.values()) {
      audio.volume = this.opts.volume;
    }
  }

  /** Enable or disable all audio. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAllLoops();
    }
  }

  /** Clean up all audio resources. Call on unmount. */
  destroy(): void {
    this.stopAllLoops();
    for (const pool of this.pools.values()) {
      for (const audio of pool.instances) {
        audio.pause();
        audio.src = '';
      }
    }
    this.pools.clear();
    this.loaded = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
