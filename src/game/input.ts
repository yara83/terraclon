// ============================================================
// INPUT HANDLER - Keyboard and mouse input management
// ============================================================

import { InputState } from './types';

export class InputHandler {
  state: InputState;
  private canvas: HTMLCanvasElement;
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;
  private wheelHandler: (e: WheelEvent) => void;
  private contextMenuHandler: (e: Event) => void;

  // Callbacks
  onSlotChange?: (slot: number) => void;
  onInventoryToggle?: () => void;
  onCraftToggle?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = {
      keys: new Set(),
      mouseX: 0,
      mouseY: 0,
      mouseWorldX: 0,
      mouseWorldY: 0,
      mouseDown: false,
      rightMouseDown: false,
      mouseTileX: 0,
      mouseTileY: 0,
    };

    // Bind handlers
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.keyUpHandler = this.handleKeyUp.bind(this);
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    this.wheelHandler = this.handleWheel.bind(this);
    this.contextMenuHandler = (e: Event) => e.preventDefault();

    // Attach listeners
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    canvas.addEventListener('mousemove', this.mouseMoveHandler);
    canvas.addEventListener('mousedown', this.mouseDownHandler);
    canvas.addEventListener('mouseup', this.mouseUpHandler);
    canvas.addEventListener('wheel', this.wheelHandler);
    canvas.addEventListener('contextmenu', this.contextMenuHandler);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.state.keys.add(e.code);

    // Number keys for hotbar selection
    if (e.code >= 'Digit1' && e.code <= 'Digit9') {
      const slot = parseInt(e.code.replace('Digit', '')) - 1;
      if (this.onSlotChange) this.onSlotChange(slot);
    }
    if (e.code === 'Digit0' && this.onSlotChange) {
      this.onSlotChange(9);
    }

    // Toggle inventory
    if (e.code === 'KeyE' && this.onInventoryToggle) {
      this.onInventoryToggle();
    }

    // Toggle crafting
    if (e.code === 'KeyC' && this.onCraftToggle) {
      this.onCraftToggle();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.state.keys.delete(e.code);
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.state.mouseX = e.clientX - rect.left;
    this.state.mouseY = e.clientY - rect.top;
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) this.state.mouseDown = true;
    if (e.button === 2) this.state.rightMouseDown = true;
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.state.mouseDown = false;
    if (e.button === 2) this.state.rightMouseDown = false;
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    // Scroll to change hotbar slot - handled by game
  }

  /** Check if a key is currently pressed */
  isKeyDown(code: string): boolean {
    return this.state.keys.has(code);
  }

  /** Get movement input */
  getMovementInput(): { left: boolean; right: boolean; jump: boolean } {
    return {
      left: this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft'),
      right: this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight'),
      jump: this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp') || this.isKeyDown('Space'),
    };
  }

  /** Cleanup event listeners */
  destroy(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('wheel', this.wheelHandler);
    this.canvas.removeEventListener('contextmenu', this.contextMenuHandler);
  }
}
