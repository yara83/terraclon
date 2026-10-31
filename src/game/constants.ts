// ============================================================
// GAME CONSTANTS - All tunable parameters in one place
// ============================================================

import { BlockType, ItemType, BlockInfo, ItemInfo, ToolType, CraftingRecipe } from './types';

// World dimensions
export const TILE_SIZE = 16;
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 400;
export const SURFACE_LEVEL = 150; // Y position of surface

// Physics
export const GRAVITY = 0.5;
export const MAX_FALL_SPEED = 12;
export const PLAYER_SPEED = 3.5;
export const PLAYER_JUMP_FORCE = -9.5;
export const PLAYER_WIDTH = 20;
export const PLAYER_HEIGHT = 40;
export const FRICTION = 0.85;

// Camera
export const CAMERA_LERP = 0.08;
export const CAMERA_DEADZONE = 20;

// Rendering
export const RENDER_DISTANCE = 2; // Extra tiles to render beyond screen edge
export const SKY_COLOR_TOP = '#1a1a3e';
export const SKY_COLOR_BOTTOM = '#4a6fa5';
export const UNDERGROUND_COLOR = '#0a0a0a';

// Lighting
export const MAX_LIGHT = 15;
export const SUNLIGHT_LEVEL = 15;
export const LIGHT_DECAY = 1;

// Block breaking
export const BREAK_REACH = 5; // Tiles
export const PLACE_REACH = 5;

// Items
export const MAX_INVENTORY_SLOTS = 40;
export const HOTBAR_SLOTS = 10;
export const ITEM_DROP_LIFETIME = 300000; // 5 minutes
export const PICKUP_DELAY = 500; // ms
export const PICKUP_RANGE = 40;

// Block definitions
export const BLOCK_INFO: Record<number, BlockInfo> = {
  [BlockType.AIR]: {
    type: BlockType.AIR, name: 'Air', solid: false, hardness: 0,
    color: 'transparent', dropItem: ItemType.NONE, minTool: ToolType.NONE,
    lightEmission: 0, transparent: true
  },
  [BlockType.DIRT]: {
    type: BlockType.DIRT, name: 'Dirt', solid: true, hardness: 500,
    color: '#8B5E3C', dropItem: ItemType.DIRT, minTool: ToolType.NONE,
    lightEmission: 0, transparent: false
  },
  [BlockType.GRASS]: {
    type: BlockType.GRASS, name: 'Grass', solid: true, hardness: 500,
    color: '#4CAF50', dropItem: ItemType.DIRT, minTool: ToolType.NONE,
    lightEmission: 0, transparent: false
  },
  [BlockType.STONE]: {
    type: BlockType.STONE, name: 'Stone', solid: true, hardness: 1500,
    color: '#808080', dropItem: ItemType.COBBLESTONE, minTool: ToolType.PICKAXE,
    lightEmission: 0, transparent: false
  },
  [BlockType.SAND]: {
    type: BlockType.SAND, name: 'Sand', solid: true, hardness: 400,
    color: '#F4D03F', dropItem: ItemType.SAND, minTool: ToolType.NONE,
    lightEmission: 0, transparent: false
  },
  [BlockType.WOOD]: {
    type: BlockType.WOOD, name: 'Wood', solid: false, hardness: 800,
    color: '#6D4C2A', dropItem: ItemType.WOOD, minTool: ToolType.AXE,
    lightEmission: 0, transparent: true
  },
  [BlockType.LEAVES]: {
    type: BlockType.LEAVES, name: 'Leaves', solid: false, hardness: 200,
    color: '#2E7D32', dropItem: ItemType.NONE, minTool: ToolType.NONE,
    lightEmission: 0, transparent: true
  },
  [BlockType.COAL_ORE]: {
    type: BlockType.COAL_ORE, name: 'Coal Ore', solid: true, hardness: 2000,
    color: '#3a3a3a', dropItem: ItemType.COAL_ORE, minTool: ToolType.PICKAXE,
    lightEmission: 0, transparent: false
  },
  [BlockType.IRON_ORE]: {
    type: BlockType.IRON_ORE, name: 'Iron Ore', solid: true, hardness: 2500,
    color: '#B87333', dropItem: ItemType.IRON_ORE, minTool: ToolType.PICKAXE,
    lightEmission: 0, transparent: false
  },
  [BlockType.GOLD_ORE]: {
    type: BlockType.GOLD_ORE, name: 'Gold Ore', solid: true, hardness: 3000,
    color: '#FFD700', dropItem: ItemType.GOLD_ORE, minTool: ToolType.PICKAXE,
    lightEmission: 0, transparent: false
  },
  [BlockType.DIAMOND_ORE]: {
    type: BlockType.DIAMOND_ORE, name: 'Diamond Ore', solid: true, hardness: 4000,
    color: '#00BCD4', dropItem: ItemType.DIAMOND_ORE, minTool: ToolType.PICKAXE,
    lightEmission: 0, transparent: false
  },
  [BlockType.BEDROCK]: {
    type: BlockType.BEDROCK, name: 'Bedrock', solid: true, hardness: -1,
    color: '#1a1a1a', dropItem: ItemType.NONE, minTool: ToolType.NONE,
    lightEmission: 0, transparent: false
  },
  [BlockType.PLANKS]: {
    type: BlockType.PLANKS, name: 'Planks', solid: true, hardness: 600,
    color: '#C4A265', dropItem: ItemType.PLANKS, minTool: ToolType.AXE,
    lightEmission: 0, transparent: false
  },
  [BlockType.COBBLESTONE]: {
    type: BlockType.COBBLESTONE, name: 'Cobblestone', solid: true, hardness: 1800,
    color: '#6B6B6B', dropItem: ItemType.COBBLESTONE, minTool: ToolType.PICKAXE,
    lightEmission: 0, transparent: false
  },
  [BlockType.TORCH]: {
    type: BlockType.TORCH, name: 'Torch', solid: false, hardness: 100,
    color: '#FFD54F', dropItem: ItemType.TORCH, minTool: ToolType.NONE,
    lightEmission: 12, transparent: true
  },
  [BlockType.SNOW]: {
    type: BlockType.SNOW, name: 'Snow', solid: true, hardness: 300,
    color: '#F0F0F0', dropItem: ItemType.NONE, minTool: ToolType.NONE,
    lightEmission: 0, transparent: false
  },
  [BlockType.ICE]: {
    type: BlockType.ICE, name: 'Ice', solid: true, hardness: 700,
    color: '#B3E5FC', dropItem: ItemType.NONE, minTool: ToolType.PICKAXE,
    lightEmission: 0, transparent: true
  },
  [BlockType.CLAY]: {
    type: BlockType.CLAY, name: 'Clay', solid: true, hardness: 600,
    color: '#A1887F', dropItem: ItemType.NONE, minTool: ToolType.NONE,
    lightEmission: 0, transparent: false
  },
};

// Item definitions
export const ITEM_INFO: Record<number, ItemInfo> = {
  [ItemType.NONE]: { type: ItemType.NONE, name: 'Empty', maxStack: 0, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: false, placeBlock: BlockType.AIR, color: 'transparent', icon: '' },
  [ItemType.DIRT]: { type: ItemType.DIRT, name: 'Dirt', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: true, placeBlock: BlockType.DIRT, color: '#8B5E3C', icon: '🟫' },
  [ItemType.STONE]: { type: ItemType.STONE, name: 'Stone', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: true, placeBlock: BlockType.STONE, color: '#808080', icon: '⬜' },
  [ItemType.SAND]: { type: ItemType.SAND, name: 'Sand', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: true, placeBlock: BlockType.SAND, color: '#F4D03F', icon: '🟨' },
  [ItemType.WOOD]: { type: ItemType.WOOD, name: 'Wood', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: true, placeBlock: BlockType.WOOD, color: '#6D4C2A', icon: '🪵' },
  [ItemType.COAL_ORE]: { type: ItemType.COAL_ORE, name: 'Coal', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: false, placeBlock: BlockType.AIR, color: '#3a3a3a', icon: '⚫' },
  [ItemType.IRON_ORE]: { type: ItemType.IRON_ORE, name: 'Iron Ore', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: false, placeBlock: BlockType.AIR, color: '#B87333', icon: '🟧' },
  [ItemType.GOLD_ORE]: { type: ItemType.GOLD_ORE, name: 'Gold Ore', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: false, placeBlock: BlockType.AIR, color: '#FFD700', icon: '🟡' },
  [ItemType.DIAMOND_ORE]: { type: ItemType.DIAMOND_ORE, name: 'Diamond', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: false, placeBlock: BlockType.AIR, color: '#00BCD4', icon: '💎' },
  [ItemType.PLANKS]: { type: ItemType.PLANKS, name: 'Planks', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: true, placeBlock: BlockType.PLANKS, color: '#C4A265', icon: '🟫' },
  [ItemType.COBBLESTONE]: { type: ItemType.COBBLESTONE, name: 'Cobblestone', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: true, placeBlock: BlockType.COBBLESTONE, color: '#6B6B6B', icon: '🪨' },
  [ItemType.TORCH]: { type: ItemType.TORCH, name: 'Torch', maxStack: 99, toolType: ToolType.NONE, toolPower: 0, damage: 0, placeable: true, placeBlock: BlockType.TORCH, color: '#FFD54F', icon: '🔥' },
  // Tools
  [ItemType.WOODEN_PICKAXE]: { type: ItemType.WOODEN_PICKAXE, name: 'Wooden Pickaxe', maxStack: 1, toolType: ToolType.PICKAXE, toolPower: 1, damage: 2, placeable: false, placeBlock: BlockType.AIR, color: '#8B5E3C', icon: '⛏️' },
  [ItemType.STONE_PICKAXE]: { type: ItemType.STONE_PICKAXE, name: 'Stone Pickaxe', maxStack: 1, toolType: ToolType.PICKAXE, toolPower: 2, damage: 3, placeable: false, placeBlock: BlockType.AIR, color: '#808080', icon: '⛏️' },
  [ItemType.IRON_PICKAXE]: { type: ItemType.IRON_PICKAXE, name: 'Iron Pickaxe', maxStack: 1, toolType: ToolType.PICKAXE, toolPower: 3, damage: 4, placeable: false, placeBlock: BlockType.AIR, color: '#C0C0C0', icon: '⛏️' },
  [ItemType.SUPER_PICKAXE]: { type: ItemType.SUPER_PICKAXE, name: 'Super Pickaxe', maxStack: 1, toolType: ToolType.PICKAXE, toolPower: 5, damage: 6, placeable: false, placeBlock: BlockType.AIR, color: '#FF6B9D', icon: '💎' },
  [ItemType.WOODEN_SWORD]: { type: ItemType.WOODEN_SWORD, name: 'Wooden Sword', maxStack: 1, toolType: ToolType.SWORD, toolPower: 0, damage: 4, placeable: false, placeBlock: BlockType.AIR, color: '#8B5E3C', icon: '🗡️' },
  [ItemType.STONE_SWORD]: { type: ItemType.STONE_SWORD, name: 'Stone Sword', maxStack: 1, toolType: ToolType.SWORD, toolPower: 0, damage: 6, placeable: false, placeBlock: BlockType.AIR, color: '#808080', icon: '🗡️' },
  [ItemType.IRON_SWORD]: { type: ItemType.IRON_SWORD, name: 'Iron Sword', maxStack: 1, toolType: ToolType.SWORD, toolPower: 0, damage: 8, placeable: false, placeBlock: BlockType.AIR, color: '#C0C0C0', icon: '🗡️' },
  [ItemType.WOODEN_AXE]: { type: ItemType.WOODEN_AXE, name: 'Wooden Axe', maxStack: 1, toolType: ToolType.AXE, toolPower: 1, damage: 3, placeable: false, placeBlock: BlockType.AIR, color: '#8B5E3C', icon: '🪓' },
  [ItemType.STONE_AXE]: { type: ItemType.STONE_AXE, name: 'Stone Axe', maxStack: 1, toolType: ToolType.AXE, toolPower: 2, damage: 4, placeable: false, placeBlock: BlockType.AIR, color: '#808080', icon: '🪓' },
  [ItemType.IRON_AXE]: { type: ItemType.IRON_AXE, name: 'Iron Axe', maxStack: 1, toolType: ToolType.AXE, toolPower: 3, damage: 5, placeable: false, placeBlock: BlockType.AIR, color: '#C0C0C0', icon: '🪓' },
};

// Crafting recipes
export const RECIPES: CraftingRecipe[] = [
  { result: { item: ItemType.PLANKS, count: 4 }, ingredients: [{ item: ItemType.WOOD, count: 1 }] },
  { result: { item: ItemType.TORCH, count: 4 }, ingredients: [{ item: ItemType.COAL_ORE, count: 1 }, { item: ItemType.WOOD, count: 1 }] },
  { result: { item: ItemType.WOODEN_PICKAXE, count: 1 }, ingredients: [{ item: ItemType.PLANKS, count: 3 }, { item: ItemType.WOOD, count: 2 }] },
  { result: { item: ItemType.WOODEN_SWORD, count: 1 }, ingredients: [{ item: ItemType.PLANKS, count: 2 }, { item: ItemType.WOOD, count: 1 }] },
  { result: { item: ItemType.WOODEN_AXE, count: 1 }, ingredients: [{ item: ItemType.PLANKS, count: 3 }, { item: ItemType.WOOD, count: 2 }] },
  { result: { item: ItemType.STONE_PICKAXE, count: 1 }, ingredients: [{ item: ItemType.COBBLESTONE, count: 3 }, { item: ItemType.WOOD, count: 2 }] },
  { result: { item: ItemType.STONE_SWORD, count: 1 }, ingredients: [{ item: ItemType.COBBLESTONE, count: 2 }, { item: ItemType.WOOD, count: 1 }] },
  { result: { item: ItemType.STONE_AXE, count: 1 }, ingredients: [{ item: ItemType.COBBLESTONE, count: 3 }, { item: ItemType.WOOD, count: 2 }] },
  { result: { item: ItemType.IRON_PICKAXE, count: 1 }, ingredients: [{ item: ItemType.IRON_ORE, count: 3 }, { item: ItemType.WOOD, count: 2 }] },
  { result: { item: ItemType.IRON_SWORD, count: 1 }, ingredients: [{ item: ItemType.IRON_ORE, count: 2 }, { item: ItemType.WOOD, count: 1 }] },
  { result: { item: ItemType.IRON_AXE, count: 1 }, ingredients: [{ item: ItemType.IRON_ORE, count: 3 }, { item: ItemType.WOOD, count: 2 }] },
  { result: { item: ItemType.SUPER_PICKAXE, count: 1 }, ingredients: [{ item: ItemType.DIAMOND_ORE, count: 5 }, { item: ItemType.IRON_ORE, count: 3 }, { item: ItemType.WOOD, count: 2 }] },
];
