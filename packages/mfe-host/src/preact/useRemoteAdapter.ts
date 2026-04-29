import { useState, useEffect } from 'preact/hooks';
import { loadRemote, registerRemotes } from '@module-federation/enhanced/runtime';
import type { MountAdapter } from '../types';

export type UseRemoteAdapterOptions = {
  /**
   * Module Federation module ID: `'<remoteName>/<exposedModule>'`.
   * Remotes must be registered beforehand via `registerRemotes` (once at app bootstrap),
   * or provide `remoteEntry` to register the remote on-the-fly.
   * @example 'myApp/adapter'
   */
  moduleId: string;
  /**
   * Named export from the module that holds the MountAdapter.
   * @default 'adapter'
   */
  exportName?: string;
  /**
   * URL to the remote entry file (`.json` or `.js`).
   * When provided, the remote is registered automatically via `registerRemotes`
   * before loading — no need to call `registerRemotes` at app bootstrap.
   * The remote name is derived from the first segment of `moduleId`.
   * @example 'https://cdn.example.com/my-app/mf-manifest.json'
   */
  remoteEntry?: string;
  /**
   * Set to `true` to skip loading (e.g. when an adapter is already provided).
   * Returns `{ adapter: null, loading: false, error: null }` immediately.
   */
  skip?: boolean;
};

export type UseRemoteAdapterResult<TProps extends object, THandle = void> = {
  adapter: MountAdapter<TProps, THandle> | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Loads a MountAdapter from a pre-registered Module Federation remote.
 *
 * Register all remotes once at app bootstrap:
 * ```ts
 * import { registerRemotes } from '@module-federation/enhanced/runtime';
 * registerRemotes([
 *   { name: 'myApp', entry: 'https://cdn.example.com/my-app/remoteEntry.js' },
 * ]);
 * ```
 *
 * Then use the hook anywhere:
 * ```ts
 * const { adapter, loading, error } = useRemoteAdapter({ moduleId: 'myApp/adapter' });
 * ```
 */
export function useRemoteAdapter<TProps extends object, THandle = void>({
  moduleId,
  exportName = 'adapter',
  remoteEntry,
  skip = false,
}: UseRemoteAdapterOptions): UseRemoteAdapterResult<TProps, THandle> {
  const [adapter, setAdapter] = useState<MountAdapter<TProps, THandle> | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError]     = useState<Error | null>(null);

  useEffect(() => {
    if (skip) return;

    let active = true;

    setLoading(true);
    setError(null);
    setAdapter(null);

    const remoteName = moduleId.split('/')[0];

    const load = remoteEntry
      ? Promise.resolve(
          registerRemotes([{ name: remoteName, entry: remoteEntry }], { force: true }),
        ).then(() => loadRemote<Record<string, unknown>>(moduleId))
      : loadRemote<Record<string, unknown>>(moduleId);

    load
      .then((mod: Record<string, unknown> | null) => {
        if (!active) return;
        if (!mod) throw new Error(`MF remote "${moduleId}" returned nothing.`);

        const resolved = mod[exportName] as MountAdapter<TProps, THandle> | undefined;
        if (!resolved) {
          throw new Error(
            `"${moduleId}" does not export "${exportName}". ` +
            `Available: ${Object.keys(mod).join(', ')}`,
          );
        }

        setAdapter(resolved);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => { active = false; };
  }, [moduleId, exportName, remoteEntry, skip]);

  return { adapter, loading, error };
}
