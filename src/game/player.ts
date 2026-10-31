// ============================================================
// PLAYER - Entity with physics, collisions, and state
// ============================================================

import { PlayerState, BlockType } from './types';
import { World } from './world';
import {
  GRAVITY, MAX_FALL_SPEED, PLAYER_SPEED, PLAYER_JUMP_FORCE,
  PLAYER_WIDTH, PLAYER_HEIGHT, FRICTION, TILE_SIZE
} from './constants';

export class Player {
  state: PlayerState;

  constructor(spawnX: number, spawnY: number) {
    this.state = {
      x: spawnX * TILE_SIZE,
      y: spawnY * TILE_SIZE,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      onGround: false,
      health: 100,
      maxHealth: 100,
      facingRight: true,
      isJumping: false,
      selectedSlot: 0,
      breaking: false,
      breakProgress: 0,
      breakTarget: null,
    };
  }

  /** Update player physics and handle tile collisions */
  update(world: World, input: { left: boolean; right: boolean; jump: boolean }): void {
    const s = this.state;

    // Horizontal movement
    if (input.left) {
      s.vx = -PLAYER_SPEED;
      s.facingRight = false;
    } else if (input.right) {
      s.vx = PLAYER_SPEED;
      s.facingRight = true;
    } else {
      s.vx *= FRICTION;
      if (Math.abs(s.vx) < 0.1) s.vx = 0;
    }

    // Jumping
    if (input.jump && s.onGround) {
      s.vy = PLAYER_JUMP_FORCE;
      s.onGround = false;
      s.isJumping = true;
    }

    // Variable jump height
    if (!input.jump && s.vy < -3) {
      s.vy *= 0.85;
    }

    // Gravity
    s.vy += GRAVITY;
    if (s.vy > MAX_FALL_SPEED) s.vy = MAX_FALL_SPEED;

    // Move and collide horizontally
    s.x += s.vx;
    this.resolveCollisionX(world);

    // Move and collide vertically
    s.y += s.vy;
    this.resolveCollisionY(world);

    // Check if on ground
    s.onGround = false;
    const footY = Math.floor((s.y + s.height) / TILE_SIZE);
    const leftTile = Math.floor(s.x / TILE_SIZE);
    const rightTile = Math.floor((s.x + s.width - 1) / TILE_SIZE);

    for (let tx = leftTile; tx <= rightTile; tx++) {
      if (world.isSolid(tx, footY)) {
        s.onGround = true;
        s.isJumping = false;
        break;
      }
    }
  }

  /** Resolve horizontal collisions using AABB */
  private resolveCollisionX(world: World): void {
    const s = this.state;
    const top = Math.floor(s.y / TILE_SIZE);
    const bottom = Math.floor((s.y + s.height - 1) / TILE_SIZE);

    if (s.vx > 0) {
      // Moving right
      const rightTile = Math.floor((s.x + s.width) / TILE_SIZE);
      for (let ty = top; ty <= bottom; ty++) {
        if (world.isSolid(rightTile, ty)) {
          s.x = rightTile * TILE_SIZE - s.width;
          s.vx = 0;
          break;
        }
      }
    } else if (s.vx < 0) {
      // Moving left
      const leftTile = Math.floor(s.x / TILE_SIZE);
      for (let ty = top; ty <= bottom; ty++) {
        if (world.isSolid(leftTile, ty)) {
          s.x = (leftTile + 1) * TILE_SIZE;
          s.vx = 0;
          break;
        }
      }
    }
  }

  /** Resolve vertical collisions using AABB */
  private resolveCollisionY(world: World): void {
    const s = this.state;
    const left = Math.floor(s.x / TILE_SIZE);
    const right = Math.floor((s.x + s.width - 1) / TILE_SIZE);

    if (s.vy > 0) {
      // Falling down
      const bottomTile = Math.floor((s.y + s.height) / TILE_SIZE);
      for (let tx = left; tx <= right; tx++) {
        if (world.isSolid(tx, bottomTile)) {
          s.y = bottomTile * TILE_SIZE - s.height;
          s.vy = 0;
          s.onGround = true;
          s.isJumping = false;
          break;
        }
      }
    } else if (s.vy < 0) {
      // Jumping up
      const topTile = Math.floor(s.y / TILE_SIZE);
      for (let tx = left; tx <= right; tx++) {
        if (world.isSolid(tx, topTile)) {
          s.y = (topTile + 1) * TILE_SIZE;
          s.vy = 0;
          break;
        }
      }
    }
  }

  /** Get center position */
  getCenterX(): number {
    return this.state.x + this.state.width / 2;
  }

  getCenterY(): number {
    return this.state.y + this.state.height / 2;
  }

  /** Get tile position of player center */
  getTileX(): number {
    return Math.floor(this.getCenterX() / TILE_SIZE);
  }

  getTileY(): number {
    return Math.floor(this.getCenterY() / TILE_SIZE);
  }
}
