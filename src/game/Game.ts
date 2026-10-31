// ============================================================
// GAME ENGINE - Main game loop orchestrating all systems
// ============================================================

import { BlockType, ItemType, DroppedItem, Particle, ToolType } from './types';
import { World } from './world';
import { Player } from './player';
import { Camera } from './camera';
import { Renderer } from './renderer';
import { InputHandler } from './input';
import { Inventory } from './inventory';
import { LightingSystem } from './lighting';
import { AudioSystem } from './audio';
import { EnemyManager, Enemy } from './enemies';
import {
  TILE_SIZE, BREAK_REACH, PLACE_REACH, BLOCK_INFO, ITEM_INFO,
  PICKUP_DELAY, PICKUP_RANGE, ITEM_DROP_LIFETIME
} from './constants';

export class Game {
  private canvas: HTMLCanvasElement;
  private world: World;
  private player: Player;
  private camera: Camera;
  private renderer: Renderer;
  private input: InputHandler;
  private inventory: Inventory;
  private lighting: LightingSystem;

  private droppedItems: DroppedItem[] = [];
  private particles: Particle[] = [];
  private lastTime: number = 0;
  private deltaTime: number = 0;
  private running: boolean = false;
  private animFrameId: number = 0;
  private audio: AudioSystem;
  private enemyManager: EnemyManager;
  private lastJumpState: boolean = false;
  private swordCooldown: number = 0;

  // UI State
  private showInventory: boolean = false;
  private showCrafting: boolean = false;
  private breakTimer: number = 0;
  private placeTimer: number = 0;
  private scrollAccum: number = 0;

  // Callbacks for React UI updates
  onUIUpdate?: (state: GameState) => void;
  private uiUpdateTimer: number = 0;
  private lastUIState: string = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Initialize systems
    this.world = new World();
    this.player = new Player(this.world.data.spawnX, this.world.data.spawnY);
    this.camera = new Camera(canvas.width, canvas.height);
    this.renderer = new Renderer(canvas);
    this.input = new InputHandler(canvas);
    this.inventory = new Inventory();
    this.lighting = new LightingSystem(this.world);
    this.audio = new AudioSystem();
    this.enemyManager = new EnemyManager();

    // Initialize audio on first user interaction
    canvas.addEventListener('click', () => {
      this.audio.init();
      this.audio.resume();
    }, { once: true });

    // Calculate initial lighting
    this.lighting.calculateLighting();

    // Setup input callbacks
    this.input.onSlotChange = (slot: number) => {
      this.player.state.selectedSlot = slot;
    };
    this.input.onInventoryToggle = () => {
      this.showInventory = !this.showInventory;
      if (this.showInventory) this.showCrafting = false;
    };
    this.input.onCraftToggle = () => {
      this.showCrafting = !this.showCrafting;
      if (this.showCrafting) this.showInventory = false;
    };

    // Handle scroll wheel for hotbar
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.scrollAccum += e.deltaY;
      if (Math.abs(this.scrollAccum) > 50) {
        const dir = this.scrollAccum > 0 ? 1 : -1;
        this.player.state.selectedSlot = (this.player.state.selectedSlot + dir + 10) % 10;
        this.scrollAccum = 0;
      }
    }, { passive: false });

    // Handle resize
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Resize canvas to fill window */
  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  /** Start the game loop */
  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /** Stop the game loop */
  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.input.destroy();
  }

  /** Main game loop */
  private loop = (time: number): void => {
    if (!this.running) return;

    this.deltaTime = Math.min(time - this.lastTime, 33.33); // Cap at ~30fps min
    this.lastTime = time;

    this.update();
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /** Update all game systems */
  private update(): void {
    const dt = this.deltaTime / 16.67; // Normalize to 60fps

    // Update player
    const movement = this.input.getMovementInput();
    const wasOnGround = this.player.state.onGround;
    this.player.update(this.world, movement);

    // Jump sound detection
    if (!wasOnGround && this.player.state.isJumping && !this.lastJumpState) {
      this.audio.playJumpSound();
    }
    this.lastJumpState = this.player.state.isJumping;

    // Update camera
    this.camera.follow(this.player.getCenterX(), this.player.getCenterY());

    // Update mouse world coordinates
    const worldPos = this.camera.screenToWorld(this.input.state.mouseX, this.input.state.mouseY);
    this.input.state.mouseWorldX = worldPos.x;
    this.input.state.mouseWorldY = worldPos.y;
    const tilePos = this.camera.screenToTile(this.input.state.mouseX, this.input.state.mouseY);
    this.input.state.mouseTileX = tilePos.x;
    this.input.state.mouseTileY = tilePos.y;

    // Handle block breaking (left click) - only if not using a sword
    const selectedForBreak = this.inventory.getSelectedItem(this.player.state.selectedSlot);
    const selectedItemInfoForBreak = ITEM_INFO[selectedForBreak.item];
    const hasSwordEquipped = selectedItemInfoForBreak && selectedItemInfoForBreak.toolType === ToolType.SWORD;

    if (this.input.state.mouseDown && !this.showInventory && !this.showCrafting && !hasSwordEquipped) {
      this.handleBlockBreaking();
    } else if (!hasSwordEquipped) {
      this.player.state.breaking = false;
      this.player.state.breakProgress = 0;
      this.player.state.breakTarget = null;
      this.breakTimer = 0;
    }

    // Handle block placing (right click)
    if (this.input.state.rightMouseDown && !this.showInventory && !this.showCrafting) {
      this.handleBlockPlacing();
    }

    // Update enemies
    const enemyAttacks = this.enemyManager.update(this.world, this.player.state, this.deltaTime);
    for (const attack of enemyAttacks) {
      this.player.state.health = Math.max(0, this.player.state.health - attack.damage);
      this.player.state.vx += attack.knockbackX;
      this.player.state.vy = -3;
    }

    // Health regeneration (when not moving and not in combat)
    if (this.player.state.onGround && Math.abs(this.player.state.vx) < 0.5 && enemyAttacks.length === 0) {
      this.player.state.health = Math.min(
        this.player.state.maxHealth,
        this.player.state.health + 0.02 * dt
      );
    }

    // Death and respawn
    if (this.player.state.health <= 0) {
      this.player.state.health = this.player.state.maxHealth;
      this.player.state.x = this.world.data.spawnX * TILE_SIZE;
      this.player.state.y = (this.world.data.spawnY - 3) * TILE_SIZE;
      this.player.state.vx = 0;
      this.player.state.vy = 0;
    }

    // Handle sword attack (left click with sword equipped)
    this.swordCooldown = Math.max(0, this.swordCooldown - this.deltaTime);
    if (this.input.state.mouseDown && !this.showInventory && !this.showCrafting && this.swordCooldown <= 0) {
      const selected = this.inventory.getSelectedItem(this.player.state.selectedSlot);
      const itemInfo = ITEM_INFO[selected.item];
      if (itemInfo && itemInfo.toolType === ToolType.SWORD) {
        const worldPos = this.camera.screenToWorld(this.input.state.mouseX, this.input.state.mouseY);
        if (this.enemyManager.damageAt(worldPos.x, worldPos.y, itemInfo.damage)) {
          this.audio.playBreakSound(); // Use break sound as hit sound
          this.swordCooldown = 400; // Attack cooldown
        }
      }
    }

    // Update dropped items
    this.updateDroppedItems(dt);

    // Update particles
    this.updateParticles(dt);

    // Update renderer frame
    this.renderer.tick();

    // Send UI state update (throttled to ~10fps for React)
    this.uiUpdateTimer += this.deltaTime;
    if (this.uiUpdateTimer > 100 && this.onUIUpdate) {
      this.uiUpdateTimer = 0;
      const state = this.getUIState();
      const stateStr = JSON.stringify(state);
      if (stateStr !== this.lastUIState) {
        this.lastUIState = stateStr;
        this.onUIUpdate(state);
      }
    }
  }

  /** Handle block breaking mechanics */
  private handleBlockBreaking(): void {
    const tileX = this.input.state.mouseTileX;
    const tileY = this.input.state.mouseTileY;
    const playerTileX = this.player.getTileX();
    const playerTileY = this.player.getTileY();

    // Check reach
    const dist = Math.sqrt(
      Math.pow(tileX - playerTileX, 2) + Math.pow(tileY - playerTileY, 2)
    );
    if (dist > BREAK_REACH) return;

    const tile = this.world.getTile(tileX, tileY);
    if (tile === BlockType.AIR) return;

    const blockInfo = BLOCK_INFO[tile];
    if (!blockInfo || blockInfo.hardness < 0) return; // Unbreakable

    // Check if target changed
    if (!this.player.state.breakTarget ||
        this.player.state.breakTarget.x !== tileX ||
        this.player.state.breakTarget.y !== tileY) {
      this.player.state.breakTarget = { x: tileX, y: tileY };
      this.player.state.breakProgress = 0;
      this.breakTimer = 0;
    }

    this.player.state.breaking = true;
    this.breakTimer += this.deltaTime;

    // Calculate break speed based on tool
    const selected = this.inventory.getSelectedItem(this.player.state.selectedSlot);
    const selectedItemInfo = ITEM_INFO[selected.item];
    let breakSpeed = 1;

    if (selectedItemInfo && selectedItemInfo.toolType === blockInfo.minTool) {
      breakSpeed = 1 + selectedItemInfo.toolPower * 1.5;
    } else if (blockInfo.minTool !== ToolType.NONE) {
      breakSpeed = 0.3; // Slow without proper tool
    }

    // Update progress
    this.player.state.breakProgress = Math.min(1, (this.breakTimer * breakSpeed) / blockInfo.hardness);

    // Block broken!
    if (this.breakTimer * breakSpeed >= blockInfo.hardness) {
      this.breakBlock(tileX, tileY, tile);
      this.audio.playBreakSound();
      this.breakTimer = 0;
      this.player.state.breakProgress = 0;
      this.player.state.breakTarget = null;
    }
  }

  /** Break a block and handle drops */
  private breakBlock(x: number, y: number, tile: BlockType): void {
    const blockInfo = BLOCK_INFO[tile];
    if (!blockInfo) return;

    // Remove block
    this.world.setTile(x, y, BlockType.AIR);

    // Spawn drop item
    if (blockInfo.dropItem !== ItemType.NONE) {
      this.spawnDroppedItem(
        x * TILE_SIZE + TILE_SIZE / 2,
        y * TILE_SIZE + TILE_SIZE / 2,
        blockInfo.dropItem,
        1
      );
    }

    // Spawn particles
    this.spawnBlockParticles(x, y, blockInfo.color);

    // Mark lighting dirty
    this.lighting.markDirty();
    this.lighting.calculateLighting();
  }

  /** Handle block placing mechanics */
  private handleBlockPlacing(): void {
    this.placeTimer += this.deltaTime;
    if (this.placeTimer < 150) return; // Placement cooldown
    this.placeTimer = 0;

    const tileX = this.input.state.mouseTileX;
    const tileY = this.input.state.mouseTileY;
    const playerTileX = this.player.getTileX();
    const playerTileY = this.player.getTileY();

    // Check reach
    const dist = Math.sqrt(
      Math.pow(tileX - playerTileX, 2) + Math.pow(tileY - playerTileY, 2)
    );
    if (dist > PLACE_REACH) return;

    // Check if tile is empty
    if (this.world.getTile(tileX, tileY) !== BlockType.AIR) return;

    // Get selected item
    const selected = this.inventory.getSelectedItem(this.player.state.selectedSlot);
    const itemInfo = ITEM_INFO[selected.item];
    if (!itemInfo || !itemInfo.placeable) return;

    // Check if player is in the way
    const playerLeft = Math.floor(this.player.state.x / TILE_SIZE);
    const playerRight = Math.floor((this.player.state.x + this.player.state.width) / TILE_SIZE);
    const playerTop = Math.floor(this.player.state.y / TILE_SIZE);
    const playerBottom = Math.floor((this.player.state.y + this.player.state.height) / TILE_SIZE);

    if (tileX >= playerLeft && tileX <= playerRight &&
        tileY >= playerTop && tileY <= playerBottom) {
      // Check if block is solid (can't place inside player)
      if (BLOCK_INFO[itemInfo.placeBlock]?.solid) return;
    }

    // Place block
    this.world.setTile(tileX, tileY, itemInfo.placeBlock);
    this.inventory.removeItem(selected.item, 1);
    this.audio.playPlaceSound();

    // Update lighting for torches
    if (itemInfo.placeBlock === BlockType.TORCH) {
      this.lighting.markDirty();
      this.lighting.calculateLighting();
    }
  }

  /** Spawn a dropped item entity */
  private spawnDroppedItem(x: number, y: number, itemType: ItemType, count: number): void {
    this.droppedItems.push({
      x: x - 4,
      y: y - 4,
      width: 8,
      height: 8,
      vx: (Math.random() - 0.5) * 3,
      vy: -3 - Math.random() * 2,
      onGround: false,
      itemType,
      count,
      lifetime: ITEM_DROP_LIFETIME,
      pickupDelay: PICKUP_DELAY,
    });
  }

  /** Update dropped items physics and pickup */
  private updateDroppedItems(dt: number): void {
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];

      // Lifetime
      item.lifetime -= this.deltaTime;
      if (item.lifetime <= 0) {
        this.droppedItems.splice(i, 1);
        continue;
      }

      // Pickup delay
      if (item.pickupDelay > 0) {
        item.pickupDelay -= this.deltaTime;
      }

      // Gravity
      item.vy += 0.3 * dt;
      if (item.vy > 8) item.vy = 8;

      // Move
      item.x += item.vx * dt;
      item.y += item.vy * dt;

      // Tile collision (simple)
      const tileX = Math.floor((item.x + 4) / TILE_SIZE);
      const tileY = Math.floor((item.y + 8) / TILE_SIZE);
      if (this.world.isSolid(tileX, tileY)) {
        item.y = tileY * TILE_SIZE - 8;
        item.vy = 0;
        item.vx *= 0.8;
        item.onGround = true;
      }

      // Horizontal collision
      const hTileX = Math.floor((item.x + (item.vx > 0 ? 8 : 0)) / TILE_SIZE);
      const hTileY = Math.floor((item.y + 4) / TILE_SIZE);
      if (this.world.isSolid(hTileX, hTileY)) {
        item.vx = 0;
      }

      // Pickup by player
      if (item.pickupDelay <= 0) {
        const dx = (item.x + 4) - this.player.getCenterX();
        const dy = (item.y + 4) - this.player.getCenterY();
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PICKUP_RANGE * 2) {
          // Magnet effect
          item.vx += dx * 0.05;
          item.vy += dy * 0.05;
        }

        if (dist < PICKUP_RANGE) {
          const added = this.inventory.addItem(item.itemType, item.count);
          if (added < item.count) {
            item.count = added;
          } else {
            this.droppedItems.splice(i, 1);
            this.audio.playPickupSound();
            continue;
          }
        }
      }
    }
  }

  /** Spawn block breaking particles */
  private spawnBlockParticles(tileX: number, tileY: number, color: string): void {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: tileX * TILE_SIZE + Math.random() * TILE_SIZE,
        y: tileY * TILE_SIZE + Math.random() * TILE_SIZE,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  /** Update particles */
  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /** Render everything */
  private render(): void {
    // Clear & sky
    this.renderer.clear(this.camera);

    // World tiles
    this.renderer.renderWorld(this.world, this.camera);

    // Dropped items
    this.renderer.renderDroppedItems(this.droppedItems, this.camera);

    // Enemies
    this.renderer.renderEnemies(this.enemyManager.enemies, this.camera);

    // Player
    this.renderer.renderPlayer(this.player, this.camera);

    // Particles
    this.renderer.renderParticles(this.particles, this.camera);

    // Block highlight
    if (!this.showInventory && !this.showCrafting) {
      const tileX = this.input.state.mouseTileX;
      const tileY = this.input.state.mouseTileY;
      const playerTileX = this.player.getTileX();
      const playerTileY = this.player.getTileY();
      const dist = Math.sqrt(
        Math.pow(tileX - playerTileX, 2) + Math.pow(tileY - playerTileY, 2)
      );

      if (dist <= BREAK_REACH) {
        this.renderer.renderBlockHighlight(
          tileX, tileY, this.camera,
          this.player.state.breakProgress
        );
      }
    }
  }

  /** Get current UI state for React overlay */
  getUIState(): GameState {
    return {
      health: this.player.state.health,
      maxHealth: this.player.state.maxHealth,
      selectedSlot: this.player.state.selectedSlot,
      inventory: [...this.inventory.slots],
      showInventory: this.showInventory,
      showCrafting: this.showCrafting,
      availableRecipes: this.inventory.getAvailableRecipes(),
      canCraft: this.inventory.getAvailableRecipes().map(r => this.inventory.canCraft(r)),
      position: { x: this.player.state.x, y: this.player.state.y },
    };
  }

  /** Craft an item by recipe index */
  craftItem(recipeIndex: number): void {
    const recipes = this.inventory.getAvailableRecipes();
    if (recipeIndex >= 0 && recipeIndex < recipes.length) {
      if (this.inventory.craft(recipes[recipeIndex])) {
        this.audio.playCraftSound();
      }
    }
  }

  /** Toggle audio mute */
  toggleMute(): boolean {
    return this.audio.toggleMute();
  }

  /** Toggle inventory visibility */
  toggleInventory(): void {
    this.showInventory = !this.showInventory;
    if (this.showInventory) this.showCrafting = false;
    this.forceUIUpdate();
  }

  /** Toggle crafting visibility */
  toggleCrafting(): void {
    this.showCrafting = !this.showCrafting;
    if (this.showCrafting) this.showInventory = false;
    this.forceUIUpdate();
  }

  /** Force immediate UI state update */
  private forceUIUpdate(): void {
    this.uiUpdateTimer = 100;
    this.lastUIState = '';
  }
}

/** Game state passed to UI */
export interface GameState {
  health: number;
  maxHealth: number;
  selectedSlot: number;
  inventory: { item: ItemType; count: number }[];
  showInventory: boolean;
  showCrafting: boolean;
  availableRecipes: { result: { item: ItemType; count: number }; ingredients: { item: ItemType; count: number }[] }[];
  canCraft: boolean[];
  position: { x: number; y: number };
}
