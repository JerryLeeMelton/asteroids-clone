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
  /** Scanline intensity 0-1 (default 0.28) */
  scanlineIntensity: number;
  /** Aperture grille intensity 0-1 (default 0.15) */
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

    // Build static overlay patterns
    this.buildGrillePattern();
    this.buildScanlinePattern();
  }

  /** Returns the offscreen context to render the game into */
  getGameContext(): CanvasRenderingContext2D {
    return this.gameCtx;
  }

  /** Composites the CRT effect onto the output canvas */
  apply(outputCtx: CanvasRenderingContext2D): void {
    const { width, height } = this;

    // --- Pass 1: Bloom ---
    this.renderBloom(outputCtx);

    // --- Pass 2: Brightness boost ---
    if (this.opts.brightnessBoost > 1) {
      outputCtx.save();
      outputCtx.globalCompositeOperation = 'source-atop';
      const boostAlpha = Math.min(this.opts.brightnessBoost - 1, 0.5);
      outputCtx.fillStyle = `rgba(255, 255, 255, ${boostAlpha})`;
      outputCtx.fillRect(0, 0, width, height);
      outputCtx.restore();
    }

    // --- Pass 3: Aperture grille ---
    if (this.opts.grilleIntensity > 0 && this.grillePattern) {
      outputCtx.save();
      outputCtx.globalCompositeOperation = 'multiply';
      outputCtx.globalAlpha = 1;
      outputCtx.fillStyle = this.grillePattern;
      outputCtx.fillRect(0, 0, width, height);
      outputCtx.restore();

      // Blend to control intensity — lighter fill to reduce the multiply effect
      outputCtx.save();
      outputCtx.globalCompositeOperation = 'lighter';
      outputCtx.globalAlpha = 1 - this.opts.grilleIntensity;
      outputCtx.drawImage(this.gameCanvas, 0, 0);
      outputCtx.restore();
    }

    // --- Pass 4: Scanlines ---
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
   */
  private buildGrillePattern(): void {
    const pw = 6; // pixels per RGB triad (2px per phosphor)
    const ph = 1;
    const pat = document.createElement('canvas');
    pat.width = pw;
    pat.height = ph;
    const ctx = pat.getContext('2d')!;
    const img = ctx.createImageData(pw, ph);
    const d = img.data;

    // R stripe, G stripe, B stripe — each 2px wide
    // Using a Trinitron-style aperture grille
    const colors = [
      [255, 60, 60],   // R phosphor
      [255, 60, 60],   // R phosphor
      [60, 255, 60],   // G phosphor
      [60, 255, 60],   // G phosphor
      [60, 60, 255],   // B phosphor
      [60, 60, 255],   // B phosphor
    ];

    for (let x = 0; x < pw; x++) {
      const idx = x * 4;
      d[idx] = colors[x][0];
      d[idx + 1] = colors[x][1];
      d[idx + 2] = colors[x][2];
      d[idx + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);

    const c2 = document.createElement('canvas');
    c2.width = pw;
    c2.height = ph;
    const ctx2 = c2.getContext('2d')!;
    ctx2.imageSmoothingEnabled = false;
    ctx2.drawImage(pat, 0, 0);

    this.grillePattern = ctx2.createPattern(c2, 'repeat');
  }

  /**
   * Scanlines: horizontal dark lines every other row.
   * Trinitron style — prominent but not opaque.
   */
  private buildScanlinePattern(): void {
    const ph = 3; // 3px period: 2px lit, 1px dark gap
    const pat = document.createElement('canvas');
    pat.width = 1;
    pat.height = ph;
    const ctx = pat.getContext('2d')!;
    const img = ctx.createImageData(1, ph);
    const d = img.data;

    // Row 0: full bright
    d[0] = 255; d[1] = 255; d[2] = 255; d[3] = 255;
    // Row 1: full bright
    d[4] = 255; d[5] = 255; d[6] = 255; d[7] = 255;
    // Row 2: dark gap
    d[8] = 80; d[9] = 80; d[10] = 80; d[11] = 255;

    ctx.putImageData(img, 0, 0);
    this.scanlinePattern = ctx.createPattern(pat, 'repeat');
  }

  /**
   * Subtle static noise overlay — random bright specks.
   * Uses a fast PRNG approach drawing sparse rectangles.
   */
  private applyNoise(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this;
    const intensity = this.opts.noiseIntensity;

    ctx.save();

    // Sparse random noise specks — draw ~200 random dots
    const count = Math.floor(200 * intensity * 10);
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
