import type {
  IFloatingContainerConfig,
  DisplayMode,
  IPositionOptions,
  IDimensionOptions,
  IMountAdapter,
  IContainerState,
  LifecycleState,
  ContainerEvent,
  EventPayload,
  Unsubscribe,
} from './types';
import { EventEmitter }    from './EventEmitter';
import { PositionEngine }  from './PositionEngine';
import { DragController }  from './DragController';
import { ResizeController } from './ResizeController';
import { MountManager }    from './MountManager';

// ── Inline CSS ────────────────────────────────────────────────────────────
// Injected once into <head> the first time a FloatingContainer is created.
// Keeps the library as a single JS file with no external CSS dependency.

const SHELL_CSS = `
/* floating-container shell styles */
.fc {
  position: fixed;
  box-sizing: border-box;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.12);
  overflow: hidden;
  outline: none;
  will-change: transform;
  background: #fff;
  min-width: 0;
  min-height: 0;
}
.fc[data-hidden] { display: none !important; }
.fc[data-mode="embedded"] {
  position: absolute !important;
  left: 0 !important; top: 0 !important;
  width: 100% !important; height: 100% !important;
  border-radius: 0;
  box-shadow: none;
}
.fc[data-minimized] { overflow: hidden; }
.fc[data-minimized] .fc-mount-point { pointer-events: none; }
.fc-mount-point {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 0;
}
.fc-resize-right,
.fc-resize-left,
.fc-resize-bottom,
.fc-resize-top,
.fc-resize-corner,
.fc-resize-top-left,
.fc-resize-top-right,
.fc-resize-bottom-left { position: absolute; z-index: 1; background: transparent; }
.fc-resize-right       { right: 0;  top: 0;    width: 6px;  height: 100%; cursor: ew-resize; }
.fc-resize-left        { left: 0;   top: 0;    width: 6px;  height: 100%; cursor: ew-resize; }
.fc-resize-bottom      { bottom: 0; left: 0;   width: 100%; height: 6px;  cursor: ns-resize; }
.fc-resize-top         { top: 0;    left: 0;   width: 100%; height: 6px;  cursor: ns-resize; }
.fc-resize-corner      { right: 0;  bottom: 0; width: 12px; height: 12px; cursor: nwse-resize; z-index: 2; }
.fc-resize-top-left    { left: 0;   top: 0;    width: 12px; height: 12px; cursor: nwse-resize; z-index: 2; }
.fc-resize-top-right   { right: 0;  top: 0;    width: 12px; height: 12px; cursor: nesw-resize; z-index: 2; }
.fc-resize-bottom-left { left: 0;   bottom: 0; width: 12px; height: 12px; cursor: nesw-resize; z-index: 2; }
@media (pointer: coarse) {
  .fc-resize-right  { width: 12px; }
  .fc-resize-left   { width: 12px; }
  .fc-resize-bottom { height: 12px; }
  .fc-resize-top    { height: 12px; }
  .fc-resize-corner,
  .fc-resize-top-left,
  .fc-resize-top-right,
  .fc-resize-bottom-left { width: 44px; height: 44px; }
}
.fc-resize-right:hover,
.fc-resize-left:hover,
.fc-resize-bottom:hover,
.fc-resize-top:hover,
.fc-resize-corner:hover,
.fc-resize-top-left:hover,
.fc-resize-top-right:hover,
.fc-resize-bottom-left:hover { background: rgba(0,0,0,.06); }
.fc[data-mode="embedded"] .fc-resize-right,
.fc[data-mode="embedded"] .fc-resize-left,
.fc[data-mode="embedded"] .fc-resize-bottom,
.fc[data-mode="embedded"] .fc-resize-top,
.fc[data-mode="embedded"] .fc-resize-corner,
.fc[data-mode="embedded"] .fc-resize-top-left,
.fc[data-mode="embedded"] .fc-resize-top-right,
.fc[data-mode="embedded"] .fc-resize-bottom-left,
.fc[data-minimized] .fc-resize-right,
.fc[data-minimized] .fc-resize-left,
.fc[data-minimized] .fc-resize-bottom,
.fc[data-minimized] .fc-resize-top,
.fc[data-minimized] .fc-resize-corner,
.fc[data-minimized] .fc-resize-top-left,
.fc[data-minimized] .fc-resize-top-right,
.fc[data-minimized] .fc-resize-bottom-left { display: none; }
.fc-entering {
  animation: fc-enter var(--fc-anim-dur, 200ms) ease-out both;
}
.fc-leaving {
  animation: fc-leave var(--fc-anim-dur, 200ms) ease-in both;
}
@keyframes fc-enter {
  from { opacity: 0; transform: translateY(12px) scale(.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);   }
}
@keyframes fc-leave {
  from { opacity: 1; transform: translateY(0)    scale(1);   }
  to   { opacity: 0; transform: translateY(12px) scale(.97); }
}
`;

const STYLE_ID = 'fc-styles';

function ensureCSS(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = SHELL_CSS;
  document.head.appendChild(style);
}

// ── Defaults ──────────────────────────────────────────────────────────────

const DEFAULT_POSITION: IPositionOptions = {
  anchor:          'bottom-right',
  x:               24,
  y:               24,
  snapToEdge:      false,
  boundaryPadding: 8,
};

const DEFAULT_DIMENSIONS: IDimensionOptions = {
  width:          380,
  height:         520,
  minWidth:       280,
  minHeight:      200,
  maxWidth:       760,
  maxHeight:      '90vh',
  expandedWidth:  600,
  expandedHeight: '80vh',
};

const STORAGE_KEY_PREFIX = 'fc:';

// ═════════════════════════════════════════════════════════════════════════
// FloatingContainer — public class
// ═════════════════════════════════════════════════════════════════════════

/**
 * Creates and manages a host DOM element (the "container shell") that can
 * float over a page or embed inside a designated node.
 *
 * **Key Design Principle:** The library owns the shell (position, size, drag,
 * resize, chrome). It never touches content inside the mount point. Any
 * framework or plain DOM can render into that point by implementing the
 * `IMountAdapter` interface.
 *
 * @example
 * ```ts
 * import { FloatingContainer } from '@indiavenkatesh/floating-container';
 *
 * const container = new FloatingContainer({
 *   mode: 'floating',
 *   position: { anchor: 'bottom-right', x: 24, y: 24 },
 *   dimensions: { width: 380, height: 520 },
 * });
 * container.mount(myAdapter);
 * container.open();
 * ```
 */
export class FloatingContainer {
  // ── Resolved config ────────────────────────────────────────────────────
  private readonly cfg: {
    draggable:         boolean;
    resizable:         boolean;
    zIndex:            number;
    animationDuration: number;
    shadowDom:         boolean;
    persist:           boolean;
    sessionKey:        string;
    position:          IPositionOptions;
    dimensions:        IDimensionOptions;
  };

  // ── Mutable state ──────────────────────────────────────────────────────
  private lifecycle:   LifecycleState = 'CREATED';
  private animating    = false;
  private pendingClose = false;
  private mode:        DisplayMode;
  private x            = 0;
  private y            = 0;
  // Edge-relative anchor — ensures the container tracks its nearest viewport
  // edge when the window is resized (e.g. DevTools opening/closing).
  private anchorEdgeX:   'left' | 'right'  = 'right';
  private anchorEdgeY:   'top'  | 'bottom' = 'bottom';
  private anchorOffsetX  = 0;   // px distance from anchorEdgeX
  private anchorOffsetY  = 0;   // px distance from anchorEdgeY
  private width:       number;
  private height:      number;
  private isMinimized_ = false;
  private isExpanded_  = false;
  private preMinH      = 0;
  private preExpW      = 0;
  private preExpH      = 0;
  private preExpX      = 0;
  private preExpY      = 0;
  private embedTarget: HTMLElement | null = null;
  private accProps:    Record<string, unknown> = {};

  // ── DOM ────────────────────────────────────────────────────────────────
  private readonly hostEl:  HTMLElement;
  private readonly shellEl: HTMLElement;
  private shadowRoot: ShadowRoot | null = null;

  // ── Controllers / managers ─────────────────────────────────────────────
  private readonly emitter:    EventEmitter;
  private readonly posEngine:  PositionEngine;
  private readonly mountMgr:   MountManager;
  private readonly dragCtrl:   DragController;
  private readonly resizeCtrl: ResizeController | null;

  // ── Stable handler refs for removeEventListener ────────────────────────
  private readonly onWindowResize = (): void => {
    if (this.lifecycle !== 'OPEN') return;
    this.applyLayout();
  };

  private readonly onShellKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.close();
  };

  constructor(config: IFloatingContainerConfig = {}) {
    ensureCSS();

    this.cfg = {
      draggable:         config.draggable         ?? true,
      resizable:         config.resizable         ?? true,
      zIndex:            config.zIndex            ?? 9999,
      animationDuration: config.animationDuration ?? 200,
      shadowDom:         config.shadowDom         ?? false,
      persist:           config.persist           ?? false,
      sessionKey:        config.sessionKey        ?? 'default',
      position:          { ...DEFAULT_POSITION,    ...config.position },
      dimensions:        { ...DEFAULT_DIMENSIONS, ...config.dimensions },
    };

    const initialMode = config.mode ?? 'auto';
    this.mode   = initialMode === 'auto' ? 'floating' : initialMode;
    this.width  = this.cfg.dimensions.width;
    this.height = this.cfg.dimensions.height;

    // ── Build host + shell ───────────────────────────────────────────────
    this.hostEl = document.createElement('div');
    this.hostEl.className = 'fc-host';

    if (this.cfg.shadowDom) {
      this.shadowRoot = this.hostEl.attachShadow({ mode: 'open' });
      const shadowStyle = document.createElement('style');
      shadowStyle.textContent = SHELL_CSS;
      this.shadowRoot.appendChild(shadowStyle);
      this.shellEl = document.createElement('div');
      this.shadowRoot.appendChild(this.shellEl);
    } else {
      this.shellEl = document.createElement('div');
      this.hostEl.appendChild(this.shellEl);
    }

    this.shellEl.className = 'fc';
    this.shellEl.setAttribute('role', 'dialog');
    this.shellEl.setAttribute('aria-modal', 'false');
    this.shellEl.setAttribute('tabindex', '-1');
    this.shellEl.dataset['hidden'] = '';
    this.shellEl.dataset['mode']   = this.mode;
    this.shellEl.style.setProperty('--fc-anim-dur', `${this.cfg.animationDuration}ms`);

    // ── Mount point ──────────────────────────────────────────────────────
    this.mountMgr = new MountManager(
      (code, message) => this.emitter.emit('container:error', { code, message }),
    );
    this.shellEl.appendChild(this.mountMgr.mountPoint);

    // ── Controllers ──────────────────────────────────────────────────────
    this.emitter   = new EventEmitter();
    this.posEngine = new PositionEngine(this.cfg.position.boundaryPadding);

    this.dragCtrl = new DragController(
      this.emitter,
      this.posEngine,
      {
        getX:          () => this.x,
        getY:          () => this.y,
        getWidth:      () => this.width,
        getHeight:     () => this.height,
        getSnapToEdge: () => this.cfg.position.snapToEdge,
      },
      {
        setPosition: (x, y) => {
          this.updateAnchor(x, y);
          this.applyLayout();
          this.saveSession();
        },
      },
    );

    this.resizeCtrl = this.cfg.resizable
      ? new ResizeController(
          this.shellEl,
          this.emitter,
          this.posEngine,
          {
            getWidth:     () => this.width,
            getHeight:    () => this.height,
            getX:         () => this.x,
            getY:         () => this.y,
            getMinWidth:  () => this.cfg.dimensions.minWidth,
            getMinHeight: () => this.cfg.dimensions.minHeight,
            getMaxWidth:  () => this.posEngine.resolveMax(this.cfg.dimensions.maxWidth,  'width'),
            getMaxHeight: () => this.posEngine.resolveMax(this.cfg.dimensions.maxHeight, 'height'),
          },
          {
            setDimensions: (w, h, x, y) => {
              this.width  = w;
              this.height = h;
              const ax = x !== undefined ? x : this.x;
              const ay = y !== undefined ? y : this.y;
              this.updateAnchor(ax, ay);
              this.applyLayout();
              this.saveSession();
              this.mountMgr.notifyResize({ width: w, height: h });
            },
          },
        )
      : null;

    this.shellEl.addEventListener('keydown', this.onShellKeyDown);

    window.addEventListener('resize', this.onWindowResize);
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /** Recompute which viewport edge the container is nearest to and store the
   *  distance from that edge. Called whenever the user explicitly sets a position
   *  (drag end, resize, setPosition). NOT called on window resize. */
  private updateAnchor(x: number, y: number): void {
    const distRight  = window.innerWidth  - x - this.width;
    const distLeft   = x;
    const distBottom = window.innerHeight - y - this.height;
    const distTop    = y;
    this.anchorEdgeX   = distRight  <= distLeft  ? 'right'  : 'left';
    this.anchorEdgeY   = distBottom <= distTop   ? 'bottom' : 'top';
    this.anchorOffsetX = this.anchorEdgeX === 'right'  ? distRight  : distLeft;
    this.anchorOffsetY = this.anchorEdgeY === 'bottom' ? distBottom : distTop;
  }

  private applyLayout(): void {
    if (this.mode === 'embedded') return;
    const pad        = this.posEngine.boundaryPadding;
    const effectiveH = this.isMinimized_
      ? 48
      : Math.min(this.height, window.innerHeight - pad * 2);
    // Resolve position from the nearest-edge anchor so the container tracks
    // its original viewport edge across window resizes (e.g. DevTools open/close).
    const rawX = this.anchorEdgeX === 'right'
      ? window.innerWidth  - this.width  - this.anchorOffsetX
      : this.anchorOffsetX;
    const rawY = this.anchorEdgeY === 'bottom'
      ? window.innerHeight - this.height - this.anchorOffsetY
      : this.anchorOffsetY;
    const clamped    = this.posEngine.clamp(rawX, rawY, this.width, effectiveH);
    this.x = clamped.x;
    this.y = clamped.y;
    this.shellEl.style.left   = `${this.x}px`;
    this.shellEl.style.top    = `${this.y}px`;
    this.shellEl.style.width  = `${this.width}px`;
    this.shellEl.style.height = `${effectiveH}px`;
    this.shellEl.style.zIndex = String(this.cfg.zIndex);
  }

  private applyMode(): void {
    this.shellEl.dataset['mode'] = this.mode;
  }

  private resolveInitialPosition(): void {
    const restored = this.loadSession();
    if (!restored) {
      const r = this.posEngine.resolveAnchor(
        this.cfg.position.anchor,
        this.cfg.position.x,
        this.cfg.position.y,
        this.width,
        this.height,
      );
      this.x = r.x;
      this.y = r.y;
    } else {
      // Clamp once on initial load in case the stored position is off-screen
      // (e.g. different monitor or window size since last session).
      const c = this.posEngine.clamp(this.x, this.y, this.width, this.height);
      this.x = c.x;
      this.y = c.y;
    }
    this.updateAnchor(this.x, this.y);
  }

  private saveSession(): void {
    if (!this.cfg.persist) return;
    if (this.mode !== 'floating') return;
    if (this.isExpanded_) return;          // never persist the expanded view-state
    const k = `${STORAGE_KEY_PREFIX}${this.cfg.sessionKey}:`;
    try {
      sessionStorage.setItem(`${k}x`,      String(this.x));
      sessionStorage.setItem(`${k}y`,      String(this.y));
      sessionStorage.setItem(`${k}width`,  String(this.width));
      sessionStorage.setItem(`${k}height`, String(this.height));
    } catch { /* storage unavailable */ }
  }

  private loadSession(): boolean {
    if (!this.cfg.persist) return false;
    const k = `${STORAGE_KEY_PREFIX}${this.cfg.sessionKey}:`;
    try {
      const x = sessionStorage.getItem(`${k}x`);
      const y = sessionStorage.getItem(`${k}y`);
      const w = sessionStorage.getItem(`${k}width`);
      const h = sessionStorage.getItem(`${k}height`);
      if (x !== null) this.x = parseFloat(x);
      if (y !== null) this.y = parseFloat(y);
      if (w !== null) this.width  = parseFloat(w);
      if (h !== null) this.height = parseFloat(h);
      return x !== null || y !== null;
    } catch { return false; }
  }

  private animate(direction: 'enter' | 'leave'): Promise<void> {
    this.shellEl.classList.remove('fc-entering', 'fc-leaving');
    return new Promise(resolve => {
      const dur = this.cfg.animationDuration;
      if (dur <= 0) { resolve(); return; }
      const cls = direction === 'enter' ? 'fc-entering' : 'fc-leaving';
      this.animating = true;
      this.shellEl.classList.add(cls);
      const cleanup = (): void => {
        clearTimeout(fallback);
        this.shellEl.classList.remove(cls);
        this.animating = false;
        resolve();
      };
      this.shellEl.addEventListener('animationend', cleanup, { once: true });
      // Fallback in case animationend never fires (e.g. prefers-reduced-motion,
      // hidden tab, or the element is detached before the animation completes).
      const fallback = setTimeout(() => {
        this.shellEl.removeEventListener('animationend', cleanup);
        this.shellEl.classList.remove(cls);
        this.animating = false;
        resolve();
      }, dur + 100);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════

  /** Attach a IMountAdapter and add the shell to the DOM. CREATED | CLOSED → MOUNTED.
   *  Calling from MOUNTED swaps the adapter without re-initialising the shell. */
  mount(adapter: IMountAdapter): void {
    if (this.lifecycle === 'DESTROYED') return;
    if (this.lifecycle === 'OPEN' || this.lifecycle === 'MINIMIZED') return;
    if (this.lifecycle === 'CREATED' || this.lifecycle === 'CLOSED') {
      this.resolveInitialPosition();
      this.applyLayout();
      this.applyMode();
      (this.embedTarget ?? document.body).appendChild(this.hostEl);
    }
    this.mountMgr.mount(adapter);
    this.lifecycle = 'MOUNTED';
    this.emitter.emit('container:mounted', { mountPoint: this.mountMgr.mountPoint });
  }

  /** Detach the mounted component; shell stays in the DOM. */
  unmount(): void {
    this.mountMgr.unmount();
  }

  /** Show the container with animation. MOUNTED | CLOSED → OPEN */
  async open(): Promise<void> {
    if (this.lifecycle === 'DESTROYED' || this.lifecycle === 'CREATED') return;
    if (this.lifecycle === 'OPEN') return;
    if (this.animating) return;
    this.pendingClose = false;
    this.isMinimized_ = false;
    this.shellEl.removeAttribute('data-minimized');
    delete this.shellEl.dataset['hidden'];
    // When persist is off, reset to the configured initial position each open.
    if (!this.cfg.persist) {
      const r = this.posEngine.resolveAnchor(
        this.cfg.position.anchor,
        this.cfg.position.x,
        this.cfg.position.y,
        this.width,
        this.height,
      );
      this.updateAnchor(r.x, r.y);
    }
    this.applyLayout();
    await this.animate('enter');
    this.lifecycle = 'OPEN';
    if (this.pendingClose) {
      this.pendingClose = false;
      await this.close();
      return;
    }
    this.mountMgr.notifyVisibility(true);
    this.emitter.emit('container:open', {
      mode:       this.mode,
      position:   { x: this.x, y: this.y },
      dimensions: { width: this.width, height: this.height },
    });
    this.shellEl.focus();
  }

  /** Hide the container. Adapter stays mounted. OPEN | MINIMIZED → CLOSED */
  async close(reason = 'user'): Promise<void> {
    if (this.lifecycle !== 'OPEN' && this.lifecycle !== 'MINIMIZED') {
      // Queue a close to run once the current enter-animation finishes.
      if (this.animating) this.pendingClose = true;
      return;
    }
    if (this.animating) return;
    await this.animate('leave');
    this.shellEl.dataset['hidden'] = '';
    this.isMinimized_ = false;
    this.isExpanded_  = false;
    this.shellEl.removeAttribute('data-minimized');
    this.lifecycle = 'CLOSED';
    this.mountMgr.notifyVisibility(false);
    this.emitter.emit('container:close', { reason });
  }

  /** Open if closed; close if open. */
  async toggle(): Promise<void> {
    if (this.lifecycle === 'OPEN' || this.lifecycle === 'MINIMIZED') await this.close();
    else if (this.lifecycle === 'MOUNTED' || this.lifecycle === 'CLOSED') await this.open();
  }

  /** Collapse to ~48 px header height. OPEN → MINIMIZED */
  minimize(): void {
    if (this.lifecycle !== 'OPEN') return;
    this.preMinH      = this.height;
    this.isMinimized_ = true;
    this.shellEl.dataset['minimized'] = '';
    this.lifecycle = 'MINIMIZED';
    this.applyLayout();
    this.mountMgr.notifyVisibility(false);
    this.emitter.emit('container:minimize', {});
  }

  /** Restore from minimized. MINIMIZED → OPEN */
  restore(): void {
    if (this.lifecycle !== 'MINIMIZED') return;
    this.isMinimized_ = false;
    this.shellEl.removeAttribute('data-minimized');
    this.height    = this.preMinH;
    this.lifecycle = 'OPEN';
    this.applyLayout();
    this.mountMgr.notifyVisibility(true);
    this.emitter.emit('container:restore', { dimensions: { width: this.width, height: this.height } });
  }

  /**
   * Toggle expand / restore-from-expand.
   * Direction: left-half viewport → expands rightward; right-half → leftward.
   */
  toggleExpand(): void {
    if (this.lifecycle !== 'OPEN') return;

    if (this.isExpanded_) {
      this.width  = this.preExpW;
      this.height = this.preExpH;
      this.isExpanded_ = false;
      this.updateAnchor(this.preExpX, this.preExpY);
      this.applyLayout();
      this.saveSession();
      this.mountMgr.notifyResize({ width: this.width, height: this.height });
      this.emitter.emit('container:restore', { dimensions: { width: this.width, height: this.height } });
      return;
    }

    this.preExpW = this.width;
    this.preExpH = this.height;
    this.preExpX = this.x;
    this.preExpY = this.y;
    this.isExpanded_ = true;

    const pad  = this.cfg.position.boundaryPadding;
    const newW = Math.min(
      this.posEngine.resolveMax(this.cfg.dimensions.expandedWidth,  'width'),
      window.innerWidth  - pad * 2,
    );
    const newH = Math.min(
      this.posEngine.resolveMax(this.cfg.dimensions.expandedHeight, 'height'),
      window.innerHeight - pad * 2,
    );

    const centerX = this.x + this.width / 2;
    const newX    = centerX <= window.innerWidth / 2
      ? this.x                          // left half → anchor left edge
      : (this.x + this.width) - newW;   // right half → anchor right edge

    this.width  = newW;
    this.height = newH;
    this.updateAnchor(newX, this.y);
    this.applyLayout();
    this.saveSession();
    this.mountMgr.notifyResize({ width: newW, height: newH });
    this.emitter.emit('container:expand', { dimensions: { width: newW, height: newH } });
  }

  /** Switch display mode at runtime. */
  setMode(mode: DisplayMode): void {
    const prev = this.mode;
    const next: DisplayMode = mode === 'auto'
      ? (this.embedTarget ? 'embedded' : 'floating')
      : mode;
    if (next === prev) return;
    this.mode = next;
    this.applyMode();
    this.emitter.emit('container:modeChange', { from: prev, to: next });
  }

  /** Reposition the panel (floating only). */
  setPosition(pos: Partial<IPositionOptions>): void {
    if (this.mode !== 'floating') return;
    const r = this.posEngine.resolveAnchor(
      pos.anchor ?? this.cfg.position.anchor,
      pos.x      ?? this.cfg.position.x,
      pos.y      ?? this.cfg.position.y,
      this.width,
      this.height,
    );
    this.updateAnchor(r.x, r.y);
    if (pos.snapToEdge      !== undefined) this.cfg.position.snapToEdge   = pos.snapToEdge;
    if (pos.boundaryPadding !== undefined) this.posEngine.boundaryPadding = pos.boundaryPadding;
    this.applyLayout();
  }

  /** Reset to the configured default dimensions. Emits container:restore. */
  resetSize(): void {
    this.width  = this.cfg.dimensions.width;
    this.height = this.cfg.dimensions.height;
    this.applyLayout();
    this.saveSession();
    this.mountMgr.notifyResize({ width: this.width, height: this.height });
    this.emitter.emit('container:restore', { dimensions: { width: this.width, height: this.height } });
  }

  /** Resize within configured min/max bounds. */
  setDimensions(dim: Partial<IDimensionOptions>): void {
    const maxW = this.posEngine.resolveMax(dim.maxWidth  ?? this.cfg.dimensions.maxWidth,  'width');
    const maxH = this.posEngine.resolveMax(dim.maxHeight ?? this.cfg.dimensions.maxHeight, 'height');
    const minW = dim.minWidth  ?? this.cfg.dimensions.minWidth;
    const minH = dim.minHeight ?? this.cfg.dimensions.minHeight;
    this.width  = Math.min(Math.max(dim.width  ?? this.width,  minW), maxW);
    this.height = Math.min(Math.max(dim.height ?? this.height, minH), maxH);
    this.applyLayout();
    this.saveSession();
    this.mountMgr.notifyResize({ width: this.width, height: this.height });
  }

  /** Assign / clear embedded target. Switches mode accordingly. */
  setEmbedTarget(el: HTMLElement | null): void {
    this.embedTarget = el;
    const prev = this.mode;
    if (el) {
      el.style.position = el.style.position || 'relative';
      el.appendChild(this.hostEl);
      this.mode = 'embedded';
      this.dragCtrl.setHandle(null);
    } else {
      document.body.appendChild(this.hostEl);
      this.mode = 'floating';
    }
    if (this.mode !== prev) {
      this.applyMode();
      this.emitter.emit('container:modeChange', { from: prev, to: this.mode });
    }
  }

  /** Shallow-merge props and delegate to adapter.update(). */
  updateProps(props: Record<string, unknown>): void {
    this.accProps = { ...this.accProps, ...props };
    this.mountMgr.update(this.accProps);
  }

  /** Returns adapter.getHandle() cast to T. Null before mount or after destroy. */
  getComponentHandle<T = unknown>(): T | null {
    return this.mountMgr.getHandle() as T | null;
  }

  /**
   * Register an element inside the mount point as the drag trigger.
   * Pass null to deregister.
   */
  setDragHandle(el: HTMLElement | null): void {
    if (this.cfg.draggable) this.dragCtrl.setHandle(el);
  }

  /**
   * Programmatically start a drag from viewport coordinates.
   * Used to relay DRAG_START postMessage from an iframe header.
   * @security Always validate event.origin before calling.
   */
  startDrag(x: number, y: number): void {
    if (this.cfg.draggable && this.mode === 'floating') this.dragCtrl.startDrag(x, y);
  }

  /** Full teardown: unmount adapter, remove DOM, remove listeners. → DESTROYED */
  destroy(): void {
    if (this.lifecycle === 'DESTROYED') return;
    this.lifecycle = 'DESTROYED';
    this.dragCtrl.destroy();
    this.resizeCtrl?.destroy();
    this.mountMgr.unmount();
    this.shellEl.removeEventListener('keydown', this.onShellKeyDown);
    window.removeEventListener('resize', this.onWindowResize);
    this.emitter.emit('container:destroy', {});
    this.emitter.destroy();
    this.hostEl.remove();
  }

  /** Subscribe to a lifecycle event. Returns an unsubscribe function. */
  on<E extends ContainerEvent>(
    event: E,
    handler: (payload: EventPayload<E>) => void,
  ): Unsubscribe {
    return this.emitter.on(event, handler);
  }

  /** Returns the raw HTMLElement passed to adapter.mount(). */
  getMountPoint(): HTMLElement {
    return this.mountMgr.mountPoint;
  }

  /** Snapshot of current state. */
  getState(): IContainerState {
    return {
      lifecycle:   this.lifecycle,
      mode:        this.mode,
      x:           this.x,
      y:           this.y,
      width:       this.width,
      height:      this.height,
      isMinimized: this.isMinimized_,
      isExpanded:  this.isExpanded_,
    };
  }
}
