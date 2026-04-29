import type { EventEmitter } from './EventEmitter';
import type { PositionEngine } from './PositionEngine';

export interface IResizeGetters {
  getWidth(): number;
  getHeight(): number;
  getX(): number;
  getY(): number;
  getMinWidth(): number;
  getMinHeight(): number;
  getMaxWidth(): number;
  getMaxHeight(): number;
}

export interface IResizeSetters {
  setDimensions(width: number, height: number, x?: number, y?: number): void;
}

type ResizeEdge =
  | 'right' | 'left'
  | 'bottom' | 'top'
  | 'corner' | 'top-left' | 'top-right' | 'bottom-left';

/**
 * Creates and manages eight resize handles appended to the shell element:
 *   - right / left edges  → horizontal resize
 *   - top / bottom edges  → vertical resize
 *   - four corners        → diagonal resize
 *
 * Left / top / top-left / top-right / bottom-left handles also shift the
 * panel's (x, y) position so the opposite edge stays anchored.
 *
 * Resize deltas are RAF-throttled for 60 fps performance.
 * Shift+Arrow keys resize by 8 px when a handle is focused.
 */
export class ResizeController {
  private edge: ResizeEdge | null = null;
  private startClientX  = 0;
  private startClientY  = 0;
  private startWidth    = 0;
  private startHeight   = 0;
  private startX        = 0;
  private startY        = 0;
  private pendingClientX = 0;
  private pendingClientY = 0;
  private rafId = 0;
  private rafScheduled = false;

  private readonly rightHandle:       HTMLElement;
  private readonly leftHandle:        HTMLElement;
  private readonly bottomHandle:      HTMLElement;
  private readonly topHandle:         HTMLElement;
  private readonly cornerHandle:      HTMLElement;
  private readonly topLeftHandle:     HTMLElement;
  private readonly topRightHandle:    HTMLElement;
  private readonly bottomLeftHandle:  HTMLElement;

  private readonly onPointerMoveBound: (e: PointerEvent) => void;
  private readonly onPointerUpBound:   (e: PointerEvent) => void;

  constructor(
    private readonly shellEl: HTMLElement,
    private readonly emitter: EventEmitter,
    private readonly posEngine: PositionEngine,
    private readonly getters: IResizeGetters,
    private readonly setters: IResizeSetters,
  ) {
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound   = this.onPointerUp.bind(this);

    this.rightHandle      = this.buildHandle('fc-resize-right',       'right',       'ew-resize');
    this.leftHandle       = this.buildHandle('fc-resize-left',        'left',        'ew-resize');
    this.bottomHandle     = this.buildHandle('fc-resize-bottom',      'bottom',      'ns-resize');
    this.topHandle        = this.buildHandle('fc-resize-top',         'top',         'ns-resize');
    this.cornerHandle     = this.buildHandle('fc-resize-corner',      'corner',      'nwse-resize');
    this.topLeftHandle    = this.buildHandle('fc-resize-top-left',    'top-left',    'nwse-resize');
    this.topRightHandle   = this.buildHandle('fc-resize-top-right',   'top-right',   'nesw-resize');
    this.bottomLeftHandle = this.buildHandle('fc-resize-bottom-left', 'bottom-left', 'nesw-resize');

    shellEl.appendChild(this.rightHandle);
    shellEl.appendChild(this.leftHandle);
    shellEl.appendChild(this.bottomHandle);
    shellEl.appendChild(this.topHandle);
    shellEl.appendChild(this.cornerHandle);
    shellEl.appendChild(this.topLeftHandle);
    shellEl.appendChild(this.topRightHandle);
    shellEl.appendChild(this.bottomLeftHandle);
  }

  private buildHandle(className: string, edge: ResizeEdge, cursor: string): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'separator');
    el.style.cursor = cursor;
    el.addEventListener('pointerdown', (e: PointerEvent) => this.startResize(e, edge));
    el.addEventListener('keydown',     (e: KeyboardEvent) => this.onKeyDown(e, edge));
    return el;
  }

  private startResize(e: PointerEvent, edge: ResizeEdge): void {
    e.preventDefault();
    e.stopPropagation();
    this.edge           = edge;
    this.startClientX   = e.clientX;
    this.startClientY   = e.clientY;
    this.startWidth     = this.getters.getWidth();
    this.startHeight    = this.getters.getHeight();
    this.startX         = this.getters.getX();
    this.startY         = this.getters.getY();
    this.pendingClientX = e.clientX;
    this.pendingClientY = e.clientY;
    document.body.style.cursor     = (e.target as HTMLElement).style.cursor;
    document.body.style.userSelect = 'none';
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup',   this.onPointerUpBound);
    this.emitter.emit('container:resizeStart', {
      width:  this.startWidth,
      height: this.startHeight,
    });
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.edge) return;
    this.pendingClientX = e.clientX;
    this.pendingClientY = e.clientY;
    if (!this.rafScheduled) {
      this.rafScheduled = true;
      this.rafId = requestAnimationFrame(() => {
        this.rafScheduled = false;
        const dx = this.pendingClientX - this.startClientX;
        const dy = this.pendingClientY - this.startClientY;
        this.applyDelta(dx, dy);
      });
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    if (!this.edge) return;
    this.edge = null;
    cancelAnimationFrame(this.rafId);
    this.rafScheduled = false;
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup',   this.onPointerUpBound);
    this.emitter.emit('container:resizeEnd', {
      width:  this.getters.getWidth(),
      height: this.getters.getHeight(),
    });
  }

  /** Shift+Arrow keys resize when a handle is focused (8 px step). */
  private onKeyDown(e: KeyboardEvent, edge: ResizeEdge): void {
    if (!e.shiftKey) return;
    const STEP = 8;
    let dx = 0;
    let dy = 0;
    switch (e.key) {
      case 'ArrowRight': dx = +STEP; break;
      case 'ArrowLeft':  dx = -STEP; break;
      case 'ArrowDown':  dy = +STEP; break;
      case 'ArrowUp':    dy = -STEP; break;
      default: return;
    }
    e.preventDefault();

    let newW = this.getters.getWidth();
    let newH = this.getters.getHeight();
    let newX = this.getters.getX();
    let newY = this.getters.getY();

    if (edge === 'right' || edge === 'corner' || edge === 'top-right') {
      newW = this.clampW(newW + dx);
    } else if (edge === 'left' || edge === 'bottom-left' || edge === 'top-left') {
      const rightEdge = newX + newW;
      newW = this.clampW(newW - dx);
      newX = rightEdge - newW;
    }

    if (edge === 'bottom' || edge === 'corner' || edge === 'bottom-left') {
      newH = this.clampH(newH + dy);
    } else if (edge === 'top' || edge === 'top-left' || edge === 'top-right') {
      const bottomEdge = newY + newH;
      newH = this.clampH(newH - dy);
      newY = bottomEdge - newH;
    }

    if (newX !== this.getters.getX() || newY !== this.getters.getY()) {
      const clamped = this.posEngine.clamp(newX, newY, newW, newH);
      newX = clamped.x;
      newY = clamped.y;
    }

    this.setters.setDimensions(newW, newH, newX, newY);
  }

  private applyDelta(dx: number, dy: number): void {
    const edge = this.edge;
    if (!edge) return;

    let newW = this.startWidth;
    let newH = this.startHeight;
    let newX = this.startX;
    let newY = this.startY;

    if (edge === 'right' || edge === 'corner' || edge === 'top-right') {
      newW = this.clampW(this.startWidth + dx);
    } else if (edge === 'left' || edge === 'bottom-left' || edge === 'top-left') {
      const rightEdge = this.startX + this.startWidth;
      newW = this.clampW(this.startWidth - dx);
      newX = rightEdge - newW;
    }

    if (edge === 'bottom' || edge === 'corner' || edge === 'bottom-left') {
      newH = this.clampH(this.startHeight + dy);
    } else if (edge === 'top' || edge === 'top-left' || edge === 'top-right') {
      const bottomEdge = this.startY + this.startHeight;
      newH = this.clampH(this.startHeight - dy);
      newY = bottomEdge - newH;
    }

    if (newX !== this.startX || newY !== this.startY) {
      const clamped = this.posEngine.clamp(newX, newY, newW, newH);
      newX = clamped.x;
      newY = clamped.y;
    }

    this.setters.setDimensions(newW, newH, newX, newY);
  }

  private clampW(w: number): number {
    return Math.min(Math.max(w, this.getters.getMinWidth()),  this.getters.getMaxWidth());
  }

  private clampH(h: number): number {
    return Math.min(Math.max(h, this.getters.getMinHeight()), this.getters.getMaxHeight());
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup',   this.onPointerUpBound);
    this.rightHandle.remove();
    this.leftHandle.remove();
    this.bottomHandle.remove();
    this.topHandle.remove();
    this.cornerHandle.remove();
    this.topLeftHandle.remove();
    this.topRightHandle.remove();
    this.bottomLeftHandle.remove();
  }
}
