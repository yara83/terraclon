// ============================================================
// ENEMIES - Basic mob system with AI and combat
// ============================================================

import { Entity, PlayerState } from './types';
import { World } from './world';
import { TILE_SIZE, GRAVITY, MAX_FALL_SPEED } from './constants';

/** Enemy types */
export enum EnemyType {
  SLIME = 'slime',
  ZOMBIE = 'zombie',
}

/** Enemy state */
export interface Enemy extends Entity {
  type: EnemyType;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  jumpForce: number;
  facingRight: boolean;
  attackCooldown: number;
  hitFlash: number;
  aiTimer: number;
  aiState: 'idle' | 'chase' | 'wander';
  wanderDir: number;
}

export class EnemyManager {
  enemies: Enemy[] = [];
  private spawnTimer: number = 0;
  private maxEnemies: number = 8;
  private spawnInterval: number = 5000; // ms between spawn attempts

  /** Update all enemies */
  update(world: World, player: PlayerState, deltaTime: number): { damage: number; knockbackX: number }[] {
    const dt = deltaTime / 16.67;
    const attacks: { damage: number; knockbackX: number }[] = [];

    // Spawn timer
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval && this.enemies.length < this.maxEnemies) {
      this.spawnTimer = 0;
      this.trySpawn(world, player);
    }

    // Update each enemy
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // AI update
      this.updateAI(enemy, player, world, dt);

      // Physics
      enemy.vy += GRAVITY * dt;
      if (enemy.vy > MAX_FALL_SPEED) enemy.vy = MAX_FALL_SPEED;

      // Move horizontally
      enemy.x += enemy.vx * dt;
      this.resolveCollisionX(enemy, world);

      // Move vertically
      enemy.y += enemy.vy * dt;
      this.resolveCollisionY(enemy, world);

      // Check on ground
      enemy.onGround = false;
      const footY = Math.floor((enemy.y + enemy.height) / TILE_SIZE);
      const leftTile = Math.floor(enemy.x / TILE_SIZE);
      const rightTile = Math.floor((enemy.x + enemy.width - 1) / TILE_SIZE);
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (world.isSolid(tx, footY)) {
          enemy.onGround = true;
          break;
        }
      }

      // Attack cooldown
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= deltaTime;
      }

      // Hit flash
      if (enemy.hitFlash > 0) {
        enemy.hitFlash -= deltaTime;
      }

      // Check collision with player
      if (this.aabbCollision(enemy, {
        x: player.x, y: player.y,
        width: player.width, height: player.height
      })) {
        if (enemy.attackCooldown <= 0) {
          attacks.push({
            damage: enemy.damage,
            knockbackX: enemy.facingRight ? 5 : -5,
          });
          enemy.attackCooldown = 1000;
        }
      }

      // Remove if fell out of world
      if (enemy.y > world.data.height * TILE_SIZE) {
        this.enemies.splice(i, 1);
      }

      // Remove if dead
      if (enemy.health <= 0) {
        this.enemies.splice(i, 1);
      }
    }

    return attacks;
  }

  /** Update enemy AI */
  private updateAI(enemy: Enemy, player: PlayerState, world: World, dt: number): void {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    enemy.aiTimer -= dt * 16.67;

    switch (enemy.type) {
      case EnemyType.SLIME:
        // Slime AI: hop towards player when close, random hops otherwise
        if (distToPlayer < 300) {
          enemy.aiState = 'chase';
          enemy.facingRight = dx > 0;

          if (enemy.onGround && enemy.aiTimer <= 0) {
            enemy.vx = (dx > 0 ? 1 : -1) * enemy.speed * 2;
            enemy.vy = enemy.jumpForce;
            enemy.aiTimer = 800 + Math.random() * 600;
          }
        } else {
          enemy.aiState = 'wander';
          if (enemy.onGround && enemy.aiTimer <= 0) {
            enemy.wanderDir = Math.random() > 0.5 ? 1 : -1;
            enemy.vx = enemy.wanderDir * enemy.speed;
            enemy.vy = enemy.jumpForce * 0.7;
            enemy.facingRight = enemy.wanderDir > 0;
            enemy.aiTimer = 1500 + Math.random() * 2000;
          }
        }

        // Friction
        if (enemy.onGround) {
          enemy.vx *= 0.8;
        }
        break;

      case EnemyType.ZOMBIE:
        // Zombie AI: walk towards player
        if (distToPlayer < 400) {
          enemy.aiState = 'chase';
          enemy.facingRight = dx > 0;
          enemy.vx = (dx > 0 ? 1 : -1) * enemy.speed;

          // Jump if blocked
          if (enemy.onGround) {
            const aheadX = Math.floor((enemy.x + (dx > 0 ? enemy.width + 2 : -2)) / TILE_SIZE);
            const aheadY = Math.floor((enemy.y + enemy.height - 2) / TILE_SIZE);
            if (world.isSolid(aheadX, aheadY) || world.isSolid(aheadX, aheadY - 1)) {
              enemy.vy = enemy.jumpForce;
            }
          }
        } else {
          enemy.aiState = 'wander';
          if (enemy.aiTimer <= 0) {
            enemy.wanderDir = Math.random() > 0.5 ? 1 : -1;
            enemy.vx = enemy.wanderDir * enemy.speed * 0.5;
            enemy.facingRight = enemy.wanderDir > 0;
            enemy.aiTimer = 2000 + Math.random() * 3000;
          }
        }
        break;
    }
  }

  /** Try to spawn an enemy near the player */
  private trySpawn(world: World, player: PlayerState): void {
    // Spawn at random position offset from player
    const offsetX = (Math.random() > 0.5 ? 1 : -1) * (300 + Math.random() * 200);
    const spawnX = Math.floor((player.x + offsetX) / TILE_SIZE);
    const spawnY = Math.floor(player.y / TILE_SIZE) - 5;

    // Find ground
    let groundY = spawnY;
    for (let y = spawnY; y < world.data.height; y++) {
      if (world.isSolid(spawnX, y)) {
        groundY = y - 1;
        break;
      }
    }

    if (groundY <= 0 || groundY >= world.data.height - 1) return;

    // Choose enemy type
    const type = Math.random() > 0.6 ? EnemyType.ZOMBIE : EnemyType.SLIME;

    const enemy: Enemy = {
      x: spawnX * TILE_SIZE,
      y: (groundY - 2) * TILE_SIZE,
      width: type === EnemyType.SLIME ? 20 : 18,
      height: type === EnemyType.SLIME ? 16 : 36,
      vx: 0,
      vy: 0,
      onGround: false,
      type,
      health: type === EnemyType.SLIME ? 20 : 40,
      maxHealth: type === EnemyType.SLIME ? 20 : 40,
      damage: type === EnemyType.SLIME ? 5 : 10,
      speed: type === EnemyType.SLIME ? 1.5 : 1.2,
      jumpForce: type === EnemyType.SLIME ? -7 : -8,
      facingRight: Math.random() > 0.5,
      attackCooldown: 0,
      hitFlash: 0,
      aiTimer: 1000,
      aiState: 'wander',
      wanderDir: 0,
    };

    this.enemies.push(enemy);
  }

  /** Damage an enemy at position */
  damageAt(x: number, y: number, damage: number): boolean {
    for (const enemy of this.enemies) {
      if (x >= enemy.x && x <= enemy.x + enemy.width &&
          y >= enemy.y && y <= enemy.y + enemy.height) {
        enemy.health -= damage;
        enemy.hitFlash = 200;
        enemy.vx += (Math.random() - 0.5) * 4;
        enemy.vy = -3;
        return true;
      }
    }
    return false;
  }

  /** AABB collision check */
  private aabbCollision(a: Entity, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  /** Resolve horizontal collision */
  private resolveCollisionX(enemy: Enemy, world: World): void {
    const top = Math.floor(enemy.y / TILE_SIZE);
    const bottom = Math.floor((enemy.y + enemy.height - 1) / TILE_SIZE);

    if (enemy.vx > 0) {
      const rightTile = Math.floor((enemy.x + enemy.width) / TILE_SIZE);
      for (let ty = top; ty <= bottom; ty++) {
        if (world.isSolid(rightTile, ty)) {
          enemy.x = rightTile * TILE_SIZE - enemy.width;
          enemy.vx = 0;
          break;
        }
      }
    } else if (enemy.vx < 0) {
      const leftTile = Math.floor(enemy.x / TILE_SIZE);
      for (let ty = top; ty <= bottom; ty++) {
        if (world.isSolid(leftTile, ty)) {
          enemy.x = (leftTile + 1) * TILE_SIZE;
          enemy.vx = 0;
          break;
        }
      }
    }
  }

  /** Resolve vertical collision */
  private resolveCollisionY(enemy: Enemy, world: World): void {
    const left = Math.floor(enemy.x / TILE_SIZE);
    const right = Math.floor((enemy.x + enemy.width - 1) / TILE_SIZE);

    if (enemy.vy > 0) {
      const bottomTile = Math.floor((enemy.y + enemy.height) / TILE_SIZE);
      for (let tx = left; tx <= right; tx++) {
        if (world.isSolid(tx, bottomTile)) {
          enemy.y = bottomTile * TILE_SIZE - enemy.height;
          enemy.vy = 0;
          enemy.onGround = true;
          break;
        }
      }
    } else if (enemy.vy < 0) {
      const topTile = Math.floor(enemy.y / TILE_SIZE);
      for (let tx = left; tx <= right; tx++) {
        if (world.isSolid(tx, topTile)) {
          enemy.y = (topTile + 1) * TILE_SIZE;
          enemy.vy = 0;
          break;
        }
      }
    }
  }
}
