import React, { useRef, useEffect, useCallback } from 'react';
import { createGameState, createKeyState, updateGame, resetGame } from '../game/engine';
import { render, RenderContext } from '../game/renderer';
import { GameState, KeyState, GamePhase } from '../game/types';
import { HighScore, fetchHighScores, submitHighScore, isHighScore } from '../game/scores';
import { CRTFilter, CRTOptions } from '../game/crt';

interface AsteroidsGameProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  scoresApiUrl?: string;
  /** Enable CRT post-processing filter (default true) */
  crtEnabled?: boolean;
  /** Override CRT filter options */
  crtOptions?: Partial<CRTOptions>;
}

const AsteroidsGame: React.FC<AsteroidsGameProps> = ({
  width = 800,
  height = 600,
  className,
  style,
  scoresApiUrl = '/api/asteroids/scores',
  crtEnabled = true,
  crtOptions,
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

  // Load high scores
  const loadHighScores = useCallback(async () => {
    const scores = await fetchHighScores(scoresApiUrl);
    highScoresRef.current = scores;
  }, [scoresApiUrl]);

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

    const renderCtx: RenderContext = {
      highScores: highScoresRef.current,
    };

    const crt = crtFilterRef.current;
    if (crt) {
      // Render game to offscreen canvas, then apply CRT filter to visible canvas
      const gameCtx = crt.getGameContext();
      render(gameCtx, state, renderCtx);
      crt.apply(outputCtx);
    } else {
      render(outputCtx, state, renderCtx);
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    gameStateRef.current = createGameState(width, height);
    crtFilterRef.current = crtEnabled ? new CRTFilter(width, height, crtOptions) : null;
    loadHighScores();

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [width, height, gameLoop, loadHighScores, crtEnabled, crtOptions]);

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

      // Prevent scrolling
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Phase-specific input handling
      switch (state.phase) {
        case GamePhase.Title:
          if (e.key === 'Enter') {
            resetGame(state);
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
          if (e.key === 'Enter' && state.enteredName.length === 3 && !submittingRef.current) {
            // Submit the score
            submittingRef.current = true;
            submitHighScore(scoresApiUrl, state.enteredName, state.score).then((result) => {
              submittingRef.current = false;
              if (result) {
                highScoresRef.current = result.scores;
                state.newHighScoreRank = result.rank;
              }
              state.phase = GamePhase.HighScores;
            });
          } else if (e.key === 'Backspace') {
            state.enteredName = state.enteredName.slice(0, -1);
          } else if (e.key === 'Escape') {
            // Skip name entry
            state.phase = GamePhase.HighScores;
          } else if (
            e.key.length === 1 &&
            state.enteredName.length < 3 &&
            /^[a-zA-Z]$/.test(e.key)
          ) {
            state.enteredName += e.key.toUpperCase();
            // Auto-submit when 3rd letter is entered
            if (state.enteredName.length === 3 && !submittingRef.current) {
              submittingRef.current = true;
              const name = state.enteredName;
              const score = state.score;
              submitHighScore(scoresApiUrl, name, score).then((result) => {
                submittingRef.current = false;
                if (result) {
                  highScoresRef.current = result.scores;
                  state.newHighScoreRank = result.rank;
                }
                state.phase = GamePhase.HighScores;
              });
            }
          }
          break;

        case GamePhase.HighScores:
          if (e.key === 'Enter') {
            state.newHighScoreRank = null;
            resetGame(state);
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
  }, [scoresApiUrl]);

  const handleContainerClick = useCallback(() => {
    focusedRef.current = true;
    containerRef.current?.focus();
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
