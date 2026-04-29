/**
 * @indiavenkatesh/mfe-remote/react
 *
 * React 18 adapter for use in remote MFEs.
 *
 * Usage (remote MFE):
 *   import { createReactAdapter } from '@indiavenkatesh/mfe-remote/react';
 *   export const adapter = createReactAdapter(MyComponent);
 *
 * Usage (host):
 *   import { loadMicrofrontend } from '@indiavenkatesh/mfe-host';
 *   const load = loadMicrofrontend(adapter);
 */

import { createElement, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { MountAdapter, WithReady } from '@indiavenkatesh/mfe-host';

/**
 * Build a MountAdapter that renders a React 18 component into a host element.
 * Uses `createRoot` for concurrent-mode rendering.
 *
 * @param Component   - Any React component. If it exposes an imperative handle,
 *                      it should call `props.onReady(handle)` inside
 *                      `useLayoutEffect` (not `useEffect`) — mount uses
 *                      `flushSync` so layout effects fire synchronously.
 * @param onBootstrap - Optional one-time initialisation callback.
 *
 * @example
 * export const adapter = createReactAdapter(MyButton);
 */
export function createReactAdapter<
  TProps extends object,
  THandle = void,
>(
  Component: ComponentType<TProps & WithReady<THandle>>,
  onBootstrap?: () => Promise<void>,
): MountAdapter<TProps, THandle> {
  const roots   = new WeakMap<Element, Root>();
  const handles = new WeakMap<Element, THandle>();

  return {
    bootstrap: onBootstrap,

    mount(el, props) {
      let root = roots.get(el);
      if (!root) {
        root = createRoot(el);
        roots.set(el, root);
      }
      // flushSync forces React to render synchronously so onReady (called from
      // useLayoutEffect) fires before mount() returns — guaranteeing that
      // getHandle() finds the handle when core snapshots it immediately after.
      flushSync(() => {
        root!.render(
          createElement(Component, {
            ...(props as TProps),
            onReady: (handle: THandle) => handles.set(el, handle),
          }),
        );
      });
    },

    unmount(el) {
      roots.get(el)?.unmount();
      roots.delete(el);
      handles.delete(el);
    },

    update(el, props) {
      roots.get(el)?.render(
        createElement(Component, {
          ...(props ?? {}) as TProps,
          onReady: (handle: THandle) => handles.set(el, handle),
        }),
      );
    },

    getHandle: (el) => handles.get(el),
  };
}
