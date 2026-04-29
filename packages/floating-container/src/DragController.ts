import type { EventEmitter } from './EventEmitter';
import type { PositionEngine } from './PositionEngine';

export interface IDragGetters {
  getX(): number;
  getY(): number;
  getWidth(): number;
  getHeight(): number;
  getSnapToEdge(): boolean;
}

export interface IDragSetters {
  setPosition(x: number, y: number): void;
}

/**
 * Manages pointer/touch drag for the floating panel.
 *
 * The drag handle element is registered externally via `setHandle(el)`.
 * Drag can also be initiated programmatically via `startDrag(x, y)`
 * (used to relay PULSE_DRAG_START postMessage events from an iframe).
 *
 * Position updates are RAF-throttled for 60 fps performance.
 * Arrow-key navigation (8 px step) is supported when the handle is focused.
 */
export class DragController {
  private handle: HTMLElement | null = null;
  private dragging = false;
  private offsetX = 0;
  private offsetY = 0;
  private pendingX = 0;
  private pendingY = 0;
  private rafId = 0;
  private rafScheduled = false;

  // Stable bound references so addEventListener/removeEventListener match.
  private readonly onPointerDownBound: (e: PointerEvent) => void;
  private readonly onPointerMoveBound: (e: PointerEvent) => void;
  private readonly onPointerUpBound:   (e: PointerEvent) => void;
  private readonly onKeyDownBound:     (e: KeyboardEvent) => void;

  constructor(
    private readonly emitter: EventEmitter,
    private readonly posEngine: PositionEngine,
    private readonly getters: IDragGetters,
    private readonly setters: IDragSetters,
  ) {
    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound   = this.onPointerUp.bind(this);
    this.onKeyDownBound     = this.onKeyDown.bind(this);
  }

  /** Register the element inside the mount point that acts as the drag trigger. */
  setHandle(el: HTMLElement | null): void {
    if (this.handle) {
      this.handle.removeEventListener('pointerdown', this.onPointerDownBound);
      this.handle.removeEventListener('keydown',     this.onKeyDownBound);
    }
    this.handle = el;
    if (el) {
      el.addEventListener('pointerdown', this.onPointerDownBound);
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      el.addEventListener('keydown', this.onKeyDownBound);
    }
  }

  /**
   * Programmatically begin a drag from the given viewport coordinates.
   * Called by the host page when it receives a PULSE_DRAG_START postMessage
   * from a cross-origin iframe header.
   */
  startDrag(clientX: number, clientY: number): void {
    this.dragging    = true;
    this.offsetX     = clientX - this.getters.getX();
    this.offsetY     = clientY - this.getters.getY();
    this.pendingX    = clientX;
    this.pendingY    = clientY;
    document.body.style.cursor     = 'grabbing';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup',   this.onPointerUpBound);
    this.emitter.emit('container:dragStart', { x: clientX, y: clientY });
  }

  private onPointerDown(e: PointerEvent): void {
    // Allow buttons / links inside the drag handle to work normally.
    if ((e.target as Element).closest('[data-drag-exclude]')) return;
    e.preventDefault();
    this.startDrag(e.clientX, e.clientY);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    this.pendingX = e.clientX;
    this.pendingY = e.clientY;
    if (!this.rafScheduled) {
      this.rafScheduled = true;
      this.rafId = requestAnimationFrame(() => {
        this.rafScheduled = false;
        const clamped = this.posEngine.clamp(
          this.pendingX - this.offsetX,
          this.pendingY - this.offsetY,
          this.getters.getWidth(),
          this.getters.getHeight(),
        );
        this.setters.setPosition(clamped.x, clamped.y);
      });
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    cancelAnimationFrame(this.rafId);
    this.rafScheduled = false;
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup',   this.onPointerUpBound);

    let finalX = this.getters.getX();
    let finalY = this.getters.getY();
    let snapped = false;

    if (this.getters.getSnapToEdge()) {
      const snappedPos = this.posEngine.snapToNearestEdge(
        finalX, finalY,
        this.getters.getWidth(),
        this.getters.getHeight(),
      );
      if (snappedPos.x !== finalX || snappedPos.y !== finalY) {
        snapped = true;
        finalX  = snappedPos.x;
        finalY  = snappedPos.y;
        this.setters.setPosition(finalX, finalY);
      }
    }

    this.emitter.emit('container:dragEnd', { x: finalX, y: finalY, snapped });
  }

  /** Arrow-key movement (8 px step) when the drag handle is focused. */
  private onKeyDown(e: KeyboardEvent): void {
    const STEP = 8;
    let dx = 0;
    let dy = 0;
    switch (e.key) {
      case 'ArrowLeft':  dx = -STEP; break;
      case 'ArrowRight': dx = +STEP; break;
      case 'ArrowUp':    dy = -STEP; break;
      case 'ArrowDown':  dy = +STEP; break;
      default: return;
    }
    e.preventDefault();
    const clamped = this.posEngine.clamp(
      this.getters.getX() + dx,
      this.getters.getY() + dy,
      this.getters.getWidth(),
      this.getters.getHeight(),
    );
    this.setters.setPosition(clamped.x, clamped.y);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup',   this.onPointerUpBound);
    this.setHandle(null);
  }
}
