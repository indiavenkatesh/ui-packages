// ── Position ──────────────────────────────────────────────────────────────

export type AnchorPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface IPositionOptions {
  /** Viewport corner the panel is anchored to. @default 'bottom-right' */
  anchor: AnchorPosition;
  /** Horizontal offset from the anchor corner (px or %). @default 24 */
  x: number | string;
  /** Vertical offset from the anchor corner (px or %). @default 24 */
  y: number | string;
  /** Snap to nearest viewport edge after drag ends. @default false */
  snapToEdge: boolean;
  /** Min gap between panel and all four viewport edges (px). @default 8 */
  boundaryPadding: number;
}

// ── Dimensions ───────────────────────────────────────────────────────────

export interface IDimensionOptions {
  /** Initial width (px). @default 380 */
  width: number;
  /** Initial height (px). @default 520 */
  height: number;
  /** Minimum width during resize. @default 280 */
  minWidth: number;
  /** Minimum height during resize. @default 200 */
  minHeight: number;
  /** Maximum width. @default 760 */
  maxWidth: number;
  /** Maximum height. @default '90vh' */
  maxHeight: number | string;
  /** Width when expand() is called. @default 600 */
  expandedWidth: number;
  /** Height when expand() is called. @default '80vh' */
  expandedHeight: number | string;
}

// ── Display mode ──────────────────────────────────────────────────────────

/** @default 'auto' */
export type DisplayMode = 'floating' | 'embedded' | 'auto';

// ── Config ────────────────────────────────────────────────────────────────

export interface IFloatingContainerConfig {
  /** Display mode. @default 'auto' */
  mode?: DisplayMode;
  position?: Partial<IPositionOptions>;
  dimensions?: Partial<IDimensionOptions>;
  /** Enable pointer/touch drag. Floating only. @default true */
  draggable?: boolean;
  /** Enable resize handles. @default true */
  resizable?: boolean;
  /** CSS z-index. @default 9999 */
  zIndex?: number;
  /** Open/close animation duration (ms). @default 200 */
  animationDuration?: number;
  /** Wrap shell in a Shadow DOM for CSS isolation. @default false */
  shadowDom?: boolean;
  /**
   * Whether to remember position and size across close/reopen.
   * - `true`  — position is preserved in memory and in sessionStorage across
   *             page reloads (so it survives a full refresh).
   * - `false` — position resets to the configured default every time the
   *             panel is opened after being closed. @default false
   */
  persist?: boolean;
  /**
   * Key used to namespace sessionStorage entries when `persist` is enabled.
   * Must be unique per FloatingContainer instance on the page to avoid
   * overwriting each other's persisted state. @default 'default'
   */
  sessionKey?: string;
}

// ── MountAdapter ──────────────────────────────────────────────────────────

/**
 * The only contract between the library and the consuming app.
 * Implement this interface to mount any component or app into the container.
 *
 * @example Preact
 *   const adapter: IMountAdapter = {
 *     mount(el) { render(<App />, el); },
 *     unmount() { render(null, mountPoint); },
 *   };
 *
 * @example React
 *   const adapter: IMountAdapter = {
 *     mount(el) { root = createRoot(el); root.render(<App />); },
 *     unmount() { root.unmount(); },
 *   };
 */
export interface IMountAdapter {
  /** Called once when the container shell is ready. Render your component into `mountPoint`. */
  mount(mountPoint: HTMLElement): void;
  /** Called on destroy(). Clean up your component and remove listeners. */
  unmount(): void;
  /** Called by container.updateProps(). Perform a prop update without remounting. */
  update?(props: Record<string, unknown>): void;
  /** Return an imperative API so callers can invoke component functions after mount. */
  getHandle?(): unknown;
  /** Called whenever the container is resized. Notify your component if needed. */
  onResize?(dimensions: { width: number; height: number }): void;
  /** Called when the container opens, closes, or minimizes. Pause/resume background work. */
  onVisibilityChange?(visible: boolean): void;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

export type LifecycleState =
  | 'CREATED'
  | 'MOUNTED'
  | 'OPEN'
  | 'MINIMIZED'
  | 'CLOSED'
  | 'DESTROYED';

// ── State snapshot ────────────────────────────────────────────────────────

export interface IContainerState {
  lifecycle: LifecycleState;
  mode: DisplayMode;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isExpanded: boolean;
}

// ── Events ────────────────────────────────────────────────────────────────

export type ContainerEvent =
  | 'container:mounted'
  | 'container:open'
  | 'container:close'
  | 'container:minimize'
  | 'container:restore'
  | 'container:expand'
  | 'container:dragStart'
  | 'container:dragEnd'
  | 'container:resizeStart'
  | 'container:resizeEnd'
  | 'container:modeChange'
  | 'container:destroy'
  | 'container:error';

export type EventPayload<E extends ContainerEvent> =
  E extends 'container:mounted'     ? { mountPoint: HTMLElement } :
  E extends 'container:open'        ? { mode: DisplayMode; position: { x: number; y: number }; dimensions: { width: number; height: number } } :
  E extends 'container:close'       ? { reason: string } :
  E extends 'container:minimize'    ? Record<string, never> :
  E extends 'container:restore'     ? { dimensions: { width: number; height: number } } :
  E extends 'container:expand'      ? { dimensions: { width: number; height: number } } :
  E extends 'container:dragStart'   ? { x: number; y: number } :
  E extends 'container:dragEnd'     ? { x: number; y: number; snapped: boolean } :
  E extends 'container:resizeStart' ? { width: number; height: number } :
  E extends 'container:resizeEnd'   ? { width: number; height: number } :
  E extends 'container:modeChange'  ? { from: DisplayMode; to: DisplayMode } :
  E extends 'container:destroy'     ? Record<string, never> :
  E extends 'container:error'       ? { code: string; message: string; cause?: unknown } :
  never;

export type Unsubscribe = () => void;
