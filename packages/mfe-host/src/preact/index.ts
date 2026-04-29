/**
 * @indiavenkatesh/mfe-host/preact
 *
 * Preact adapter for hosting microfrontends.
 *
 * Exports:
 *   MicrofrontendHost  — component that mounts an MFE, with built-in loading/error UI
 *   useRemoteAdapter   — hook that loads a MountAdapter from a registered MF remote
 */

import { h, type ComponentType, type JSX } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import { loadMicrofrontend } from '../index';
import type { MountAdapter, MicrofrontendInstance } from '../types';
import { useRemoteAdapter } from './useRemoteAdapter';

export { useRemoteAdapter } from './useRemoteAdapter';
export type { UseRemoteAdapterOptions, UseRemoteAdapterResult } from './useRemoteAdapter';

// ─── prop types ──────────────────────────────────────────────────────────────

type SourceProps<TProps extends object, THandle> =
  | {
      /** Pre-loaded adapter — use when the adapter is already in scope. */
      adapter: MountAdapter<TProps, THandle>;
      moduleId?: never;
      exportName?: never;
    }
  | {
      /**
       * Module Federation module ID to load the adapter from at runtime.
       * The remote must be registered via `registerRemotes` before rendering,
       * or provide `remoteEntry` to register it automatically.
       * @example 'pulseAI/adapter'
       */
      moduleId: string;
      /** Named export that holds the MountAdapter. @default 'adapter' */
      exportName?: string;
      /**
       * URL to the remote entry file (`.json` or `.js`).
       * When provided, the remote is registered automatically via `registerRemotes`
       * before loading — no need to pre-register at app bootstrap.
       * The remote name is derived from the first segment of `moduleId`.
       * @example 'https://cdn.example.com/pulse-ai/mf-manifest.json'
       */
      remoteEntry?: string;
      adapter?: never;
    };

export type MicrofrontendHostProps<TProps extends object, THandle = void> =
  SourceProps<TProps, THandle> & {
    /** Props forwarded to the remote component. Memoize to avoid spurious updates. */
    props?: TProps;

    /** Element rendered while the remote adapter is loading. */
    loading?: JSX.Element;
    /** Called when loading begins. */
    onLoading?: () => void;

    /** Component rendered when loading the adapter or mounting fails. Receives the error. */
    error?: ComponentType<{ error: Error }>;
    /** Called when an error occurs. */
    onError?: (error: Error) => void;

    /** Called once after the MFE mounts successfully. */
    onReady?: (instance: MicrofrontendInstance<TProps, THandle>) => void;

    class?: string;
    style?: string | Record<string, string | number>;
  };

// ─── component ───────────────────────────────────────────────────────────────

/**
 * Preact component that mounts a microfrontend into a `<div>` container.
 *
 * Supports a pre-loaded `adapter` or a `moduleId` for loading via MF runtime.
 * Renders `loading` and `error` slots during the async lifecycle.
 *
 * @example — with MF remote
 * ```ts
 * h(MicrofrontendHost, {
 *   moduleId: 'pulseAI/adapter',
 *   loading:  h(Spinner, null),
 *   error:    ErrorBanner,          // ComponentType<{ error: Error }>
 *   onError:  (err) => log(err),
 *   props:    { theme: 'dark' },
 * })
 * ```
 */
export function MicrofrontendHost<TProps extends object, THandle = void>(
  rawProps: MicrofrontendHostProps<TProps, THandle>,
): JSX.Element {
  const {
    props,
    loading: LoadingNode,
    onLoading,
    error: ErrorComponent,
    onError,
    onReady,
    class: className,
    style,
  } = rawProps;

  // ── resolve adapter (sync or via MF runtime) ─────────────────────────────

  const hasAdapter = 'adapter' in rawProps && !!rawProps.adapter;

  const remote = useRemoteAdapter<TProps, THandle>({
    moduleId:    hasAdapter ? '' : (rawProps.moduleId ?? ''),
    exportName:  hasAdapter ? undefined : rawProps.exportName,
    remoteEntry: hasAdapter ? undefined : rawProps.remoteEntry,
    skip:        hasAdapter,
  });

  const adapter     = hasAdapter ? rawProps.adapter : remote.adapter;
  const isLoading   = hasAdapter ? false : remote.loading;
  const remoteError = hasAdapter ? null   : remote.error;

  // Stable callback refs.
  const onLoadingRef = useRef(onLoading);
  onLoadingRef.current = onLoading;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Fire onLoading when loading starts.
  useEffect(() => {
    if (isLoading) onLoadingRef.current?.();
  }, [isLoading]);

  // Fire onError when remote load fails.
  useEffect(() => {
    if (remoteError) onErrorRef.current?.(remoteError);
  }, [remoteError]);

  // ── mount / unmount the MFE ───────────────────────────────────────────────

  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef  = useRef<MicrofrontendInstance<TProps, THandle> | null>(null);

  useEffect(() => {
    if (!adapter) return;

    const el = containerRef.current;
    if (!el) return;

    let active = true;

    loadMicrofrontend(adapter)(el, props)
      .then((instance) => {
        if (!active) { void instance.unmount(); return; }
        instanceRef.current = instance;
        onReadyRef.current?.(instance);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const e = err instanceof Error ? err : new Error(String(err));
        onErrorRef.current?.(e);
      });

    return () => {
      active = false;
      void instanceRef.current?.unmount();
      instanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // Forward prop updates to the mounted instance.
  useEffect(() => {
    void instanceRef.current?.update(props);
  }, [props]);

  // ── render ────────────────────────────────────────────────────────────────

  if (isLoading && LoadingNode) return LoadingNode;
  if (remoteError && ErrorComponent) return h(ErrorComponent, { error: remoteError });

  return h('div', { ref: containerRef, class: className, style });
}
