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
          <div className="text-4xl mb-4">⛏️</div>
          <h1 className="text-white text-2xl font-bold mb-2">TerraCraft</h1>
          <p className="text-gray-400 text-sm">Generating world...</p>
          <div className="mt-4 w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '70%' }} />
          </div>
        </div>
      )}

      {/* Click to focus overlay */}
      {!isLoading && !isFocused && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-40 cursor-pointer"
             onClick={handleCanvasClick}>
          <div className="bg-gray-900/90 border border-gray-600 rounded-lg px-6 py-4 text-center">
            <p className="text-white text-lg font-medium">Click to Play</p>
            <p className="text-gray-400 text-xs mt-1">Click here to focus the game</p>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      {gameState && !isLoading && (
        <>
          {/* Health Bar */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="relative w-48 h-6 bg-gray-800/80 rounded-full border border-gray-600 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                style={{ width: `${(gameState.health / gameState.maxHealth) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold drop-shadow-lg">
                ❤️ {gameState.health} / {gameState.maxHealth}
              </span>
            </div>
          </div>

          {/* Position indicator */}
          <div className="absolute top-4 right-4 text-white/60 text-xs font-mono bg-black/50 px-2 py-1 rounded">
            X: {Math.floor(gameState.position.x / 16)} Y: {Math.floor(gameState.position.y / 16)}
          </div>

          {/* Hotbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: HOTBAR_SLOTS }).map((_, i) => {
              const slot = gameState.inventory[i];
              const isSelected = i === gameState.selectedSlot;
              const itemInfo = slot ? ITEM_INFO[slot.item] : null;

              return (
                <div
                  key={i}
                  className={`w-12 h-12 rounded border-2 flex flex-col items-center justify-center relative transition-all duration-100
                    ${isSelected
                      ? 'border-yellow-400 bg-gray-700/90 shadow-lg shadow-yellow-400/30 scale-110'
                      : 'border-gray-500/70 bg-gray-800/80 hover:border-gray-400'
                    }`}
                >
                  {slot && slot.item !== ItemType.NONE && itemInfo && (
                    <>
                      <span className="text-lg leading-none">{itemInfo.icon}</span>
                      {slot.count > 1 && (
                        <span className="absolute bottom-0 right-0.5 text-[10px] text-white font-bold drop-shadow-md">
                          {slot.count}
                        </span>
                      )}
                    </>
                  )}
                  <span className="absolute top-0 left-0.5 text-[9px] text-gray-400/70">
                    {i === 9 ? '0' : i + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Inventory Panel */}
          {gameState.showInventory && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-gray-600 rounded-lg p-4 min-w-[360px] shadow-2xl z-30">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-white font-bold text-lg">📦 Inventory</h2>
                <button
                  onClick={handleToggleInventory}
                  className="text-gray-400 hover:text-white text-xl transition-colors"
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
                      className={`w-9 h-9 rounded border flex items-center justify-center relative
                        ${i < HOTBAR_SLOTS ? 'border-yellow-600/50 bg-gray-700/50' : 'border-gray-600/50 bg-gray-800/80'}
                        hover:border-white/50 transition-colors`}
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
              <p className="text-gray-400 text-xs mt-3 text-center">Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">E</kbd> to close</p>
            </div>
          )}

          {/* Crafting Panel */}
          {gameState.showCrafting && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-gray-600 rounded-lg p-4 min-w-[400px] max-h-[80vh] overflow-y-auto shadow-2xl z-30">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-white font-bold text-lg">🔨 Crafting</h2>
                <button
                  onClick={handleToggleCrafting}
                  className="text-gray-400 hover:text-white text-xl transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {gameState.availableRecipes.map((recipe, idx) => {
                  const resultInfo = ITEM_INFO[recipe.result.item];
                  const canCraft = gameState.canCraft[idx];

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2 rounded border transition-all ${
                        canCraft
                          ? 'border-green-600/50 bg-green-900/20 cursor-pointer hover:bg-green-900/40 hover:border-green-500/70'
                          : 'border-gray-700/50 bg-gray-800/30 opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => canCraft && handleCraft(idx)}
                    >
                      {/* Result */}
                      <div className="flex items-center gap-1.5 min-w-[100px]">
                        <span className="text-lg">{resultInfo?.icon}</span>
                        <span className="text-white text-sm font-medium">
                          {resultInfo?.name}
                        </span>
                        <span className="text-green-400 text-xs">×{recipe.result.count}</span>
                      </div>

                      {/* Arrow */}
                      <span className="text-gray-500 text-sm">←</span>

                      {/* Ingredients */}
                      <div className="flex gap-2 flex-wrap">
                        {recipe.ingredients.map((ing, j) => {
                          const ingInfo = ITEM_INFO[ing.item];
                          const hasAmount = gameState.inventory.reduce((sum, s) =>
                            s.item === ing.item ? sum + s.count : sum, 0
                          );
                          const hasEnough = hasAmount >= ing.count;

                          return (
                            <div key={j} className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
                              hasEnough ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'
                            }`}>
                              <span>{ingInfo?.icon}</span>
                              <span>{hasAmount}/{ing.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-gray-400 text-xs mt-3 text-center">Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300">C</kbd> to close • Click recipe to craft</p>
            </div>
          )}

          {/* Help tooltip */}
          {showHelp && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/85 border border-gray-600 rounded-lg p-4 text-white text-sm max-w-sm shadow-xl z-20">
              <h3 className="font-bold text-yellow-400 mb-2 text-center">🎮 Controls</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <span className="text-gray-300">Move:</span><span>A/D or ←/→</span>
                <span className="text-gray-300">Jump:</span><span>W / Space / ↑</span>
                <span className="text-gray-300">Break block:</span><span>Left Click (hold)</span>
                <span className="text-gray-300">Place block:</span><span>Right Click</span>
                <span className="text-gray-300">Select slot:</span><span>1-0 or Scroll</span>
                <span className="text-gray-300">Inventory:</span><span>E</span>
                <span className="text-gray-300">Crafting:</span><span>C</span>
              </div>
              <p className="text-gray-500 text-[10px] mt-2 text-center">Mine resources, craft tools, build structures!</p>
            </div>
          )}

          {/* Persistent controls hint */}
          <div className="absolute bottom-20 left-4 text-white/30 text-[10px] space-y-0.5 pointer-events-none">
            <div>E: Inventory | C: Craft</div>
            <div>LMB: Break | RMB: Place</div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
