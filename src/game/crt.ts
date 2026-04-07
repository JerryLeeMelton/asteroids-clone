/**
 * CRT post-processing effect inspired by high-end Trinitron RGB monitors.
 *
 * Effects applied:
 * 1. Bloom/halation — soft glow around bright pixels
 * 2. Aperture grille — vertical RGB phosphor stripe pattern
 * 3. Scanlines — horizontal gaps between phosphor rows
 * 4. Subtle static noise — adds analog texture
 * 5. Brightness boost — compensates for darkening from grille/scanlines
 */

export interface CRTOptions {
  /** Bloom intensity 0-1 (default 0.35) */
  bloomIntensity: number;
  /** Bloom spread — radius of blur passes (default 3) */
  bloomSpread: number;
  /** Scanline intensity 0-1, how dark the scanline gaps are (default 0.28) */
  scanlineIntensity: number;
  /** Aperture grille intensity 0-1, how visible the RGB phosphor stripes are (default 0.15) */
  grilleIntensity: number;
  /** Static noise intensity 0-1 (default 0.03) */
  noiseIntensity: number;
  /** Overall brightness multiplier to compensate for darkening (default 1.2) */
  brightnessBoost: number;
}

const DEFAULT_OPTIONS: CRTOptions = {
  bloomIntensity: 0.35,
  bloomSpread: 3,
  scanlineIntensity: 0.28,
  grilleIntensity: 0.15,
  noiseIntensity: 0.03,
  brightnessBoost: 1.2,
};

export class CRTFilter {
  private opts: CRTOptions;

  // Offscreen canvases for multi-pass rendering
  private gameCanvas: HTMLCanvasElement;
  private gameCtx: CanvasRenderingContext2D;
  private bloomCanvasA: HTMLCanvasElement;
  private bloomCtxA: CanvasRenderingContext2D;
  private bloomCanvasB: HTMLCanvasElement;
  private bloomCtxB: CanvasRenderingContext2D;

  // Pre-baked overlay textures
  private grillePattern: CanvasPattern | null = null;
  private scanlinePattern: CanvasPattern | null = null;

  private width: number;
  private height: number;
  private bloomScale = 0.25; // render bloom at 1/4 resolution

  constructor(width: number, height: number, options?: Partial<CRTOptions>) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
    this.width = width;
    this.height = height;

    // Game render target (full resolution)
    this.gameCanvas = document.createElement('canvas');
    this.gameCanvas.width = width;
    this.gameCanvas.height = height;
    this.gameCtx = this.gameCanvas.getContext('2d', { willReadFrequently: false })!;

    // Bloom targets (low resolution for performance)
    const bw = Math.floor(width * this.bloomScale);
    const bh = Math.floor(height * this.bloomScale);

    this.bloomCanvasA = document.createElement('canvas');
    this.bloomCanvasA.width = bw;
    this.bloomCanvasA.height = bh;
    this.bloomCtxA = this.bloomCanvasA.getContext('2d')!;

    this.bloomCanvasB = document.createElement('canvas');
    this.bloomCanvasB.width = bw;
    this.bloomCanvasB.height = bh;
    this.bloomCtxB = this.bloomCanvasB.getContext('2d')!;

    // Build static overlay patterns based on intensity settings
    this.buildGrillePattern(this.opts.grilleIntensity);
    this.buildScanlinePattern(this.opts.scanlineIntensity);
  }

  /** Returns the offscreen context to render the game into */
  getGameContext(): CanvasRenderingContext2D {
    return this.gameCtx;
  }

  /** Release offscreen canvases to free memory */
  dispose(): void {
    this.gameCanvas.width = 0;
    this.gameCanvas.height = 0;
    this.bloomCanvasA.width = 0;
    this.bloomCanvasA.height = 0;
    this.bloomCanvasB.width = 0;
    this.bloomCanvasB.height = 0;
    this.grillePattern = null;
    this.scanlinePattern = null;
  }

  /** Composites the CRT effect onto the output canvas */
  apply(outputCtx: CanvasRenderingContext2D): void {
    const { width, height } = this;

    // --- Pass 1: Bloom ---
    this.renderBloom(outputCtx);

    // --- Pass 2: Brightness boost ---
    if (this.opts.brightnessBoost > 1) {
      outputCtx.save();
      outputCtx.globalCompositeOperation = 'lighter';
      const boostAlpha = Math.min(this.opts.brightnessBoost - 1, 0.5);
      outputCtx.fillStyle = `rgba(255, 255, 255, ${boostAlpha})`;
      outputCtx.fillRect(0, 0, width, height);
      outputCtx.restore();
    }

    // --- Pass 3: Aperture grille ---
    // The pattern is pre-baked with intensity already lerped into the colors,
    // so a simple multiply is all that's needed.
    if (this.opts.grilleIntensity > 0 && this.grillePattern) {
      outputCtx.save();
      outputCtx.globalCompositeOperation = 'multiply';
      outputCtx.fillStyle = this.grillePattern;
      outputCtx.fillRect(0, 0, width, height);
      outputCtx.restore();
    }

    // --- Pass 4: Scanlines ---
    // Pattern is also pre-baked with intensity lerped in.
    if (this.opts.scanlineIntensity > 0 && this.scanlinePattern) {
      outputCtx.save();
      outputCtx.globalCompositeOperation = 'multiply';
      outputCtx.fillStyle = this.scanlinePattern;
      outputCtx.fillRect(0, 0, width, height);
      outputCtx.restore();
    }

    // --- Pass 5: Noise ---
    if (this.opts.noiseIntensity > 0) {
      this.applyNoise(outputCtx);
    }
  }

  private renderBloom(outputCtx: CanvasRenderingContext2D): void {
    const { width, height } = this;
    const bw = this.bloomCanvasA.width;
    const bh = this.bloomCanvasA.height;

    // Start by drawing the raw game frame to output
    outputCtx.drawImage(this.gameCanvas, 0, 0);

    if (this.opts.bloomIntensity <= 0) return;

    // Downscale to bloom buffer A — the bilinear filter provides initial blur
    this.bloomCtxA.drawImage(this.gameCanvas, 0, 0, bw, bh);

    // Multi-pass box blur at low resolution for a soft bloom
    const spread = this.opts.bloomSpread;
    for (let pass = 0; pass < 2; pass++) {
      // Horizontal blur: A -> B
      this.bloomCtxB.clearRect(0, 0, bw, bh);
      this.bloomCtxB.globalAlpha = 1 / (spread * 2 + 1);
      for (let i = -spread; i <= spread; i++) {
        this.bloomCtxB.drawImage(this.bloomCanvasA, i, 0);
      }
      this.bloomCtxB.globalAlpha = 1;

      // Vertical blur: B -> A
      this.bloomCtxA.clearRect(0, 0, bw, bh);
      this.bloomCtxA.globalAlpha = 1 / (spread * 2 + 1);
      for (let i = -spread; i <= spread; i++) {
        this.bloomCtxA.drawImage(this.bloomCanvasB, 0, i);
      }
      this.bloomCtxA.globalAlpha = 1;
    }

    // Additive blend bloom onto the output
    outputCtx.save();
    outputCtx.globalCompositeOperation = 'lighter';
    outputCtx.globalAlpha = this.opts.bloomIntensity;
    outputCtx.drawImage(this.bloomCanvasA, 0, 0, bw, bh, 0, 0, width, height);
    outputCtx.restore();
  }

  /**
   * Aperture grille: vertical RGB phosphor stripes like a Trinitron.
   * Each pixel column cycles R, G, B with thin dark gaps between triads.
   *
   * The intensity parameter controls how far the phosphor colors deviate
   * from pure white. At 0 the pattern is all white (invisible when multiplied).
   * At 1.0 the full phosphor colors are used.
   */
  private buildGrillePattern(intensity: number): void {
    const pw = 6; // pixels per RGB triad (2px per phosphor)
    const ph = 1;
    const pat = document.createElement('canvas');
    pat.width = pw;
    pat.height = ph;
    const ctx = pat.getContext('2d')!;
    const img = ctx.createImageData(pw, ph);
    const d = img.data;

    // Full-strength phosphor colors (used at intensity=1)
    const fullColors = [
      [255, 60, 60],   // R phosphor
      [255, 60, 60],   // R phosphor
      [60, 255, 60],   // G phosphor
      [60, 255, 60],   // G phosphor
      [60, 60, 255],   // B phosphor
      [60, 60, 255],   // B phosphor
    ];

    // Lerp each color channel toward 255 (white) based on inverse intensity.
    // At intensity=0: all channels are 255 (white, invisible multiply).
    // At intensity=1: full phosphor colors.
    for (let x = 0; x < pw; x++) {
      const idx = x * 4;
      d[idx] = Math.round(255 - (255 - fullColors[x][0]) * intensity);
      d[idx + 1] = Math.round(255 - (255 - fullColors[x][1]) * intensity);
      d[idx + 2] = Math.round(255 - (255 - fullColors[x][2]) * intensity);
      d[idx + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);

    this.grillePattern = ctx.createPattern(pat, 'repeat');
  }

  /**
   * Scanlines: horizontal dark lines every other row.
   * Trinitron style with configurable gap darkness.
   *
   * Intensity controls how dark the gap row is.
   * At 0: gap is white (invisible). At 1.0: gap is black.
   */
  private buildScanlinePattern(intensity: number): void {
    const ph = 3; // 3px period: 2px lit, 1px dark gap
    const pat = document.createElement('canvas');
    pat.width = 1;
    pat.height = ph;
    const ctx = pat.getContext('2d')!;
    const img = ctx.createImageData(1, ph);
    const d = img.data;

    // Lit rows: always white (no darkening)
    d[0] = 255; d[1] = 255; d[2] = 255; d[3] = 255;
    d[4] = 255; d[5] = 255; d[6] = 255; d[7] = 255;

    // Gap row: lerp from 255 (invisible) to 0 (full dark) based on intensity
    const gap = Math.round(255 * (1 - intensity));
    d[8] = gap; d[9] = gap; d[10] = gap; d[11] = 255;

    ctx.putImageData(img, 0, 0);
    this.scanlinePattern = ctx.createPattern(pat, 'repeat');
  }

  /**
   * Subtle static noise overlay — random bright specks.
   */
  private applyNoise(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this;
    const intensity = this.opts.noiseIntensity;

    ctx.save();

    const count = Math.floor(2000 * intensity);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const brightness = Math.floor(Math.random() * 80);
      const alpha = Math.random() * 0.3;
      ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.restore();
  }
}
