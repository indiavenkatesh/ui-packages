/**
 * Extend your component's props with this to receive the imperative handle
 * callback. Adapters inject `onReady` automatically — components should call
 * it inside `useLayoutEffect` (not `useEffect`) to ensure synchronous delivery.
 */
export type WithReady<THandle> = {
  onReady?: (handle: THandle) => void;
};

/**
 * Contract between host and remote. The remote implements this interface
 * and the host consumes it via loadMicrofrontend().
 *
 * @template TProps  - Props accepted by the component.
 * @template THandle - Optional imperative handle returned after mount.
 */
export type MountAdapter<TProps, THandle = void> = {
  /** One-time initialisation (load shared libs, register globals, …).
   *  Runs exactly once per loadMicrofrontend() call regardless of instance count. */
  bootstrap?: () => Promise<void>;

  /** Mount the component into `el`, optionally with `props`. */
  mount: (el: Element, props?: TProps) => void | Promise<void>;

  /** Unmount / destroy the component mounted in `el`. */
  unmount: (el: Element) => void | Promise<void>;

  /** Re-render the component in `el` with new `props`. */
  update: (el: Element, props?: TProps) => void | Promise<void>;

  /**
   * Return the imperative API handle for the component mounted in `el`.
   * Called synchronously after mount(), so the component must set the handle
   * during mount (e.g. via an onReady callback).
   */
  getHandle?: (el: Element) => THandle | undefined;
};

/** Handle returned by `loadMicrofrontend()(el, props)` — one per mounted element. */
export type MicrofrontendInstance<TProps, THandle = void> = {
  /** Unmount the component and clean up. */
  unmount: () => Promise<void>;
  /** Re-render with new props. */
  update: (props?: TProps) => Promise<void>;
  /** Imperative handle exposed by the component (if any). */
  handle: THandle | undefined;
};
