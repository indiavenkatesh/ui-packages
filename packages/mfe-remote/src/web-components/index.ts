/**
 * @indiavenkatesh/mfe-remote/web-components
 *
 * Web Components (Custom Elements) adapter for use in remote MFEs.
 *
 * Usage (remote MFE):
 *   import { createWebComponentAdapter } from '@indiavenkatesh/mfe-remote/web-components';
 *
 *   // Option A — tag already defined elsewhere:
 *   export const adapter = createWebComponentAdapter('my-widget');
 *
 *   // Option B — define + lazy-register in one step:
 *   export const adapter = createWebComponentAdapter('my-widget', MyWidgetElement);
 *
 * Usage (host):
 *   import { loadMicrofrontend } from '@indiavenkatesh/mfe-host';
 *   const load = loadMicrofrontend(adapter);
 */

import type { MountAdapter } from '@indiavenkatesh/mfe-host';

import type { WebComponentProps, HandleResolver } from './types';
export type { WebComponentProps, HandleResolver } from './types';

/**
 * Build a MountAdapter that appends a custom element into a host element.
 *
 * Props are applied as DOM **properties** (not attributes) so that rich
 * values (objects, arrays, functions) are passed correctly.
 *
 * @param tagName     - Custom element tag name (must contain a hyphen per spec).
 * @param ctor        - Optional constructor to register via `customElements.define`.
 *                      Pass it only if the element is not already registered.
 * @param getHandle   - Optional function that resolves the imperative handle
 *                      from the host element after mount.
 * @param onBootstrap - Optional one-time initialisation callback.
 *
 * @example
 * export const adapter = createWebComponentAdapter(
 *   'my-widget',
 *   MyWidgetElement,
 *   (hostEl) => (hostEl.firstElementChild as MyWidgetElement)?.api,
 * );
 */
export function createWebComponentAdapter<
  TProps extends WebComponentProps = WebComponentProps,
  THandle = void,
>(
  tagName: string,
  ctor?: CustomElementConstructor,
  getHandle?: HandleResolver<THandle>,
  onBootstrap?: () => Promise<void>,
): MountAdapter<TProps, THandle> {
  const elements = new WeakMap<Element, HTMLElement>();

  return {
    bootstrap: (ctor || onBootstrap) ? async () => {
      if (ctor && !customElements.get(tagName)) {
        customElements.define(tagName, ctor);
      }
      await onBootstrap?.();
    } : undefined,

    mount(el, props) {
      const wc = document.createElement(tagName);
      applyProps(wc as HTMLElement & TProps, props);
      el.appendChild(wc);
      elements.set(el, wc);
    },

    unmount(el) {
      el.innerHTML = '';
      elements.delete(el);
    },

    update(el, props) {
      const wc = elements.get(el);
      if (wc) applyProps(wc as HTMLElement & TProps, props);
    },

    getHandle,
  };
}

function applyProps<TProps extends WebComponentProps>(
  el: HTMLElement & TProps,
  props?: TProps,
): void {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    (el as unknown as Record<string, unknown>)[key] = value;
  }
}
