import type { IMountAdapter } from './types';

/**
 * Manages the mount point element and delegates lifecycle calls to the adapter.
 *
 * The library owns the shell; MountManager is the boundary between the shell
 * and the consumer's framework. Any adapter implementing IMountAdapter can be
 * passed: Preact, React, Angular, Web Components, or vanilla DOM.
 */
export class MountManager {
  readonly mountPoint: HTMLElement;
  private adapter: IMountAdapter | null = null;
  private _mounted = false;

  constructor(private readonly onError?: (code: string, message: string) => void) {
    this.mountPoint = document.createElement('div');
    this.mountPoint.className = 'fc-mount-point';
  }

  get isMounted(): boolean {
    return this._mounted;
  }

  mount(adapter: IMountAdapter): void {
    if (this._mounted) this.unmount();
    this.adapter = adapter;
    adapter.mount(this.mountPoint);
    this._mounted = true;
  }

  unmount(): void {
    if (!this._mounted || !this.adapter) return;
    this.adapter.unmount();
    this.adapter = null;
    this._mounted = false;
  }

  /**
   * Delegate a shallow-merged prop update to the adapter.
   * Emits a console warning when the adapter has no `update()` implementation.
   */
  update(props: Record<string, unknown>): void {
    if (!this.adapter?.update) {
      this.onError?.(
        'NO_UPDATE',
        'updateProps() called but adapter does not implement update().',
      );
      return;
    }
    this.adapter.update(props);
  }

  /** Returns the value from `adapter.getHandle()`, or null when not available. */
  getHandle(): unknown | null {
    return this.adapter?.getHandle?.() ?? null;
  }

  notifyResize(dimensions: { width: number; height: number }): void {
    this.adapter?.onResize?.(dimensions);
  }

  notifyVisibility(visible: boolean): void {
    this.adapter?.onVisibilityChange?.(visible);
  }
}
