// ============================================================
// WORLD GENERATION - Procedural terrain with biomes, caves, ores
// ============================================================

import { SimplexNoise } from './noise';
import { BlockType, WorldData } from './types';
import { WORLD_WIDTH, WORLD_HEIGHT, SURFACE_LEVEL } from './constants';

export class World {
  data: WorldData;
  private noise: SimplexNoise;
  private caveNoise: SimplexNoise;
  private oreNoise: SimplexNoise;
  private biomeNoise: SimplexNoise;

  constructor(seed?: number) {
    this.noise = new SimplexNoise(seed || Math.random() * 65536);
    this.caveNoise = new SimplexNoise((seed || 12345) + 1000);
    this.oreNoise = new SimplexNoise((seed || 12345) + 2000);
    this.biomeNoise = new SimplexNoise((seed || 12345) + 3000);

    this.data = {
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      tiles: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT),
      walls: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT),
      lightMap: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT),
      spawnX: WORLD_WIDTH / 2,
      spawnY: 0,
    };

    this.generate();
  }

  private getTerrainHeight(x: number): number {
    // Multi-octave terrain height
    const base = this.noise.octaveNoise2D(x, 0, 4, 0.5, 0.008);
    const detail = this.noise.octaveNoise2D(x, 100, 3, 0.4, 0.03);
    const mountains = this.noise.octaveNoise2D(x, 200, 2, 0.6, 0.004);

    // Combine for varied terrain
    let height = SURFACE_LEVEL + base * 30 + detail * 8;

    // Add mountain regions
    const mountainFactor = Math.max(0, mountains);
    height -= mountainFactor * 40;

    return Math.floor(height);
  }

  private getBiome(x: number): 'plains' | 'desert' | 'snow' | 'forest' {
    const biomeValue = this.biomeNoise.noise2D(x * 0.003, 0);
    if (biomeValue < -0.4) return 'desert';
    if (biomeValue < 0) return 'plains';
    if (biomeValue < 0.4) return 'forest';
    return 'snow';
  }

  private generate(): void {
    const { width, height, tiles, walls } = this.data;

    // Generate terrain heights for spawn finding
    const heights: number[] = [];

    // Pass 1: Generate surface terrain
    for (let x = 0; x < width; x++) {
      const surfaceY = this.getTerrainHeight(x);
      heights[x] = surfaceY;
      const biome = this.getBiome(x);

      for (let y = 0; y < height; y++) {
        const idx = y * width + x;

        if (y === height - 1) {
          // Bedrock at bottom
          tiles[idx] = BlockType.BEDROCK;
          walls[idx] = BlockType.BEDROCK;
        } else if (y > surfaceY + 5) {
          // Underground - stone
          tiles[idx] = BlockType.STONE;
          walls[idx] = BlockType.STONE;
        } else if (y > surfaceY) {
          // Sub-surface layer
          if (biome === 'desert') {
            tiles[idx] = BlockType.SAND;
            walls[idx] = BlockType.SAND;
          } else {
            tiles[idx] = BlockType.DIRT;
            walls[idx] = BlockType.DIRT;
          }
        } else if (y === surfaceY) {
          // Surface block
          switch (biome) {
            case 'desert':
              tiles[idx] = BlockType.SAND;
              walls[idx] = BlockType.SAND;
              break;
            case 'snow':
              tiles[idx] = BlockType.SNOW;
              walls[idx] = BlockType.DIRT;
              break;
            default:
              tiles[idx] = BlockType.GRASS;
              walls[idx] = BlockType.DIRT;
              break;
          }
        } else {
          // Above ground - air
          tiles[idx] = BlockType.AIR;
          walls[idx] = BlockType.AIR;
        }
      }
    }

    // Pass 2: Generate caves
    for (let x = 0; x < width; x++) {
      for (let y = heights[x] + 5; y < height - 1; y++) {
        const idx = y * width + x;
        if (tiles[idx] === BlockType.AIR) continue;

        const cave1 = this.caveNoise.octaveNoise2D(x, y, 3, 0.5, 0.04);
        const cave2 = this.caveNoise.octaveNoise2D(x + 500, y + 500, 2, 0.5, 0.06);

        // Cave threshold - deeper = more caves
        const depth = (y - heights[x]) / (height - heights[x]);
        const threshold = 0.3 + depth * 0.15;

        if (cave1 > threshold || (cave1 > 0.2 && cave2 > 0.3)) {
          tiles[idx] = BlockType.AIR;
        }
      }
    }

    // Pass 3: Generate ores
    for (let x = 0; x < width; x++) {
      for (let y = heights[x] + 10; y < height - 1; y++) {
        const idx = y * width + x;
        if (tiles[idx] !== BlockType.STONE) continue;

        const depth = y - heights[x];
        const oreVal = this.oreNoise.noise2D(x * 0.1, y * 0.1);
        const oreVal2 = this.oreNoise.noise2D(x * 0.15 + 100, y * 0.15 + 100);

        // Coal - common, shallow
        if (oreVal > 0.6 && depth > 10) {
          tiles[idx] = BlockType.COAL_ORE;
        }
        // Iron - medium, medium depth
        else if (oreVal2 > 0.65 && depth > 30) {
          tiles[idx] = BlockType.IRON_ORE;
        }
        // Gold - rare, deep
        else if (oreVal > 0.72 && depth > 60) {
          tiles[idx] = BlockType.GOLD_ORE;
        }
        // Diamond - very rare, very deep
        else if (oreVal2 > 0.78 && depth > 100) {
          tiles[idx] = BlockType.DIAMOND_ORE;
        }
      }
    }

    // Pass 4: Generate trees
    for (let x = 5; x < width - 5; x++) {
      const surfaceY = heights[x];
      const biome = this.getBiome(x);

      if (biome === 'desert') continue; // No trees in desert

      // Tree probability based on biome
      const treeChance = biome === 'forest' ? 0.12 : biome === 'snow' ? 0.03 : 0.06;
      const treeNoise = this.noise.noise2D(x * 0.5, 500);

      if (treeNoise > 1 - treeChance * 2 && tiles[surfaceY * width + x] === BlockType.GRASS) {
        this.generateTree(x, surfaceY);
      }
    }

    // Find spawn point
    const spawnX = Math.floor(width / 2);
    this.data.spawnX = spawnX;
    this.data.spawnY = heights[spawnX] - 3;
  }

  private generateTree(x: number, surfaceY: number): void {
    const { width, tiles } = this.data;
    const treeHeight = 5 + Math.floor(Math.random() * 4);

    // Trunk
    for (let ty = 1; ty <= treeHeight; ty++) {
      const y = surfaceY - ty;
      if (y >= 0 && y < this.data.height) {
        tiles[y * width + x] = BlockType.WOOD;
      }
    }

    // Leaves (circular canopy)
    const leafStart = surfaceY - treeHeight - 1;
    for (let ly = -2; ly <= 1; ly++) {
      for (let lx = -2; lx <= 2; lx++) {
        const px = x + lx;
        const py = leafStart + ly;
        if (px >= 0 && px < width && py >= 0 && py < this.data.height) {
          const dist = Math.abs(lx) + Math.abs(ly);
          if (dist <= 3 && tiles[py * width + px] === BlockType.AIR) {
            tiles[py * width + px] = BlockType.LEAVES;
          }
        }
      }
    }
  }

  /** Get block at tile coordinates */
  getTile(x: number, y: number): BlockType {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) {
      return BlockType.AIR;
    }
    return this.data.tiles[y * this.data.width + x] as BlockType;
  }

  /** Set block at tile coordinates */
  setTile(x: number, y: number, type: BlockType): void {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) return;
    this.data.tiles[y * this.data.width + x] = type;
  }

  /** Get wall at tile coordinates */
  getWall(x: number, y: number): BlockType {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) {
      return BlockType.AIR;
    }
    return this.data.walls[y * this.data.width + x] as BlockType;
  }

  /** Set wall at tile coordinates */
  setWall(x: number, y: number, type: BlockType): void {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) return;
    this.data.walls[y * this.data.width + x] = type;
  }

  /** Check if a tile is solid */
  isSolid(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== BlockType.AIR && tile !== BlockType.LEAVES && tile !== BlockType.TORCH && tile !== BlockType.WATER && tile !== BlockType.WOOD;
  }

  /** Get light level at position */
  getLight(x: number, y: number): number {
    if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height) return 15;
    return this.data.lightMap[y * this.data.width + x];
  }
}
