// ============================================================
// APP.tsx - Main React component with game canvas and UI overlay
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { Game, GameState } from './game/Game';
import { ItemType, InventorySlot } from './game/types';
import { ITEM_INFO, HOTBAR_SLOTS } from './game/constants';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current) return;

    // Small delay to ensure canvas is properly sized
    const initTimer = setTimeout(() => {
      if (!canvasRef.current) return;

      const game = new Game(canvasRef.current);
      gameRef.current = game;

      game.onUIUpdate = (state: GameState) => {
        setGameState(state);
      };

      game.start();
      setIsLoading(false);

      // Hide help after 8 seconds
      const helpTimer = setTimeout(() => setShowHelp(false), 8000);

      return () => {
        game.stop();
        clearTimeout(helpTimer);
      };
    }, 100);

    return () => clearTimeout(initTimer);
  }, []);

  // Handle crafting
  const handleCraft = useCallback((recipeIndex: number) => {
    if (gameRef.current) {
      gameRef.current.craftItem(recipeIndex);
    }
  }, []);

  // Handle inventory toggle
  const handleToggleInventory = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.toggleInventory();
    }
  }, []);

  const handleToggleCrafting = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.toggleCrafting();
    }
  }, []);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    if (gameRef.current) {
      const muted = gameRef.current.toggleMute();
      setIsMuted(muted);
    }
  }, []);

  // Focus canvas on click
  const handleCanvasClick = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.focus();
      setIsFocused(true);
    }
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative select-none">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        tabIndex={0}
        onClick={handleCanvasClick}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {/* Loading Screen */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-50">
          <div className="text-5xl mb-4 animate-bounce">⛏️</div>
          <h1 className="text-white text-3xl font-bold mb-2 tracking-wider">TerraCraft</h1>
          <p className="text-gray-400 text-sm">Generating world...</p>
          <div className="mt-4 w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full animate-pulse" style={{ width: '70%' }} />
          </div>
          <p className="text-gray-600 text-xs mt-6">A 2D Sandbox Adventure</p>
        </div>
      )}

      {/* Click to focus overlay */}
      {!isLoading && !isFocused && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-40 cursor-pointer backdrop-blur-sm"
             onClick={handleCanvasClick}>
          <div className="bg-gray-900/90 border border-gray-600 rounded-xl px-8 py-6 text-center shadow-2xl">
            <p className="text-white text-xl font-bold mb-1">🎮 Click to Play</p>
            <p className="text-gray-400 text-sm">Click anywhere to focus the game</p>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      {gameState && !isLoading && (
        <>
          {/* Top Bar */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none">
            {/* Health Bar */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="relative w-44 h-5 bg-gray-800/80 rounded-full border border-gray-600/50 overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300 rounded-full"
                  style={{ width: `${(gameState.health / gameState.maxHealth) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow-lg">
                  ❤️ {gameState.health} / {gameState.maxHealth}
                </span>
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Depth indicator */}
              {(() => {
                const depth = Math.floor(gameState.position.y / 16) - 150;
                if (depth > 5) {
                  return (
                    <div className="text-amber-400/70 text-[10px] font-mono bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                      ⬇ {depth}m deep
                    </div>
                  );
                }
                return null;
              })()}
              {/* Position */}
              <div className="text-white/50 text-[10px] font-mono bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                X:{Math.floor(gameState.position.x / 16)} Y:{Math.floor(gameState.position.y / 16)}
              </div>
              {/* Mute button */}
              <button
                onClick={handleToggleMute}
                className="text-white/60 hover:text-white bg-black/40 px-2 py-1 rounded text-xs backdrop-blur-sm transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
            </div>
          </div>

          {/* Hotbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-0.5">
            {Array.from({ length: HOTBAR_SLOTS }).map((_, i) => {
              const slot = gameState.inventory[i];
              const isSelected = i === gameState.selectedSlot;
              const itemInfo = slot ? ITEM_INFO[slot.item] : null;

              return (
                <div
                  key={i}
                  className={`w-11 h-11 rounded-md border-2 flex flex-col items-center justify-center relative transition-all duration-75
                    ${isSelected
                      ? 'border-yellow-400 bg-gray-700/90 shadow-lg shadow-yellow-400/20 scale-110 z-10'
                      : 'border-gray-600/60 bg-gray-800/70 hover:border-gray-400/60'
                    }`}
                  title={itemInfo?.name || `Slot ${i + 1}`}
                >
                  {slot && slot.item !== ItemType.NONE && itemInfo && (
                    <>
                      <span className="text-base leading-none">{itemInfo.icon}</span>
                      {slot.count > 1 && (
                        <span className="absolute bottom-0 right-0.5 text-[9px] text-white font-bold drop-shadow-md">
                          {slot.count}
                        </span>
                      )}
                    </>
                  )}
                  <span className="absolute top-0 left-0.5 text-[8px] text-gray-500">
                    {i === 9 ? '0' : i + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Inventory Panel */}
          {gameState.showInventory && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-gray-600 rounded-xl p-5 min-w-[380px] shadow-2xl z-30 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <span>📦</span> Inventory
                </h2>
                <button
                  onClick={handleToggleInventory}
                  className="text-gray-400 hover:text-white text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {gameState.inventory.map((slot: InventorySlot, i: number) => {
                  const itemInfo = ITEM_INFO[slot.item];
                  return (
                    <div
                      key={i}
                      className={`w-9 h-9 rounded border flex items-center justify-center relative transition-colors
                        ${i < HOTBAR_SLOTS
                          ? 'border-yellow-700/40 bg-gray-700/50'
                          : 'border-gray-600/40 bg-gray-800/70'
                        }
                        hover:border-white/40 hover:bg-gray-600/50`}
                      title={itemInfo?.name || ''}
                    >
                      {slot.item !== ItemType.NONE && itemInfo && (
                        <>
                          <span className="text-sm">{itemInfo.icon}</span>
                          {slot.count > 1 && (
                            <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold">
                              {slot.count}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-center">
                <p className="text-gray-500 text-xs">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px]">E</kbd> to close
                </p>
              </div>
            </div>
          )}

          {/* Crafting Panel */}
          {gameState.showCrafting && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-gray-600 rounded-xl p-5 min-w-[420px] max-h-[75vh] overflow-y-auto shadow-2xl z-30 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <span>🔨</span> Crafting
                </h2>
                <button
                  onClick={handleToggleCrafting}
                  className="text-gray-400 hover:text-white text-lg w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5">
                {gameState.availableRecipes.map((recipe, idx) => {
                  const resultInfo = ITEM_INFO[recipe.result.item];
                  const canCraft = gameState.canCraft[idx];

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                        canCraft
                          ? 'border-green-700/40 bg-green-900/15 cursor-pointer hover:bg-green-900/30 hover:border-green-500/50 active:scale-[0.98]'
                          : 'border-gray-700/30 bg-gray-800/20 opacity-40 cursor-not-allowed'
                      }`}
                      onClick={() => canCraft && handleCraft(idx)}
                    >
                      {/* Result */}
                      <div className="flex items-center gap-1.5 min-w-[110px]">
                        <span className="text-lg">{resultInfo?.icon}</span>
                        <div>
                          <span className="text-white text-sm font-medium block leading-tight">
                            {resultInfo?.name}
                          </span>
                          <span className="text-green-400/70 text-[10px]">×{recipe.result.count}</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <span className="text-gray-500 text-xs">←</span>

                      {/* Ingredients */}
                      <div className="flex gap-1.5 flex-wrap">
                        {recipe.ingredients.map((ing, j) => {
                          const ingInfo = ITEM_INFO[ing.item];
                          const hasAmount = gameState.inventory.reduce((sum, s) =>
                            s.item === ing.item ? sum + s.count : sum, 0
                          );
                          const hasEnough = hasAmount >= ing.count;

                          return (
                            <div key={j} className={`flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded ${
                              hasEnough ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'
                            }`}>
                              <span className="text-xs">{ingInfo?.icon}</span>
                              <span className="font-mono">{hasAmount}/{ing.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-center">
                <p className="text-gray-500 text-xs">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px]">C</kbd> to close • Click to craft
                </p>
              </div>
            </div>
          )}

          {/* Help tooltip */}
          {showHelp && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/85 border border-gray-600/50 rounded-xl p-4 text-white text-sm max-w-xs shadow-xl z-20 backdrop-blur-sm">
              <h3 className="font-bold text-yellow-400 mb-2 text-center text-sm">🎮 Controls</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                <span className="text-gray-300">Move:</span><span className="text-gray-100">A/D or ←/→</span>
                <span className="text-gray-300">Jump:</span><span className="text-gray-100">W / Space / ↑</span>
                <span className="text-gray-300">Break:</span><span className="text-gray-100">Left Click (hold)</span>
                <span className="text-gray-300">Place:</span><span className="text-gray-100">Right Click</span>
                <span className="text-gray-300">Hotbar:</span><span className="text-gray-100">1-0 or Scroll</span>
                <span className="text-gray-300">Inventory:</span><span className="text-gray-100">E</span>
                <span className="text-gray-300">Crafting:</span><span className="text-gray-100">C</span>
              </div>
              <p className="text-gray-500 text-[10px] mt-2 text-center italic">Mine • Craft • Build • Explore</p>
            </div>
          )}

          {/* Persistent mini controls */}
          <div className="absolute bottom-[72px] left-3 text-white/25 text-[9px] space-y-0.5 pointer-events-none">
            <div>E: Inventory | C: Craft</div>
            <div>LMB: Break | RMB: Place</div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
