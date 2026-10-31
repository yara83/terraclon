// ============================================================
// RENDERER - Canvas rendering with frustum culling & lighting
// ============================================================

import { BlockType, CameraState, Particle, DroppedItem } from './types';
import { World } from './world';
import { Camera } from './camera';
import { Player } from './player';
import { BLOCK_INFO, TILE_SIZE, SKY_COLOR_TOP, SKY_COLOR_BOTTOM } from './constants';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private tileCache: Map<number, HTMLCanvasElement> = new Map();
  private frameCount: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Clear the canvas and draw sky gradient */
  clear(camera: Camera): void {
    const { ctx } = this;
    const { width, height } = this.canvas;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, SKY_COLOR_TOP);
    gradient.addColorStop(1, SKY_COLOR_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /** Render the world tiles with frustum culling */
  renderWorld(world: World, camera: Camera): void {
    const { ctx } = this;
    const range = camera.getVisibleRange();
    const { width: worldWidth, height: worldHeight } = world.data;

    // Clamp to world bounds
    const startCol = Math.max(0, range.startCol);
    const endCol = Math.min(worldWidth - 1, range.endCol);
    const startRow = Math.max(0, range.startRow);
    const endRow = Math.min(worldHeight - 1, range.endRow);

    // Render background walls first
    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const wall = world.getWall(x, y);
        if (wall !== BlockType.AIR) {
          const screenPos = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
          const info = BLOCK_INFO[wall];
          if (info) {
            ctx.fillStyle = this.darkenColor(info.color, 0.5);
            ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
          }
        }
      }
    }

    // Render foreground tiles
    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const tile = world.getTile(x, y);
        if (tile === BlockType.AIR) continue;

        const screenPos = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
        const info = BLOCK_INFO[tile];
        if (!info) continue;

        // Draw tile
        ctx.fillStyle = info.color;
        ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);

        // Add texture detail for some blocks
        this.drawTileDetail(ctx, tile, screenPos.x, screenPos.y, x, y);
      }
    }

    // Render lighting overlay
    this.renderLighting(world, camera, startCol, endCol, startRow, endRow);
  }

  /** Draw tile texture details */
  private drawTileDetail(ctx: CanvasRenderingContext2D, tile: BlockType, sx: number, sy: number, tx: number, ty: number): void {
    const seed = (tx * 73856093) ^ (ty * 19349663);

    switch (tile) {
      case BlockType.GRASS:
        // Green top edge
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(sx, sy, TILE_SIZE, 3);
        // Grass blades
        ctx.fillStyle = '#81C784';
        for (let i = 0; i < 3; i++) {
          const bx = sx + ((seed >> (i * 4)) & 0xF);
          ctx.fillRect(bx, sy - 1, 1, 2);
        }
        break;

      case BlockType.STONE:
        // Stone cracks
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(sx + (seed & 7), sy + ((seed >> 3) & 7), 3, 1);
        ctx.fillRect(sx + ((seed >> 6) & 7) + 4, sy + ((seed >> 9) & 7) + 4, 2, 2);
        break;

      case BlockType.DIRT:
        // Dirt specks
        ctx.fillStyle = '#7A5230';
        ctx.fillRect(sx + (seed & 5), sy + ((seed >> 2) & 5), 2, 2);
        ctx.fillRect(sx + ((seed >> 4) & 7) + 3, sy + ((seed >> 7) & 7) + 3, 1, 1);
        break;

      case BlockType.COAL_ORE:
        ctx.fillStyle = '#808080';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(sx + 3, sy + 3, 4, 4);
        ctx.fillRect(sx + 9, sy + 8, 3, 3);
        break;

      case BlockType.IRON_ORE:
        ctx.fillStyle = '#808080';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#D4A574';
        ctx.fillRect(sx + 2, sy + 4, 4, 3);
        ctx.fillRect(sx + 8, sy + 9, 4, 3);
        break;

      case BlockType.GOLD_ORE:
        ctx.fillStyle = '#808080';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(sx + 3, sy + 3, 3, 3);
        ctx.fillRect(sx + 9, sy + 8, 4, 3);
        break;

      case BlockType.DIAMOND_ORE:
        ctx.fillStyle = '#808080';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(sx + 4, sy + 4, 3, 3);
        ctx.fillRect(sx + 9, sy + 9, 3, 3);
        break;

      case BlockType.WOOD:
        // Wood grain
        ctx.fillStyle = '#5D3A1A';
        ctx.fillRect(sx + 4, sy, 1, TILE_SIZE);
        ctx.fillRect(sx + 10, sy, 1, TILE_SIZE);
        break;

      case BlockType.LEAVES:
        ctx.fillStyle = '#1B5E20';
        ctx.fillRect(sx + (seed & 3), sy + ((seed >> 2) & 3), 3, 3);
        ctx.fillRect(sx + ((seed >> 4) & 7) + 4, sy + ((seed >> 6) & 7) + 4, 2, 2);
        break;

      case BlockType.TORCH:
        // Torch stick
        ctx.fillStyle = '#6D4C2A';
        ctx.fillRect(sx + 6, sy + 6, 3, 10);
        // Flame
        ctx.fillStyle = '#FF9800';
        ctx.fillRect(sx + 5, sy + 2, 5, 5);
        ctx.fillStyle = '#FFEB3B';
        ctx.fillRect(sx + 6, sy + 3, 3, 3);
        break;

      case BlockType.SAND:
        ctx.fillStyle = '#E8C838';
        ctx.fillRect(sx + (seed & 5), sy + ((seed >> 3) & 5), 2, 1);
        break;

      case BlockType.SNOW:
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx, sy, TILE_SIZE, 2);
        break;

      case BlockType.BEDROCK:
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(sx + (seed & 3), sy + ((seed >> 2) & 3), 4, 4);
        ctx.fillRect(sx + ((seed >> 4) & 7) + 4, sy + ((seed >> 7) & 7) + 4, 3, 3);
        break;
    }
  }

  /** Render lighting overlay */
  private renderLighting(world: World, camera: Camera, startCol: number, endCol: number, startRow: number, endRow: number): void {
    const { ctx } = this;

    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const light = world.getLight(x, y);
        if (light >= 15) continue; // Full brightness, no overlay

        const darkness = 1 - (light / 15);
        const screenPos = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);

        ctx.fillStyle = `rgba(0, 0, 0, ${darkness * 0.85})`;
        ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  /** Render the player character */
  renderPlayer(player: Player, camera: Camera): void {
    const { ctx } = this;
    const s = player.state;
    const screenPos = camera.worldToScreen(s.x, s.y);

    // Body
    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(screenPos.x + 4, screenPos.y + 12, 12, 16);

    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.fillRect(screenPos.x + 5, screenPos.y + 2, 10, 10);

    // Eyes
    ctx.fillStyle = '#333';
    if (s.facingRight) {
      ctx.fillRect(screenPos.x + 11, screenPos.y + 5, 2, 2);
    } else {
      ctx.fillRect(screenPos.x + 7, screenPos.y + 5, 2, 2);
    }

    // Legs
    ctx.fillStyle = '#5D4037';
    const legOffset = Math.sin(this.frameCount * 0.15) * 2;
    ctx.fillRect(screenPos.x + 5, screenPos.y + 28, 4, 12);
    ctx.fillRect(screenPos.x + 11, screenPos.y + 28, 4, 12);

    // Arms
    ctx.fillStyle = '#FFCC80';
    const armSwing = Math.sin(this.frameCount * 0.15) * 3;
    ctx.fillRect(screenPos.x + 1, screenPos.y + 13 + armSwing, 4, 10);
    ctx.fillRect(screenPos.x + 15, screenPos.y + 13 - armSwing, 4, 10);

    // Hair
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(screenPos.x + 4, screenPos.y, 12, 4);
  }

  /** Render dropped items */
  renderDroppedItems(items: DroppedItem[], camera: Camera): void {
    const { ctx } = this;
    for (const item of items) {
      const screenPos = camera.worldToScreen(item.x, item.y);
      const bobY = Math.sin(this.frameCount * 0.05 + item.x) * 2;

      ctx.fillStyle = '#FFD700';
      ctx.fillRect(screenPos.x + 2, screenPos.y + bobY + 2, 8, 8);
      ctx.fillStyle = '#FFF';
      ctx.fillRect(screenPos.x + 4, screenPos.y + bobY + 4, 4, 4);
    }
  }

  /** Render particles */
  renderParticles(particles: Particle[], camera: Camera): void {
    const { ctx } = this;
    for (const p of particles) {
      const screenPos = camera.worldToScreen(p.x, p.y);
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(screenPos.x, screenPos.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /** Render block selection highlight */
  renderBlockHighlight(tileX: number, tileY: number, camera: Camera, breakProgress: number): void {
    const { ctx } = this;
    const screenPos = camera.worldToScreen(tileX * TILE_SIZE, tileY * TILE_SIZE);

    // Selection outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);

    // Break progress overlay
    if (breakProgress > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${breakProgress * 0.5})`;
      ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);

      // Crack pattern
      ctx.strokeStyle = `rgba(50, 50, 50, ${breakProgress})`;
      ctx.lineWidth = 1;
      const cracks = Math.floor(breakProgress * 4);
      for (let i = 0; i < cracks; i++) {
        ctx.beginPath();
        ctx.moveTo(screenPos.x + TILE_SIZE / 2, screenPos.y + TILE_SIZE / 2);
        const angle = (i / 4) * Math.PI * 2;
        ctx.lineTo(
          screenPos.x + TILE_SIZE / 2 + Math.cos(angle) * 8,
          screenPos.y + TILE_SIZE / 2 + Math.sin(angle) * 8
        );
        ctx.stroke();
      }
    }
  }

  /** Darken a hex color */
  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
  }

  /** Increment frame counter */
  tick(): void {
    this.frameCount++;
  }

  /** Get canvas context for UI drawing */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /** Get canvas dimensions */
  getSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }
}
