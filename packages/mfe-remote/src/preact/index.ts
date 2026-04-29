/**
 * @indiavenkatesh/mfe-remote/preact
 *
 * Preact adapter for use in remote MFEs.
 *
 * Usage (remote MFE):
 *   import { createPreactAdapter } from '@indiavenkatesh/mfe-remote/preact';
 *   export const adapter = createPreactAdapter(MyComponent);
 *
 * Usage (host):
 *   import { loadMicrofrontend } from '@indiavenkatesh/mfe-host';
 *   const load = loadMicrofrontend(adapter);
 */

import { render, h, type ComponentType } from 'preact';
import type { MountAdapter, WithReady } from '@indiavenkatesh/mfe-host';

/**
 * Build a MountAdapter that renders a Preact component into a host element.
 *
 * @param Component   - Any Preact component. If it exposes an imperative handle,
 *                      it should call `props.onReady(handle)` during mount.
 * @param onBootstrap - Optional one-time initialisation callback.
 *
 * @example
 * export const adapter = createPreactAdapter(MyComponent);
 */
export function createPreactAdapter<
  TProps extends object,
  THandle = void,
>(
  Component: ComponentType<TProps & WithReady<THandle>>,
  onBootstrap?: () => Promise<void>,
): MountAdapter<TProps, THandle> {
  const handles = new WeakMap<Element, THandle>();

  return {
    bootstrap: onBootstrap,

    mount(el, props) {
      render(
        h(Component, {
          ...(props as TProps),
          onReady: (handle: THandle) => handles.set(el, handle),
        }),
        el,
      );
    },

    unmount(el) {
      render(null, el);
      handles.delete(el);
    },

    update(el, props) {
      render(
        h(Component, {
          ...(props ?? {}) as TProps,
          onReady: (handle: THandle) => handles.set(el, handle),
        }),
        el,
      );
    },

    getHandle: (el) => handles.get(el),
  };
}
