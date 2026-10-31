// ============================================================
// RENDERER - Enhanced canvas rendering with day/night cycle,
// parallax backgrounds, auto-tiling, and visual effects
// ============================================================

import { BlockType, Particle, DroppedItem } from './types';
import { World } from './world';
import { Camera } from './camera';
import { Player } from './player';
import { BLOCK_INFO, TILE_SIZE } from './constants';

/** Time of day system */
export interface DayNightState {
  time: number;        // 0-24000 (game ticks)
  dayLength: number;   // Total ticks per day
  isNight: boolean;
  brightness: number;  // 0-1
  skyColorTop: string;
  skyColorBottom: string;
  sunY: number;
  moonY: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private frameCount: number = 0;
  private dayNight: DayNightState;

  // Parallax cloud positions
  private clouds: { x: number; y: number; w: number; h: number; speed: number }[] = [];

  // Star positions (pre-generated)
  private stars: { x: number; y: number; brightness: number; twinkleSpeed: number }[] = [];

  // Auto-tile lookup table
  private autoTileCache: Map<string, number[][]> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    // Initialize day/night
    this.dayNight = {
      time: 8000, // Start at morning
      dayLength: 24000,
      isNight: false,
      brightness: 1,
      skyColorTop: '#1e3a5f',
      skyColorBottom: '#87CEEB',
      sunY: 0,
      moonY: 0,
    };

    // Generate clouds
    this.generateClouds();
    this.generateStars();
  }

  private generateClouds(): void {
    for (let i = 0; i < 15; i++) {
      this.clouds.push({
        x: Math.random() * 3000 - 500,
        y: 30 + Math.random() * 100,
        w: 80 + Math.random() * 150,
        h: 25 + Math.random() * 30,
        speed: 0.1 + Math.random() * 0.3,
      });
    }
  }

  private generateStars(): void {
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.5,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.02 + Math.random() * 0.05,
      });
    }
  }

  /** Update day/night cycle */
  updateDayNight(): void {
    this.dayNight.time = (this.dayNight.time + 1) % this.dayNight.dayLength;
    const t = this.dayNight.time / this.dayNight.dayLength; // 0-1

    // Determine brightness based on time
    // 0.0-0.25: night -> dawn
    // 0.25-0.5: dawn -> noon
    // 0.5-0.75: noon -> dusk
    // 0.75-1.0: dusk -> night
    if (t < 0.2) {
      // Night
      this.dayNight.brightness = 0.15;
      this.dayNight.isNight = true;
      this.dayNight.skyColorTop = '#0a0a2e';
      this.dayNight.skyColorBottom = '#1a1a3e';
    } else if (t < 0.3) {
      // Dawn
      const p = (t - 0.2) / 0.1;
      this.dayNight.brightness = 0.15 + p * 0.85;
      this.dayNight.isNight = false;
      this.dayNight.skyColorTop = this.lerpColor('#0a0a2e', '#FF6B35', p);
      this.dayNight.skyColorBottom = this.lerpColor('#1a1a3e', '#FFB347', p);
    } else if (t < 0.5) {
      // Morning to noon
      const p = (t - 0.3) / 0.2;
      this.dayNight.brightness = 1;
      this.dayNight.isNight = false;
      this.dayNight.skyColorTop = this.lerpColor('#FF6B35', '#1e90ff', p);
      this.dayNight.skyColorBottom = this.lerpColor('#FFB347', '#87CEEB', p);
    } else if (t < 0.7) {
      // Afternoon
      this.dayNight.brightness = 1;
      this.dayNight.isNight = false;
      this.dayNight.skyColorTop = '#1e90ff';
      this.dayNight.skyColorBottom = '#87CEEB';
    } else if (t < 0.8) {
      // Dusk
      const p = (t - 0.7) / 0.1;
      this.dayNight.brightness = 1 - p * 0.85;
      this.dayNight.isNight = false;
      this.dayNight.skyColorTop = this.lerpColor('#1e90ff', '#FF4500', p);
      this.dayNight.skyColorBottom = this.lerpColor('#87CEEB', '#FF6347', p);
    } else {
      // Night
      const p = (t - 0.8) / 0.2;
      this.dayNight.brightness = 0.15;
      this.dayNight.isNight = true;
      this.dayNight.skyColorTop = this.lerpColor('#FF4500', '#0a0a2e', Math.min(1, p * 2));
      this.dayNight.skyColorBottom = this.lerpColor('#FF6347', '#1a1a3e', Math.min(1, p * 2));
    }

    // Sun/Moon position
    const angle = t * Math.PI * 2 - Math.PI / 2;
    this.dayNight.sunY = Math.sin(angle) * 0.5 + 0.5;
    this.dayNight.moonY = Math.sin(angle + Math.PI) * 0.5 + 0.5;
  }

  /** Lerp between two hex colors */
  private lerpColor(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const blue = Math.round(ab + (bb - ab) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
  }

  /** Clear the canvas with dynamic sky */
  clear(camera: Camera): void {
    const { ctx } = this;
    const { width, height } = this.canvas;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, this.dayNight.skyColorTop);
    gradient.addColorStop(1, this.dayNight.skyColorBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Stars (visible at night)
    if (this.dayNight.isNight || this.dayNight.brightness < 0.5) {
      const starAlpha = this.dayNight.isNight ? 1 : (0.5 - this.dayNight.brightness) * 2;
      this.renderStars(starAlpha);
    }

    // Sun or Moon
    this.renderCelestialBodies();

    // Mountains (parallax background)
    this.renderMountains(camera);

    // Clouds (parallax)
    this.renderClouds(camera);
  }

  /** Render twinkling stars */
  private renderStars(alpha: number): void {
    const { ctx } = this;
    const { width, height } = this.canvas;

    for (const star of this.stars) {
      const twinkle = Math.sin(this.frameCount * star.twinkleSpeed) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * star.brightness * twinkle})`;
      const size = star.brightness > 0.7 ? 2 : 1;
      ctx.fillRect(star.x * width, star.y * height, size, size);
    }
  }

  /** Render sun and moon */
  private renderCelestialBodies(): void {
    const { ctx } = this;
    const { width, height } = this.canvas;

    if (!this.dayNight.isNight) {
      // Sun
      const sunX = width * 0.7;
      const sunY = height * 0.15 + (1 - this.dayNight.sunY) * height * 0.3;
      if (sunY < height * 0.6) {
        // Sun glow
        const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 40);
        glow.addColorStop(0, 'rgba(255, 220, 100, 0.8)');
        glow.addColorStop(0.5, 'rgba(255, 180, 50, 0.3)');
        glow.addColorStop(1, 'rgba(255, 150, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sunX - 40, sunY - 40, 80, 80);

        // Sun body
        ctx.fillStyle = '#FFE066';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Moon
      const moonX = width * 0.3;
      const moonY = height * 0.1 + (1 - this.dayNight.moonY) * height * 0.25;
      if (moonY < height * 0.5) {
        // Moon glow
        const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 30);
        glow.addColorStop(0, 'rgba(200, 220, 255, 0.4)');
        glow.addColorStop(1, 'rgba(200, 220, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(moonX - 30, moonY - 30, 60, 60);

        // Moon body
        ctx.fillStyle = '#E8E8F0';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 14, 0, Math.PI * 2);
        ctx.fill();

        // Moon craters
        ctx.fillStyle = '#C8C8D0';
        ctx.beginPath();
        ctx.arc(moonX - 4, moonY - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moonX + 5, moonY + 4, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** Render parallax background mountains */
  private renderMountains(camera: Camera): void {
    const { ctx } = this;
    const { width, height } = this.canvas;

    // Far mountains (very slow parallax)
    const farOffset = camera.state.x * 0.02;
    ctx.fillStyle = this.dayNight.isNight ? 'rgba(20, 20, 50, 0.6)' : 'rgba(100, 130, 160, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.6);
    for (let x = 0; x <= width; x += 40) {
      const mountainHeight = Math.sin((x + farOffset) * 0.005) * 60 +
                            Math.sin((x + farOffset) * 0.012) * 30 +
                            Math.sin((x + farOffset) * 0.003) * 40;
      ctx.lineTo(x, height * 0.45 - mountainHeight);
    }
    ctx.lineTo(width, height * 0.6);
    ctx.closePath();
    ctx.fill();

    // Near mountains (medium parallax)
    const nearOffset = camera.state.x * 0.05;
    ctx.fillStyle = this.dayNight.isNight ? 'rgba(15, 15, 40, 0.7)' : 'rgba(70, 100, 130, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.65);
    for (let x = 0; x <= width; x += 30) {
      const mountainHeight = Math.sin((x + nearOffset) * 0.008) * 50 +
                            Math.sin((x + nearOffset) * 0.02) * 25 +
                            Math.cos((x + nearOffset) * 0.004) * 35;
      ctx.lineTo(x, height * 0.5 - mountainHeight);
    }
    ctx.lineTo(width, height * 0.65);
    ctx.closePath();
    ctx.fill();
  }

  /** Render parallax clouds */
  private renderClouds(camera: Camera): void {
    const { ctx } = this;
    const { width } = this.canvas;
    const cloudAlpha = this.dayNight.isNight ? 0.15 : 0.6 * this.dayNight.brightness;

    for (const cloud of this.clouds) {
      // Parallax: clouds move at 10% of camera speed
      const screenX = cloud.x - camera.state.x * 0.1;
      const wrappedX = ((screenX % (width + cloud.w * 2)) + width + cloud.w * 2) % (width + cloud.w * 2) - cloud.w;

      ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha})`;

      // Cloud shape (multiple overlapping circles)
      const cx = wrappedX;
      const cy = cloud.y;
      ctx.beginPath();
      ctx.ellipse(cx + cloud.w * 0.3, cy, cloud.w * 0.25, cloud.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + cloud.w * 0.5, cy - cloud.h * 0.2, cloud.w * 0.3, cloud.h * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + cloud.w * 0.7, cy, cloud.w * 0.2, cloud.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Move cloud
      cloud.x += cloud.speed;
      if (cloud.x > 4000) cloud.x = -500;
    }
  }

  /** Render the world tiles with frustum culling and auto-tiling */
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
            ctx.fillStyle = this.darkenColor(info.color, 0.4);
            ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
            // Wall texture
            ctx.fillStyle = this.darkenColor(info.color, 0.35);
            const seed = (x * 73856093) ^ (y * 19349663);
            ctx.fillRect(screenPos.x + (seed & 3), screenPos.y + ((seed >> 2) & 3), 3, 3);
          }
        }
      }
    }

    // Render foreground tiles with auto-tiling
    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const tile = world.getTile(x, y);
        if (tile === BlockType.AIR) continue;

        const screenPos = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
        const info = BLOCK_INFO[tile];
        if (!info) continue;

        // Draw base tile
        ctx.fillStyle = info.color;
        ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);

        // Auto-tile borders (darker edges where block meets air)
        this.drawAutoTileBorders(ctx, world, tile, x, y, screenPos.x, screenPos.y);

        // Add texture detail
        this.drawTileDetail(ctx, tile, screenPos.x, screenPos.y, x, y);
      }
    }

    // Render lighting overlay
    this.renderLighting(world, camera, startCol, endCol, startRow, endRow);
  }

  /** Draw auto-tile borders for seamless block connections */
  private drawAutoTileBorders(
    ctx: CanvasRenderingContext2D, world: World,
    tile: BlockType, x: number, y: number,
    sx: number, sy: number
  ): void {
    const info = BLOCK_INFO[tile];
    if (!info || info.transparent) return;

    const darkerColor = this.darkenColor(info.color, 0.7);
    const edgeSize = 2;

    // Check neighbors
    const top = world.getTile(x, y - 1);
    const bottom = world.getTile(x, y + 1);
    const left = world.getTile(x - 1, y);
    const right = world.getTile(x + 1, y);

    const topInfo = BLOCK_INFO[top];
    const bottomInfo = BLOCK_INFO[bottom];
    const leftInfo = BLOCK_INFO[left];
    const rightInfo = BLOCK_INFO[right];

    // Draw darker edges where block meets air/transparent
    if (top === BlockType.AIR || (topInfo && topInfo.transparent)) {
      ctx.fillStyle = this.lightenColor(info.color, 1.2);
      ctx.fillRect(sx, sy, TILE_SIZE, edgeSize);
    }
    if (bottom === BlockType.AIR || (bottomInfo && bottomInfo.transparent)) {
      ctx.fillStyle = darkerColor;
      ctx.fillRect(sx, sy + TILE_SIZE - edgeSize, TILE_SIZE, edgeSize);
    }
    if (left === BlockType.AIR || (leftInfo && leftInfo.transparent)) {
      ctx.fillStyle = darkerColor;
      ctx.fillRect(sx, sy, edgeSize, TILE_SIZE);
    }
    if (right === BlockType.AIR || (rightInfo && rightInfo.transparent)) {
      ctx.fillStyle = darkerColor;
      ctx.fillRect(sx + TILE_SIZE - edgeSize, sy, edgeSize, TILE_SIZE);
    }
  }

  /** Draw tile texture details */
  private drawTileDetail(ctx: CanvasRenderingContext2D, tile: BlockType, sx: number, sy: number, tx: number, ty: number): void {
    const seed = (tx * 73856093) ^ (ty * 19349663);

    switch (tile) {
      case BlockType.GRASS:
        // Green top
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(sx, sy, TILE_SIZE, 4);
        ctx.fillStyle = '#81C784';
        ctx.fillRect(sx, sy, TILE_SIZE, 2);
        // Grass blades on top
        ctx.fillStyle = '#4CAF50';
        for (let i = 0; i < 4; i++) {
          const bx = sx + ((seed >> (i * 3)) & 0xF);
          ctx.fillRect(bx, sy - 1, 1, 2);
        }
        break;

      case BlockType.STONE:
        ctx.fillStyle = '#6e6e6e';
        ctx.fillRect(sx + (seed & 7), sy + ((seed >> 3) & 7), 4, 1);
        ctx.fillRect(sx + ((seed >> 6) & 7) + 4, sy + ((seed >> 9) & 5) + 5, 3, 2);
        ctx.fillStyle = '#909090';
        ctx.fillRect(sx + ((seed >> 12) & 5) + 2, sy + ((seed >> 15) & 5) + 2, 2, 1);
        break;

      case BlockType.DIRT:
        ctx.fillStyle = '#7A5230';
        ctx.fillRect(sx + (seed & 5), sy + ((seed >> 2) & 5), 2, 2);
        ctx.fillRect(sx + ((seed >> 4) & 7) + 3, sy + ((seed >> 7) & 7) + 3, 2, 1);
        ctx.fillStyle = '#9B7653';
        ctx.fillRect(sx + ((seed >> 10) & 5) + 5, sy + ((seed >> 13) & 5), 1, 2);
        break;

      case BlockType.COAL_ORE:
        ctx.fillStyle = '#808080';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(sx + 2, sy + 3, 5, 4);
        ctx.fillRect(sx + 8, sy + 8, 4, 4);
        ctx.fillRect(sx + 4, sy + 10, 3, 3);
        break;

      case BlockType.IRON_ORE:
        ctx.fillStyle = '#808080';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#D4A574';
        ctx.fillRect(sx + 2, sy + 3, 4, 3);
        ctx.fillRect(sx + 8, sy + 8, 5, 4);
        ctx.fillStyle = '#C08050';
        ctx.fillRect(sx + 3, sy + 10, 3, 2);
        break;

      case BlockType.GOLD_ORE:
        ctx.fillStyle = '#808080';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(sx + 3, sy + 3, 4, 3);
        ctx.fillRect(sx + 9, sy + 8, 4, 4);
        ctx.fillStyle = '#FFA000';
        ctx.fillRect(sx + 4, sy + 4, 2, 1);
        break;

      case BlockType.DIAMOND_ORE:
        ctx.fillStyle = '#808080';
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(sx + 3, sy + 4, 4, 4);
        ctx.fillRect(sx + 9, sy + 9, 3, 3);
        ctx.fillStyle = '#80DEEA';
        ctx.fillRect(sx + 4, sy + 5, 2, 2);
        break;

      case BlockType.WOOD:
        ctx.fillStyle = '#5D3A1A';
        ctx.fillRect(sx + 3, sy, 1, TILE_SIZE);
        ctx.fillRect(sx + 7, sy, 1, TILE_SIZE);
        ctx.fillRect(sx + 11, sy, 1, TILE_SIZE);
        ctx.fillStyle = '#7D5A3A';
        ctx.fillRect(sx + 5, sy, 1, TILE_SIZE);
        ctx.fillRect(sx + 9, sy, 1, TILE_SIZE);
        break;

      case BlockType.LEAVES:
        ctx.fillStyle = '#1B5E20';
        ctx.fillRect(sx + (seed & 3), sy + ((seed >> 2) & 3), 4, 4);
        ctx.fillRect(sx + ((seed >> 4) & 7) + 4, sy + ((seed >> 6) & 7) + 4, 3, 3);
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(sx + ((seed >> 8) & 5) + 2, sy + ((seed >> 10) & 5) + 2, 2, 2);
        break;

      case BlockType.TORCH:
        // Stick
        ctx.fillStyle = '#6D4C2A';
        ctx.fillRect(sx + 7, sy + 6, 2, 10);
        // Flame with animation
        const flicker = Math.sin(this.frameCount * 0.3 + tx) * 1;
        ctx.fillStyle = '#FF6F00';
        ctx.fillRect(sx + 5, sy + 2 + flicker, 6, 5);
        ctx.fillStyle = '#FFAB00';
        ctx.fillRect(sx + 6, sy + 3 + flicker, 4, 3);
        ctx.fillStyle = '#FFF176';
        ctx.fillRect(sx + 7, sy + 4 + flicker, 2, 2);
        break;

      case BlockType.SAND:
        ctx.fillStyle = '#E8C838';
        ctx.fillRect(sx + (seed & 5), sy + ((seed >> 3) & 5), 3, 1);
        ctx.fillRect(sx + ((seed >> 6) & 7) + 2, sy + ((seed >> 9) & 7) + 4, 2, 1);
        ctx.fillStyle = '#F5E050';
        ctx.fillRect(sx + ((seed >> 12) & 5) + 6, sy + ((seed >> 14) & 5) + 2, 2, 2);
        break;

      case BlockType.SNOW:
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx, sy, TILE_SIZE, 3);
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(sx + (seed & 3), sy + 5, 2, 1);
        break;

      case BlockType.BEDROCK:
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(sx + (seed & 3), sy + ((seed >> 2) & 3), 5, 4);
        ctx.fillRect(sx + ((seed >> 4) & 7) + 4, sy + ((seed >> 7) & 7) + 4, 4, 4);
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(sx + ((seed >> 10) & 5) + 2, sy + ((seed >> 12) & 5) + 6, 3, 2);
        break;

      case BlockType.PLANKS:
        ctx.fillStyle = '#B8944A';
        ctx.fillRect(sx, sy + 3, TILE_SIZE, 1);
        ctx.fillRect(sx, sy + 7, TILE_SIZE, 1);
        ctx.fillRect(sx, sy + 11, TILE_SIZE, 1);
        ctx.fillRect(sx, sy + 15, TILE_SIZE, 1);
        break;

      case BlockType.COBBLESTONE:
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(sx + (seed & 3), sy + ((seed >> 2) & 3), 5, 4);
        ctx.fillRect(sx + ((seed >> 4) & 5) + 6, sy + ((seed >> 7) & 5) + 6, 4, 4);
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(sx + ((seed >> 10) & 5) + 3, sy + ((seed >> 12) & 5) + 8, 3, 3);
        break;

      case BlockType.CLAY:
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(sx + (seed & 3), sy + ((seed >> 2) & 3), 4, 3);
        ctx.fillRect(sx + ((seed >> 5) & 5) + 5, sy + ((seed >> 8) & 5) + 5, 3, 3);
        break;
    }
  }

  /** Render lighting overlay with day/night influence */
  private renderLighting(world: World, camera: Camera, startCol: number, endCol: number, startRow: number, endRow: number): void {
    const { ctx } = this;
    const nightFactor = 1 - this.dayNight.brightness;

    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const light = world.getLight(x, y);
        const effectiveLight = Math.max(0, light - nightFactor * 8);
        if (effectiveLight >= 14) continue;

        const darkness = 1 - (effectiveLight / 14);
        const screenPos = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);

        // Night has blue tint
        if (nightFactor > 0.3) {
          ctx.fillStyle = `rgba(10, 10, 40, ${darkness * 0.8})`;
        } else {
          ctx.fillStyle = `rgba(0, 0, 0, ${darkness * 0.75})`;
        }
        ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  /** Render the player character with animation */
  renderPlayer(player: Player, camera: Camera): void {
    const { ctx } = this;
    const s = player.state;
    const screenPos = camera.worldToScreen(s.x, s.y);
    const isMoving = Math.abs(s.vx) > 0.5;
    const walkCycle = isMoving ? Math.sin(this.frameCount * 0.2) : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(screenPos.x + 2, screenPos.y + s.height - 2, s.width - 4, 3);

    // Legs with walk animation
    ctx.fillStyle = '#3E2723';
    if (isMoving) {
      const legSwing = walkCycle * 4;
      ctx.fillRect(screenPos.x + 4, screenPos.y + 28, 5, 12 + legSwing);
      ctx.fillRect(screenPos.x + 11, screenPos.y + 28, 5, 12 - legSwing);
    } else {
      ctx.fillRect(screenPos.x + 5, screenPos.y + 28, 4, 12);
      ctx.fillRect(screenPos.x + 11, screenPos.y + 28, 4, 12);
    }

    // Body (shirt)
    ctx.fillStyle = '#1565C0';
    ctx.fillRect(screenPos.x + 3, screenPos.y + 12, 14, 16);
    // Shirt detail
    ctx.fillStyle = '#1976D2';
    ctx.fillRect(screenPos.x + 5, screenPos.y + 14, 10, 2);

    // Arms with swing animation
    ctx.fillStyle = '#FFCC80';
    if (isMoving) {
      const armSwing = walkCycle * 3;
      ctx.fillRect(screenPos.x, screenPos.y + 13 + armSwing, 4, 12);
      ctx.fillRect(screenPos.x + 16, screenPos.y + 13 - armSwing, 4, 12);
    } else {
      // Idle breathing animation
      const breathe = Math.sin(this.frameCount * 0.03) * 0.5;
      ctx.fillRect(screenPos.x, screenPos.y + 14 + breathe, 4, 11);
      ctx.fillRect(screenPos.x + 16, screenPos.y + 14 + breathe, 4, 11);
    }

    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.fillRect(screenPos.x + 4, screenPos.y + 2, 12, 10);

    // Hair
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(screenPos.x + 3, screenPos.y, 14, 4);
    if (s.facingRight) {
      ctx.fillRect(screenPos.x + 3, screenPos.y + 2, 2, 4);
    } else {
      ctx.fillRect(screenPos.x + 15, screenPos.y + 2, 2, 4);
    }

    // Eyes
    ctx.fillStyle = '#FFFFFF';
    if (s.facingRight) {
      ctx.fillRect(screenPos.x + 10, screenPos.y + 5, 4, 3);
      ctx.fillStyle = '#1A237E';
      ctx.fillRect(screenPos.x + 12, screenPos.y + 5, 2, 3);
    } else {
      ctx.fillRect(screenPos.x + 6, screenPos.y + 5, 4, 3);
      ctx.fillStyle = '#1A237E';
      ctx.fillRect(screenPos.x + 6, screenPos.y + 5, 2, 3);
    }

    // Held item indicator
    if (s.breaking) {
      ctx.fillStyle = '#8D6E63';
      const toolAngle = Math.sin(this.frameCount * 0.3) * 0.3;
      if (s.facingRight) {
        ctx.fillRect(screenPos.x + 18, screenPos.y + 10 + toolAngle * 5, 3, 10);
      } else {
        ctx.fillRect(screenPos.x - 1, screenPos.y + 10 + toolAngle * 5, 3, 10);
      }
    }
  }

  /** Render enemies */
  renderEnemies(enemies: any[], camera: Camera): void {
    const { ctx } = this;

    for (const enemy of enemies) {
      const screenPos = camera.worldToScreen(enemy.x, enemy.y);
      const flash = enemy.hitFlash > 0;

      if (enemy.type === 'slime') {
        // Slime body (bouncy animation)
        const squish = enemy.onGround ? 1 + Math.sin(this.frameCount * 0.1) * 0.1 : 0.9;
        const w = enemy.width * squish;
        const h = enemy.height / squish;
        const ox = (enemy.width - w) / 2;

        // Body
        ctx.fillStyle = flash ? '#FFFFFF' : '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(
          screenPos.x + enemy.width / 2,
          screenPos.y + h / 2 + (enemy.height - h),
          w / 2, h / 2, 0, 0, Math.PI * 2
        );
        ctx.fill();

        // Darker bottom
        ctx.fillStyle = flash ? '#DDDDDD' : '#388E3C';
        ctx.beginPath();
        ctx.ellipse(
          screenPos.x + enemy.width / 2,
          screenPos.y + h * 0.7 + (enemy.height - h),
          w / 2.5, h / 4, 0, 0, Math.PI
        );
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FFFFFF';
        const eyeY = screenPos.y + h * 0.3 + (enemy.height - h);
        ctx.fillRect(screenPos.x + ox + w * 0.3, eyeY, 3, 3);
        ctx.fillRect(screenPos.x + ox + w * 0.6, eyeY, 3, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(screenPos.x + ox + w * 0.35, eyeY + 1, 2, 2);
        ctx.fillRect(screenPos.x + ox + w * 0.65, eyeY + 1, 2, 2);

      } else if (enemy.type === 'zombie') {
        // Zombie body
        const walkCycle = Math.sin(this.frameCount * 0.1) * 2;

        // Legs
        ctx.fillStyle = flash ? '#FFFFFF' : '#3E2723';
        ctx.fillRect(screenPos.x + 3, screenPos.y + 24 + walkCycle, 5, 12);
        ctx.fillRect(screenPos.x + 10, screenPos.y + 24 - walkCycle, 5, 12);

        // Body
        ctx.fillStyle = flash ? '#FFFFFF' : '#2E7D32';
        ctx.fillRect(screenPos.x + 2, screenPos.y + 10, 14, 14);

        // Arms (stretched forward)
        ctx.fillStyle = flash ? '#FFFFFF' : '#4CAF50';
        const armDir = enemy.facingRight ? 1 : -1;
        ctx.fillRect(
          screenPos.x + (enemy.facingRight ? 14 : -4),
          screenPos.y + 12,
          6, 4
        );

        // Head
        ctx.fillStyle = flash ? '#FFFFFF' : '#4CAF50';
        ctx.fillRect(screenPos.x + 3, screenPos.y, 12, 10);

        // Eyes (red, menacing)
        ctx.fillStyle = '#FF0000';
        if (enemy.facingRight) {
          ctx.fillRect(screenPos.x + 10, screenPos.y + 3, 3, 3);
        } else {
          ctx.fillRect(screenPos.x + 5, screenPos.y + 3, 3, 3);
        }
      }

      // Health bar (if damaged)
      if (enemy.health < enemy.maxHealth) {
        const barWidth = enemy.width + 4;
        const barX = screenPos.x - 2;
        const barY = screenPos.y - 6;
        const healthPct = enemy.health / enemy.maxHealth;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, barY, barWidth, 3);
        ctx.fillStyle = healthPct > 0.5 ? '#4CAF50' : healthPct > 0.25 ? '#FF9800' : '#F44336';
        ctx.fillRect(barX, barY, barWidth * healthPct, 3);
      }
    }
  }

  /** Render dropped items with bobbing animation */
  renderDroppedItems(items: DroppedItem[], camera: Camera): void {
    const { ctx } = this;
    for (const item of items) {
      const screenPos = camera.worldToScreen(item.x, item.y);
      const bobY = Math.sin(this.frameCount * 0.06 + item.x * 0.1) * 3;
      const scale = 0.8 + Math.sin(this.frameCount * 0.04) * 0.1;

      // Item glow
      ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(screenPos.x + 4, screenPos.y + bobY + 4, 6, 0, Math.PI * 2);
      ctx.fill();

      // Item body
      ctx.fillStyle = '#FFD54F';
      ctx.fillRect(screenPos.x + 1, screenPos.y + bobY + 1, 7 * scale, 7 * scale);
      ctx.fillStyle = '#FFF9C4';
      ctx.fillRect(screenPos.x + 2, screenPos.y + bobY + 2, 3, 3);
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

    // Selection outline with glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenPos.x + 0.5, screenPos.y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

    // Break progress overlay with crack pattern
    if (breakProgress > 0) {
      // Darkened overlay
      ctx.fillStyle = `rgba(0, 0, 0, ${breakProgress * 0.4})`;
      ctx.fillRect(screenPos.x, screenPos.y, TILE_SIZE, TILE_SIZE);

      // Crack lines
      ctx.strokeStyle = `rgba(30, 30, 30, ${breakProgress})`;
      ctx.lineWidth = 1;
      const numCracks = Math.floor(breakProgress * 5) + 1;
      for (let i = 0; i < numCracks; i++) {
        const angle = (i / 5) * Math.PI * 2 + 0.3;
        const len = 4 + breakProgress * 6;
        ctx.beginPath();
        ctx.moveTo(screenPos.x + TILE_SIZE / 2, screenPos.y + TILE_SIZE / 2);
        ctx.lineTo(
          screenPos.x + TILE_SIZE / 2 + Math.cos(angle) * len,
          screenPos.y + TILE_SIZE / 2 + Math.sin(angle) * len
        );
        ctx.stroke();
      }
    }
  }

  /** Darken a hex color */
  private darkenColor(hex: string, factor: number): string {
    if (hex === 'transparent') return 'transparent';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
  }

  /** Lighten a hex color */
  private lightenColor(hex: string, factor: number): string {
    if (hex === 'transparent') return 'transparent';
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor);
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  /** Increment frame counter and update day/night */
  tick(): void {
    this.frameCount++;
    if (this.frameCount % 2 === 0) {
      this.updateDayNight();
    }
  }

  /** Get current day/night state */
  getDayNightState(): DayNightState {
    return this.dayNight;
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
