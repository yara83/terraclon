// ============================================================
// INVENTORY - Slot management, stacking, and crafting
// ============================================================

import { InventorySlot, ItemType, CraftingRecipe } from './types';
import { MAX_INVENTORY_SLOTS, ITEM_INFO, RECIPES } from './constants';

export class Inventory {
  slots: InventorySlot[];
  hotbarSize: number = 10;

  constructor() {
    this.slots = [];
    for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
      this.slots.push({ item: ItemType.NONE, count: 0 });
    }

    // Give starter items
    this.slots[0] = { item: ItemType.WOODEN_PICKAXE, count: 1 };
    this.slots[1] = { item: ItemType.WOODEN_AXE, count: 1 };
    this.slots[2] = { item: ItemType.WOODEN_SWORD, count: 1 };
  }

  /** Add item to inventory. Returns leftover count if full. */
  addItem(itemType: ItemType, count: number): number {
    if (itemType === ItemType.NONE) return count;

    const info = ITEM_INFO[itemType];
    if (!info) return count;

    let remaining = count;

    // First pass: try to stack with existing items
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot.item === itemType && slot.count < info.maxStack) {
        const canAdd = Math.min(remaining, info.maxStack - slot.count);
        slot.count += canAdd;
        remaining -= canAdd;
      }
    }

    // Second pass: fill empty slots
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot.item === ItemType.NONE) {
        const canAdd = Math.min(remaining, info.maxStack);
        slot.item = itemType;
        slot.count = canAdd;
        remaining -= canAdd;
      }
    }

    return remaining;
  }

  /** Remove items from inventory. Returns actual amount removed. */
  removeItem(itemType: ItemType, count: number): number {
    let removed = 0;

    for (let i = this.slots.length - 1; i >= 0 && removed < count; i--) {
      const slot = this.slots[i];
      if (slot.item === itemType) {
        const canRemove = Math.min(slot.count, count - removed);
        slot.count -= canRemove;
        removed += canRemove;
        if (slot.count <= 0) {
          slot.item = ItemType.NONE;
          slot.count = 0;
        }
      }
    }

    return removed;
  }

  /** Count total items of a type in inventory */
  countItem(itemType: ItemType): number {
    let total = 0;
    for (const slot of this.slots) {
      if (slot.item === itemType) total += slot.count;
    }
    return total;
  }

  /** Check if can craft a recipe */
  canCraft(recipe: CraftingRecipe): boolean {
    for (const ingredient of recipe.ingredients) {
      if (this.countItem(ingredient.item) < ingredient.count) {
        return false;
      }
    }
    return true;
  }

  /** Craft a recipe. Returns true if successful. */
  craft(recipe: CraftingRecipe): boolean {
    if (!this.canCraft(recipe)) return false;

    // Remove ingredients
    for (const ingredient of recipe.ingredients) {
      this.removeItem(ingredient.item, ingredient.count);
    }

    // Add result
    this.addItem(recipe.result.item, recipe.result.count);
    return true;
  }

  /** Get item in a specific slot */
  getSlot(index: number): InventorySlot {
    if (index < 0 || index >= this.slots.length) {
      return { item: ItemType.NONE, count: 0 };
    }
    return this.slots[index];
  }

  /** Get selected item from hotbar */
  getSelectedItem(hotbarSlot: number): InventorySlot {
    return this.getSlot(hotbarSlot);
  }

  /** Get all available recipes */
  getAvailableRecipes(): CraftingRecipe[] {
    return RECIPES;
  }
}
