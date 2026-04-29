/**
 * @indiavenkatesh/mfe-host
 *
 * Host-side loader for microfrontends.
 *
 * Usage:
 *   import { loadMicrofrontend } from '@indiavenkatesh/mfe-host';
 *   const load = loadMicrofrontend(remoteAdapter);
 *   const instance = await load(el, props);
 */

import type { MountAdapter, MicrofrontendInstance } from './types';
export type { WithReady, MountAdapter, MicrofrontendInstance } from './types';

/**
 * Create a `load` function that bootstraps once and mounts on demand.
 *
 * @example
 * const load = loadMicrofrontend(remoteAdapter);
 * const instance = await load(document.getElementById('root'), props);
 * await instance.update({ ...newProps });
 * await instance.unmount();
 */
export function loadMicrofrontend<TProps, THandle = void>(
  adapter: MountAdapter<TProps, THandle>,
): (el: Element, props?: TProps) => Promise<MicrofrontendInstance<TProps, THandle>> {
  // bootstrap is a singleton — runs once per loadMicrofrontend() call regardless of instance count.
  let bootstrapped: Promise<void> | null = null;

  const ensureBootstrapped = (): Promise<void> => {
    if (!bootstrapped) {
      const attempt = Promise.resolve(adapter.bootstrap?.()).catch((e) => {
        // Only reset if no concurrent retry has already replaced the promise.
        if (bootstrapped === attempt) bootstrapped = null;
        return Promise.reject(e);
      });
      bootstrapped = attempt;
    }
    return bootstrapped;
  };

  return async (el, props) => {
    await ensureBootstrapped();
    await adapter.mount(el, props);

    return {
      unmount: ()           => Promise.resolve(adapter.unmount(el)),
      update:  (p?: TProps) => Promise.resolve(adapter.update(el, p)),
      get handle()          { return adapter.getHandle?.(el); },
    };
  };
}
