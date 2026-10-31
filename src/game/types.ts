// ============================================================
// TYPE DEFINITIONS - Central type system for the game engine
// ============================================================

/** Block types available in the world */
export enum BlockType {
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  SAND = 4,
  WOOD = 5,
  LEAVES = 6,
  COAL_ORE = 7,
  IRON_ORE = 8,
  GOLD_ORE = 9,
  DIAMOND_ORE = 10,
  BEDROCK = 11,
  WATER = 12,
  PLANKS = 13,
  COBBLESTONE = 14,
  TORCH = 15,
  SNOW = 16,
  ICE = 17,
  CLAY = 18,
}

/** Item types (blocks can also be items) */
export enum ItemType {
  NONE = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  SAND = 4,
  WOOD = 5,
  COAL_ORE = 7,
  IRON_ORE = 8,
  GOLD_ORE = 9,
  DIAMOND_ORE = 10,
  PLANKS = 13,
  COBBLESTONE = 14,
  TORCH = 15,
  // Tools
  WOODEN_PICKAXE = 100,
  STONE_PICKAXE = 101,
  IRON_PICKAXE = 102,
  SUPER_PICKAXE = 103,
  WOODEN_SWORD = 110,
  STONE_SWORD = 111,
  IRON_SWORD = 112,
  WOODEN_AXE = 120,
  STONE_AXE = 121,
  IRON_AXE = 122,
}

/** Tool categories */
export enum ToolType {
  NONE = 0,
  PICKAXE = 1,
  AXE = 2,
  SWORD = 3,
}

/** Block properties */
export interface BlockInfo {
  type: BlockType;
  name: string;
  solid: boolean;
  hardness: number; // Time to break in ms (0 = instant, -1 = unbreakable)
  color: string;
  dropItem: ItemType;
  minTool: ToolType;
  lightEmission: number; // 0-15
  transparent: boolean;
}

/** Item properties */
export interface ItemInfo {
  type: ItemType;
  name: string;
  maxStack: number;
  toolType: ToolType;
  toolPower: number;
  damage: number;
  placeable: boolean;
  placeBlock: BlockType;
  color: string;
  icon: string; // emoji or simple icon
}

/** Inventory slot */
export interface InventorySlot {
  item: ItemType;
  count: number;
}

/** Entity base interface */
export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

/** Player state */
export interface PlayerState extends Entity {
  health: number;
  maxHealth: number;
  facingRight: boolean;
  isJumping: boolean;
  selectedSlot: number;
  breaking: boolean;
  breakProgress: number;
  breakTarget: { x: number; y: number } | null;
}

/** Camera state */
export interface CameraState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  zoom: number;
}

/** World data */
export interface WorldData {
  width: number;
  height: number;
  tiles: Uint8Array;        // Foreground blocks
  walls: Uint8Array;        // Background walls
  lightMap: Uint8Array;     // Light levels 0-15
  spawnX: number;
  spawnY: number;
}

/** Dropped item entity */
export interface DroppedItem extends Entity {
  itemType: ItemType;
  count: number;
  lifetime: number;
  pickupDelay: number;
}

/** Particle for visual effects */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

/** Crafting recipe */
export interface CraftingRecipe {
  result: { item: ItemType; count: number };
  ingredients: { item: ItemType; count: number }[];
}

/** Input state */
export interface InputState {
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseWorldX: number;
  mouseWorldY: number;
  mouseDown: boolean;
  rightMouseDown: boolean;
  mouseTileX: number;
  mouseTileY: number;
}
