# @indiavenkatesh/mfe-remote

Framework adapters for remote MFEs. Each adapter implements the `MountAdapter` contract from `@indiavenkatesh/mfe-host` so the host can mount, update, and unmount your component without knowing its framework.

---

## Installation

```bash
npm install @indiavenkatesh/mfe-remote
```

Peer dependencies (install only what you use):

```bash
npm install react react-dom     # for /react
npm install preact              # for /preact
```

---

## Adapters

### React — `@indiavenkatesh/mfe-remote/react`

Uses React 18 `createRoot` with `flushSync` so imperative handles are available synchronously after mount.

```ts
import { createReactAdapter } from '@indiavenkatesh/mfe-remote/react';
import { loadMicrofrontend } from '@indiavenkatesh/mfe-host';

// Remote MFE — export the adapter
export const adapter = createReactAdapter(MyComponent);

// Host app — consume the adapter
const load = loadMicrofrontend(adapter);
const instance = await load(el, props);
```

#### Signature

```ts
function createReactAdapter<TProps extends object, THandle = void>(
  Component: ComponentType<TProps & WithReady<THandle>>,
  onBootstrap?: () => Promise<void>,
): MountAdapter<TProps, THandle>
```

---

### Preact — `@indiavenkatesh/mfe-remote/preact`

```ts
import { createPreactAdapter } from '@indiavenkatesh/mfe-remote/preact';

export const adapter = createPreactAdapter(MyComponent);
```

#### Signature

```ts
function createPreactAdapter<TProps extends object, THandle = void>(
  Component: ComponentType<TProps & WithReady<THandle>>,
  onBootstrap?: () => Promise<void>,
): MountAdapter<TProps, THandle>
```

---

### Web Components — `@indiavenkatesh/mfe-remote/web-components`

Appends a custom element into the host element and applies props as DOM **properties** (not attributes), so rich values (objects, arrays, functions) are passed correctly.

```ts
import { createWebComponentAdapter } from '@indiavenkatesh/mfe-remote/web-components';

// Option A — tag already registered elsewhere
export const adapter = createWebComponentAdapter('my-widget');

// Option B — register the element in one step
export const adapter = createWebComponentAdapter('my-widget', MyWidgetElement);

// Option C — with an imperative handle
export const adapter = createWebComponentAdapter(
  'my-widget',
  MyWidgetElement,
  (hostEl) => (hostEl.firstElementChild as MyWidgetElement)?.api,
);
```

#### Signature

```ts
function createWebComponentAdapter<
  TProps extends WebComponentProps = WebComponentProps,
  THandle = void,
>(
  tagName: string,
  ctor?: CustomElementConstructor,
  getHandle?: HandleResolver<THandle>,
  onBootstrap?: () => Promise<void>,
): MountAdapter<TProps, THandle>
```

`bootstrap` is only set when `ctor` or `onBootstrap` is provided — no unnecessary async tick otherwise.

---

## Imperative handles

To expose an imperative API from your component, use the `WithReady` mixin. The adapter injects `onReady` automatically — call it inside `useLayoutEffect` (React) or during mount (Preact) to ensure synchronous delivery.

```tsx
import type { WithReady } from '@indiavenkatesh/mfe-host';

type Handle = { focus(): void };
type Props  = WithReady<Handle> & { label: string };

function MyButton({ label, onReady }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    onReady?.({ focus: () => ref.current?.focus() });
  }, []);

  return <button ref={ref}>{label}</button>;
}

export const adapter = createReactAdapter<Omit<Props, keyof WithReady<Handle>>, Handle>(MyButton);
```

Then in the host:

```ts
const instance = await load(el, { label: 'Click me' });
instance.handle?.focus();
```

---

## Types

| Type | Description |
|------|-------------|
| `WebComponentProps` | `Record<string, unknown>` — props applied as DOM properties |
| `HandleResolver<THandle>` | `(hostEl: Element) => THandle \| undefined` — resolves handle from host element |

Both are re-exported from `@indiavenkatesh/mfe-remote/web-components`.
