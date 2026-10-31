// ============================================================
// CAMERA - Smooth tracking camera with lerp and deadzone
// ============================================================

import { CameraState } from './types';
import { CAMERA_LERP, CAMERA_DEADZONE, TILE_SIZE } from './constants';

export class Camera {
  state: CameraState;
  screenWidth: number;
  screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.state = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1,
    };
  }

  /** Update camera to follow target with smooth lerp */
  follow(targetX: number, targetY: number): void {
    this.state.targetX = targetX - this.screenWidth / 2;
    this.state.targetY = targetY - this.screenHeight / 2;

    // Apply deadzone
    const dx = this.state.targetX - this.state.x;
    const dy = this.state.targetY - this.state.y;

    if (Math.abs(dx) > CAMERA_DEADZONE) {
      this.state.x += dx * CAMERA_LERP;
    }
    if (Math.abs(dy) > CAMERA_DEADZONE) {
      this.state.y += dy * CAMERA_LERP;
    }
  }

  /** Convert screen coordinates to world coordinates */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.state.x,
      y: screenY + this.state.y,
    };
  }

  /** Convert world coordinates to screen coordinates */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.state.x,
      y: worldY - this.state.y,
    };
  }

  /** Convert screen coordinates to tile coordinates */
  screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const world = this.screenToWorld(screenX, screenY);
    return {
      x: Math.floor(world.x / TILE_SIZE),
      y: Math.floor(world.y / TILE_SIZE),
    };
  }

  /** Get visible tile range for frustum culling */
  getVisibleRange(): { startCol: number; endCol: number; startRow: number; endRow: number } {
    const startCol = Math.floor(this.state.x / TILE_SIZE) - 2;
    const endCol = Math.ceil((this.state.x + this.screenWidth) / TILE_SIZE) + 2;
    const startRow = Math.floor(this.state.y / TILE_SIZE) - 2;
    const endRow = Math.ceil((this.state.y + this.screenHeight) / TILE_SIZE) + 2;
    return { startCol, endCol, startRow, endRow };
  }

  /** Resize camera viewport */
  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }
}
