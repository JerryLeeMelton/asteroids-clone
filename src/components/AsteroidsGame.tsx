import React, { useRef, useEffect, useCallback } from 'react';
import { createGameState, createKeyState, updateGame, resetGame } from '../game/engine';
import { render } from '../game/renderer';
import { GameState, KeyState } from '../game/types';

interface AsteroidsGameProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const AsteroidsGame: React.FC<AsteroidsGameProps> = ({
  width = 800,
  height = 600,
  className,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const keyStateRef = useRef<KeyState>(createKeyState());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef<boolean>(false);

  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const state = gameStateRef.current;
    if (!canvas || !ctx || !state) return;

    // Delta time in seconds, capped to prevent spiral of death
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    updateGame(state, keyStateRef.current, dt);
    render(ctx, state);

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize game state
    gameStateRef.current = createGameState(width, height);

    // Start game loop
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [width, height, gameLoop]);

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

      // Prevent scrolling on arrow keys / space
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Start / restart game
      if (e.key === 'Enter') {
        if (!state.started || state.gameOver) {
          resetGame(state);
        }
        return;
      }

      // Map key code for shift (e.key is "Shift", e.code is "ShiftLeft"/"ShiftRight")
      const mappedKey = e.code.startsWith('Shift') ? e.code : e.key;
      const action = keyMap[mappedKey];
      if (action) {
        keyStateRef.current[action] = true;
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
  }, []);

  // Focus management
  const handleContainerClick = useCallback(() => {
    focusedRef.current = true;
    containerRef.current?.focus();
  }, []);

  const handleBlur = useCallback(() => {
    focusedRef.current = false;
    // Reset all keys on blur so ship doesn't keep drifting
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
