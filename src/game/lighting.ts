// ============================================================
// LIGHTING - Grid-based light propagation system
// ============================================================

import { BlockType } from './types';
import { World } from './world';
import { MAX_LIGHT, SUNLIGHT_LEVEL, TILE_SIZE } from './constants';

export class LightingSystem {
  private world: World;
  private dirty: boolean = true;
  private updateQueue: { x: number; y: number }[] = [];

  constructor(world: World) {
    this.world = world;
  }

  /** Mark lighting as needing recalculation */
  markDirty(): void {
    this.dirty = true;
  }

  /** Queue a light update at specific tile */
  queueUpdate(x: number, y: number): void {
    this.updateQueue.push({ x, y });
    this.dirty = true;
  }

  /** Perform full light calculation */
  calculateLighting(): void {
    const { width, height, lightMap, tiles } = this.world.data;

    // Reset light map
    lightMap.fill(0);

    // Pass 1: Sunlight from above
    for (let x = 0; x < width; x++) {
      let sunlight = SUNLIGHT_LEVEL;
      for (let y = 0; y < height; y++) {
        const idx = y * width + x;
        const tile = tiles[idx] as BlockType;

        if (tile !== BlockType.AIR && tile !== BlockType.LEAVES && tile !== BlockType.TORCH) {
          sunlight = Math.max(0, sunlight - 3);
        } else if (tile === BlockType.LEAVES) {
          sunlight = Math.max(0, sunlight - 1);
        }

        lightMap[idx] = Math.max(lightMap[idx], sunlight);
      }
    }

    // Pass 2: Light emission from torches and other sources
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const tile = tiles[y * width + x] as BlockType;
        if (tile === BlockType.TORCH) {
          this.spreadLight(x, y, 12);
        }
      }
    }

    // Pass 3: Propagation (flood fill)
    this.propagateLight();

    this.dirty = false;
  }

  /** Spread light from a point source */
  private spreadLight(cx: number, cy: number, radius: number): void {
    const { width, height, lightMap } = this.world.data;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        const lightLevel = Math.max(0, Math.floor(radius - dist));
        const idx = y * width + x;
        lightMap[idx] = Math.max(lightMap[idx], lightLevel);
      }
    }
  }

  /** Simple light propagation pass */
  private propagateLight(): void {
    const { width, height, lightMap, tiles } = this.world.data;
    const iterations = 4;

    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const currentLight = lightMap[idx];
          if (currentLight <= 1) continue;

          const neighbors = [
            [x - 1, y], [x + 1, y],
            [x, y - 1], [x, y + 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const nIdx = ny * width + nx;
            const tile = tiles[nIdx] as BlockType;
            const decay = (tile !== BlockType.AIR && tile !== BlockType.TORCH && tile !== BlockType.LEAVES) ? 3 : 1;
            const propagated = currentLight - decay;

            if (propagated > lightMap[nIdx]) {
              lightMap[nIdx] = propagated;
            }
          }
        }
      }
    }
  }

  /** Get darkness overlay alpha for a tile position */
  getDarkness(x: number, y: number): number {
    const light = this.world.getLight(x, y);
    // Convert light level (0-15) to darkness (0-1 where 1 is full dark)
    return 1 - (light / MAX_LIGHT);
  }

  /** Check if lighting needs update */
  needsUpdate(): boolean {
    return this.dirty;
  }
}
