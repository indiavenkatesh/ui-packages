# @lsq/mfe-host

Host-side loader for microfrontends. Bootstraps a remote adapter once and mounts it on demand.

---

## Installation

```bash
npm install @lsq/mfe-host
```

---

## Subpaths

| Import | Purpose |
|--------|---------|
| `@lsq/mfe-host` | Core imperative API — `loadMicrofrontend`, shared types |
| `@lsq/mfe-host/preact` | Preact component + Module Federation hook |

---

## Core API — `@lsq/mfe-host`

### `loadMicrofrontend(adapter)`

Creates a `load` function bound to the given adapter. Bootstrap runs **once** per `loadMicrofrontend()` call regardless of how many times `load()` is called.

```ts
import { loadMicrofrontend } from '@lsq/mfe-host';

const load = loadMicrofrontend(remoteAdapter);

// Mount into a DOM element
const instance = await load(document.getElementById('root'), props);

// Update props
await instance.update({ ...newProps });

// Access the component's imperative handle (if any)
const handle = instance.handle;

// Unmount
await instance.unmount();
```

```ts
function loadMicrofrontend<TProps, THandle = void>(
  adapter: MountAdapter<TProps, THandle>,
): (el: Element, props?: TProps) => Promise<MicrofrontendInstance<TProps, THandle>>
```

If bootstrap fails the promise is rejected and the bootstrap state is reset so the next `load()` call will retry.

---

### `MicrofrontendInstance`

Returned by every `load()` call — one per mounted element.

```ts
interface MicrofrontendInstance<TProps, THandle> {
  unmount(): Promise<void>;
  update(props?: TProps): Promise<void>;
  readonly handle: THandle | undefined;
}
```

---

### `MountAdapter<TProps, THandle>`

The contract the remote MFE must implement and the host consumes.

```ts
interface MountAdapter<TProps, THandle = void> {
  bootstrap?(): Promise<void>;
  mount(el: Element, props?: TProps): void | Promise<void>;
  unmount(el: Element): void | Promise<void>;
  update(el: Element, props?: TProps): void | Promise<void>;
  getHandle?(el: Element): THandle | undefined;
}
```

### `WithReady<THandle>`

Mixin for component props that receive an imperative handle callback from the adapter.

```ts
type WithReady<THandle> = {
  onReady?: (handle: THandle) => void;
};
```

---

## Preact API — `@lsq/mfe-host/preact`

Peer dependencies:

```bash
npm install preact @module-federation/enhanced
```

---

### `MicrofrontendHost`

Preact component that mounts a microfrontend into a `<div>` container. Accepts either a pre-loaded `adapter` or a `moduleId` for loading via Module Federation at runtime.

```ts
import { h } from 'preact';
import { MicrofrontendHost } from '@lsq/mfe-host/preact';

// Mode A — pre-loaded adapter
h(MicrofrontendHost, {
  adapter,
  props: { theme: 'dark' },
  onReady: (inst) => console.log(inst.handle),
});

// Mode B — Module Federation remote ID
h(MicrofrontendHost, {
  moduleId:  'pulseAI/adapter',   // '<remoteName>/<exposedModule>'
  props:     { theme: 'dark' },
  loading:   h(Spinner, null),    // shown while adapter loads
  error:     ErrorBanner,         // ComponentType<{ error: Error }>
  onLoading: () => analytics.track('mfe:loading'),
  onError:   (err) => console.error(err),
  onReady:   (inst) => console.log(inst.handle),
});
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `adapter` | `MountAdapter` | Pre-loaded adapter. Mutually exclusive with `moduleId`. |
| `moduleId` | `string` | MF module ID (`'remoteName/expose'`). Remote must be registered via `registerRemotes` before render. |
| `exportName` | `string` | Named export from the remote module. Default: `'adapter'`. |
| `props` | `TProps` | Props forwarded to the remote component. Memoize to avoid spurious updates. |
| `loading` | `VNode` | Element rendered while the remote adapter is loading. |
| `onLoading` | `() => void` | Called when loading begins. |
| `error` | `ComponentType<{ error: Error }>` | Component rendered on load or mount failure. Receives the error. |
| `onError` | `(err: Error) => void` | Called when an error occurs. |
| `onReady` | `(inst: MicrofrontendInstance) => void` | Called once after the MFE mounts successfully. |
| `class` | `string` | CSS class on the container `<div>`. |
| `style` | `string \| object` | Inline style on the container `<div>`. |

---

### `useRemoteAdapter`

Hook that loads a `MountAdapter` from a pre-registered Module Federation remote at runtime.

Register all remotes **once at app bootstrap** before rendering:

```ts
import { registerRemotes } from '@module-federation/enhanced/runtime';

registerRemotes([
  { name: 'pulseAI',  entry: 'https://cdn.example.com/pulse-ai/remoteEntry.js' },
  { name: 'converse', entry: 'https://cdn.example.com/converse/remoteEntry.js' },
]);
```

Then use the hook anywhere:

```ts
import { useRemoteAdapter, MicrofrontendHost } from '@lsq/mfe-host/preact';

function PulseAIWidget() {
  const { adapter, loading, error } = useRemoteAdapter({
    moduleId: 'pulseAI/adapter',
  });

  if (loading) return h('span', null, 'Loading…');
  if (error)   return h('span', null, error.message);

  return h(MicrofrontendHost, { adapter: adapter!, props: { theme: 'dark' } });
}
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `moduleId` | `string` | MF module ID: `'<remoteName>/<exposedModule>'`. |
| `exportName` | `string` | Named export holding the MountAdapter. Default: `'adapter'`. |
| `skip` | `boolean` | Set `true` to skip loading (returns `{ adapter: null, loading: false, error: null }`). |

#### Returns

| Field | Type | Description |
|-------|------|-------------|
| `adapter` | `MountAdapter \| null` | Resolved adapter, or `null` while loading / on error. |
| `loading` | `boolean` | `true` while the remote module is being fetched. |
| `error` | `Error \| null` | Set if the remote load failed. |

---

## Module Federation setup

### Remote app

```ts
// src/adapter.ts — exposed as './adapter' in MF config
import { createPreactAdapter } from '@lsq/mfe-remote/preact';
import { MyComponent } from './MyComponent';

export const adapter = createPreactAdapter(MyComponent);
```

```js
// rspack.config.js
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

new ModuleFederationPlugin({
  name: 'pulseAI',
  filename: 'remoteEntry.js',
  exposes: { './adapter': './src/adapter.ts' },
  shared: { preact: { singleton: true } },
})
```

### Host app

```js
// rspack.config.js — remotes are optional when using registerRemotes() at runtime
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

new ModuleFederationPlugin({
  name: 'hostApp',
  shared: { preact: { singleton: true } },
})
```

---

## Architecture

```
Host app
  ├── loadMicrofrontend(adapter)          ← @lsq/mfe-host (imperative)
  │     └── load(el, props)
  │           ├── adapter.bootstrap()     (once)
  │           ├── adapter.mount(el, props)
  │           └── MicrofrontendInstance { unmount, update, handle }
  │
  └── MicrofrontendHost / useRemoteAdapter  ← @lsq/mfe-host/preact (declarative)
        └── loadRemote('remoteName/adapter') via @module-federation/enhanced/runtime
              └── loadMicrofrontend(adapter)(el, props)

Remote MFE
  ├── createReactAdapter(MyComponent)    ← @lsq/mfe-remote/react
  ├── createPreactAdapter(MyComponent)   ← @lsq/mfe-remote/preact
  └── createWebComponentAdapter(tag)     ← @lsq/mfe-remote/web-components
```

The host only depends on `@lsq/mfe-host`. The remote only depends on `@lsq/mfe-remote`. The `MountAdapter` type is the shared contract between them.
