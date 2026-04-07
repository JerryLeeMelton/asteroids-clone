import React, { useRef, useEffect, useCallback } from 'react';
import { createGameState, createKeyState, updateGame, resetGame } from '../game/engine';
import { render, RenderContext } from '../game/renderer';
import { GameState, KeyState, GamePhase, GameEvent } from '../game/types';
import { HighScore, fetchHighScores, submitHighScore, isHighScore } from '../game/scores';
import { CRTFilter, CRTOptions } from '../game/crt';
import { AudioManager, SoundEffect, AudioOptions } from '../game/audio';

interface AsteroidsGameProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Optional API URL for global leaderboard. Falls back to localStorage if unavailable. */
  scoresApiUrl?: string;
  /** Enable CRT post-processing filter (default true) */
  crtEnabled?: boolean;
  /** Override CRT filter options */
  crtOptions?: Partial<CRTOptions>;
  /** Enable sound effects (default false — enable once you add sound files) */
  audioEnabled?: boolean;
  /** Override audio options (basePath, extension, volume) */
  audioOptions?: Partial<AudioOptions>;
}

const AsteroidsGame: React.FC<AsteroidsGameProps> = ({
  width = 800,
  height = 600,
  className,
  style,
  scoresApiUrl,
  crtEnabled = true,
  crtOptions,
  audioEnabled = false,
  audioOptions,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const keyStateRef = useRef<KeyState>(createKeyState());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef<boolean>(false);
  const highScoresRef = useRef<HighScore[]>([]);
  const submittingRef = useRef<boolean>(false);
  const gameOverTimerRef = useRef<number>(0);
  const crtFilterRef = useRef<CRTFilter | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const crtOptionsRef = useRef(crtOptions);
  const audioOptionsRef = useRef(audioOptions);
  crtOptionsRef.current = crtOptions;
  audioOptionsRef.current = audioOptions;

  const loadHighScores = useCallback(async () => {
    const scores = await fetchHighScores(scoresApiUrl);
    highScoresRef.current = scores;
  }, [scoresApiUrl]);

  const doSubmitScore = useCallback((state: GameState) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const name = state.enteredName;
    const score = state.score;
    submitHighScore(name, score, scoresApiUrl).then((result) => {
      submittingRef.current = false;
      // Guard: only update if this game state is still current
      if (gameStateRef.current !== state) return;
      highScoresRef.current = result.scores;
      state.newHighScoreRank = result.rank;
      state.phase = GamePhase.HighScores;
    });
  }, [scoresApiUrl]);

  const processAudioEvents = useCallback((state: GameState) => {
    const audio = audioRef.current;
    if (!audio) return;

    const eventToSound: Partial<Record<GameEvent, SoundEffect>> = {
      [GameEvent.Shoot]: SoundEffect.Shoot,
      [GameEvent.ExplodeShip]: SoundEffect.ExplodeShip,
      [GameEvent.ExplodeLarge]: SoundEffect.ExplodeLarge,
      [GameEvent.ExplodeMedium]: SoundEffect.ExplodeMedium,
      [GameEvent.ExplodeSmall]: SoundEffect.ExplodeSmall,
      [GameEvent.SaucerShoot]: SoundEffect.SaucerShoot,
      [GameEvent.ExtraLife]: SoundEffect.ExtraLife,
      [GameEvent.Hyperspace]: SoundEffect.Hyperspace,
    };

    for (const event of state.events) {
      switch (event) {
        case GameEvent.ThrustStart:
          audio.startLoop(SoundEffect.Thrust);
          break;
        case GameEvent.ThrustStop:
          audio.stopLoop(SoundEffect.Thrust);
          break;
        case GameEvent.SaucerSpawn:
          // Could check saucer size for big vs small, but we don't have it here
          audio.startLoop(SoundEffect.SaucerBig);
          break;
        case GameEvent.SaucerDestroyed:
          audio.stopLoop(SoundEffect.SaucerBig);
          audio.stopLoop(SoundEffect.SaucerSmall);
          audio.play(SoundEffect.ExplodeShip);
          break;
        default: {
          const sound = eventToSound[event];
          if (sound) audio.play(sound);
        }
      }
    }
    state.events.length = 0;
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const outputCtx = canvas?.getContext('2d');
    const state = gameStateRef.current;
    if (!canvas || !outputCtx || !state) return;

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    if (state.phase === GamePhase.GameOver) {
      gameOverTimerRef.current += dt;
    }

    updateGame(state, keyStateRef.current, dt);
    processAudioEvents(state);

    const renderCtx: RenderContext = {
      highScores: highScoresRef.current,
    };

    const crt = crtFilterRef.current;
    if (crt) {
      const gameCtx = crt.getGameContext();
      render(gameCtx, state, renderCtx);
      crt.apply(outputCtx);
    } else {
      render(outputCtx, state, renderCtx);
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [processAudioEvents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    gameStateRef.current = createGameState(width, height);
    const crt = crtEnabled ? new CRTFilter(width, height, crtOptionsRef.current) : null;
    const audio = audioEnabled ? new AudioManager(audioOptionsRef.current) : null;
    crtFilterRef.current = crt;
    audioRef.current = audio;
    loadHighScores();

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      crt?.dispose();
      audio?.destroy();
      crtFilterRef.current = null;
      audioRef.current = null;
    };
  }, [width, height, gameLoop, loadHighScores, crtEnabled, audioEnabled]);

  // Keyboard handlers
  useEffect(() => {
    const keyMap: Record<string, keyof KeyState> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ' ': 'shoot',
      ShiftLeft: 'hyperspace',
      ShiftRight: 'hyperspace',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedRef.current) return;

      const state = gameStateRef.current;
      if (!state) return;

      // Preload audio on first keypress (browser gesture requirement)
      audioRef.current?.preload();

      // Prevent scrolling
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (state.phase) {
        case GamePhase.Title:
          if (e.key === 'Enter') {
            audioRef.current?.stopAllLoops();
            resetGame(state);
          } else if (e.key === 'h' || e.key === 'H') {
            // View high scores from title screen
            state.phase = GamePhase.HighScores;
          }
          break;

        case GamePhase.Playing: {
          const mappedKey = e.code.startsWith('Shift') ? e.code : e.key;
          const action = keyMap[mappedKey];
          if (action) {
            keyStateRef.current[action] = true;
          }
          break;
        }

        case GamePhase.GameOver:
          if (e.key === 'Enter' && gameOverTimerRef.current > 1.0) {
            gameOverTimerRef.current = 0;
            if (isHighScore(highScoresRef.current, state.score)) {
              state.phase = GamePhase.EnteringName;
              state.enteredName = '';
            } else {
              state.phase = GamePhase.HighScores;
            }
          }
          break;

        case GamePhase.EnteringName:
          e.preventDefault();
          if (e.key === 'Enter' && state.enteredName.length === 3) {
            doSubmitScore(state);
          } else if (e.key === 'Backspace') {
            state.enteredName = state.enteredName.slice(0, -1);
          } else if (e.key === 'Escape') {
            state.phase = GamePhase.HighScores;
          } else if (
            e.key.length === 1 &&
            state.enteredName.length < 3 &&
            /^[a-zA-Z]$/.test(e.key)
          ) {
            state.enteredName += e.key.toUpperCase();
            if (state.enteredName.length === 3) {
              doSubmitScore(state);
            }
          }
          break;

        case GamePhase.HighScores:
          if (e.key === 'Enter') {
            state.newHighScoreRank = null;
            audioRef.current?.stopAllLoops();
            if (!state.started || state.gameOver) {
              state.phase = GamePhase.Title;
            } else {
              resetGame(state);
            }
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const mappedKey = e.code.startsWith('Shift') ? e.code : e.key;
      const action = keyMap[mappedKey];
      if (action) {
        keyStateRef.current[action] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [doSubmitScore]);

  const handleContainerClick = useCallback(() => {
    focusedRef.current = true;
    containerRef.current?.focus();
    audioRef.current?.preload();
  }, []);

  const handleBlur = useCallback(() => {
    focusedRef.current = false;
    const keys = keyStateRef.current;
    keys.left = false;
    keys.right = false;
    keys.up = false;
    keys.shoot = false;
    keys.hyperspace = false;
  }, []);

  const handleFocus = useCallback(() => {
    focusedRef.current = true;
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onClick={handleContainerClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      style={{
        outline: 'none',
        cursor: 'crosshair',
        display: 'inline-block',
        lineHeight: 0,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          background: '#000',
        }}
      />
    </div>
  );
};

export default AsteroidsGame;
