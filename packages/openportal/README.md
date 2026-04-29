# @lsq/openportal

A Preact-based portal manager that lets you render components outside the current component tree — into any DOM node, or directly into `document.body`. Useful for modals, toasts, tooltips, drawers, and any UI that needs to escape overflow or stacking context constraints.

---

## Table of Contents

1. [What is a portal?](#what-is-a-portal)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
   - [Portal ID](#portal-id)
   - [Namespace](#namespace)
   - [Portal Index](#portal-index)
5. [API Reference](#api-reference)
   - [openPortal](#openportalid-component-componentprops-container-namespace)
   - [closePortal](#closeportalid)
   - [updatePortal](#updateportalid-component-componentprops)
   - [clearAllPortals](#clearallportals)
   - [clearPortalsByNamespace](#clearportalsbynamespacenamespace)
   - [registerPortal](#registerportalid-component-componentprops-updatecallback-namespace)
   - [unregisterPortal](#unregisterportalid)
   - [getPortal](#getportalid)
   - [getPortalIndex](#getportalindexid)
   - [cleanupPortalElement](#cleanupportalelementid)
   - [portalElements](#portalelements)
6. [Types](#types)
7. [Usage Examples](#usage-examples)
   - [Modal](#modal)
   - [Toast notifications](#toast-notifications)
   - [Drawer into a specific container](#drawer-into-a-specific-container)
   - [Updating a portal's props](#updating-a-portals-props)
   - [Grouping portals with namespaces](#grouping-portals-with-namespaces)
8. [How it works](#how-it-works)

---

## What is a portal?

Normally in Preact (and React), components render inside their parent's DOM subtree. This becomes a problem when you need UI — like a modal overlay or a tooltip — to visually appear on top of everything, because CSS properties like `overflow: hidden` or `z-index` stacking contexts on ancestor elements can clip or hide it.

A **portal** solves this by rendering a component into a separate DOM node that lives outside the current tree — typically appended directly to `document.body`.

`@lsq/openportal` manages this process: creating the DOM node, rendering the Preact component into it, keeping props in sync, and cleaning everything up on close.

---

## Installation

```bash
npm install @lsq/openportal
# or
pnpm add @lsq/openportal
```

`preact` must be installed in your project (it is a peer dependency):

```bash
npm install preact
```

---

## Quick Start

```ts
import { h, ComponentType } from 'preact';
import { openPortal, closePortal } from '@lsq/openportal';

// 1. Define a Preact component to render in the portal
const MyModal: ComponentType<{ title: string }> = ({ title }) => (
  <div class="modal">
    <h2>{title}</h2>
    <button onClick={() => closePortal('my-modal')}>Close</button>
  </div>
);

// 2. Open the portal — renders MyModal into a new <div> appended to document.body
openPortal('my-modal', MyModal, { title: 'Hello from portal!' });

// 3. Close the portal when done — removes the component and the DOM node
closePortal('my-modal');
```

That's it. No providers, no context, no wrapping components needed.

---

## Core Concepts

### Portal ID

Every portal has a unique string **ID**. This is how all operations (open, close, update) target a specific portal. If you call `openPortal` with an ID that already exists, the portal is **updated in place** — it does not create a duplicate.

```ts
// First call — creates the portal
openPortal('my-modal', MyModal, { title: 'First' });

// Second call with same ID — updates the existing portal, no new DOM node
openPortal('my-modal', MyModal, { title: 'Updated' });
```

### Namespace

A **namespace** is an optional string tag you can attach to one or more portals. It lets you close a whole group of portals at once with `clearPortalsByNamespace`.

```ts
openPortal('toast-1', Toast, { message: 'Saved' },   undefined, 'toasts');
openPortal('toast-2', Toast, { message: 'Deleted' }, undefined, 'toasts');

// Close all toasts at once
clearPortalsByNamespace('toasts');
```

### Portal Index

Each portal is assigned a zero-based **index** based on the order it was opened. The index is passed automatically as the `portalIndex` prop to your component, so you can use it for z-index ordering or stacking animations.

```ts
const MyToast: ComponentType<{ message: string; portalIndex: number }> = ({ message, portalIndex }) => (
  <div style={{ zIndex: 1000 + portalIndex }}>{message}</div>
);
```

---

## API Reference

### `openPortal(id, component, componentProps?, container?, namespace?)`

Opens a new portal or updates an existing one.

```ts
function openPortal(
  id: string,
  component: ComponentType<any>,
  componentProps?: Record<string, any>,
  container?: HTMLElement,
  namespace?: string,
): void
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique identifier for the portal. |
| `component` | `ComponentType<any>` | Yes | The Preact component to render. |
| `componentProps` | `Record<string, any>` | No | Props to pass to the component. |
| `container` | `HTMLElement` | No | DOM element to append the portal into. Defaults to `document.body`. |
| `namespace` | `string` | No | Optional group label for bulk operations. |

- If a portal with the given `id` already exists, it is **updated** with the new component and props — no new DOM node is created.
- Does nothing in SSR environments (no `window` or `document`).

---

### `closePortal(id)`

Closes a portal and removes it from the DOM.

```ts
function closePortal(id: string): void
```

- Unregisters the portal from the internal registry.
- Removes the `<div>` element from its container.
- Safe to call on an ID that does not exist (no-op).

---

### `updatePortal(id, component?, componentProps?)`

Updates the component or props of an already-open portal without closing and reopening it.

```ts
function updatePortal(
  id: string,
  component?: ComponentType<any>,
  componentProps?: Record<string, any>,
): void
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | ID of the portal to update. |
| `component` | `ComponentType<any>` | No | Swap to a different component. |
| `componentProps` | `Record<string, any>` | No | New props to render with. |

- Safe to call if the portal does not exist (no-op).
- At least one of `component` or `componentProps` should be provided, otherwise the call has no effect.

---

### `clearAllPortals()`

Closes every open portal at once.

```ts
function clearAllPortals(): void
```

Useful for page navigation or route changes where all floating UI should be dismissed.

---

### `clearPortalsByNamespace(namespace)`

Closes all portals that were opened with the given namespace.

```ts
function clearPortalsByNamespace(namespace: string): void
```

---

### `registerPortal(id, component, componentProps?, updateCallback?, namespace?)`

Low-level function that adds a portal to the internal registry without creating a DOM node or rendering.

```ts
function registerPortal(
  id: string,
  component: ComponentType<any>,
  componentProps?: Record<string, any>,
  updateCallback?: () => void,
  namespace?: string,
): void
```

> **Note:** You rarely need to call this directly. `openPortal` handles both registration and rendering for you. Use `registerPortal` only if you are managing DOM creation yourself.

---

### `unregisterPortal(id)`

Removes a portal from the internal registry without touching the DOM.

```ts
function unregisterPortal(id: string): void
```

> **Note:** Prefer `closePortal` for normal teardown — it cleans up both the registry and the DOM element. Use `unregisterPortal` only if you have already cleaned up the DOM yourself.

---

### `getPortal(id)`

Returns the registry entry for a portal, or `undefined` if it does not exist.

```ts
function getPortal(id: string): PortalEntry | undefined
```

---

### `getPortalIndex(id)`

Returns the zero-based position of a portal in the open order.

```ts
function getPortalIndex(id: string): number
```

Returns `-1` if the portal is not found.

---

### `cleanupPortalElement(id)`

Removes the portal's DOM element from its container and deletes it from the element map, without touching the registry.

```ts
function cleanupPortalElement(id: string): void
```

> **Note:** This is a low-level utility. Prefer `closePortal` for normal usage.

---

### `portalElements`

A `Map<string, { element: HTMLElement; container: HTMLElement }>` that tracks the raw DOM nodes for every open portal. Keyed by portal ID.

```ts
import { portalElements } from '@lsq/openportal';

const entry = portalElements.get('my-modal');
// entry.element   → the <div> the component is rendered into
// entry.container → the parent element (document.body by default)
```

> Reading this map is fine, but mutating it directly is not recommended.

---

## Types

```ts
import type { PortalEntry } from '@lsq/openportal';

interface PortalEntry {
  id: string;
  component: ComponentType<any>;
  componentProps?: Record<string, any>;
  updateCallback?: () => void;
  namespace?: string;
}
```

Your component will also automatically receive a `portalIndex: number` prop at render time (injected by `openPortal`), even if you do not include it in `componentProps`.

---

## Usage Examples

### Modal

```tsx
import { h } from 'preact';
import { openPortal, closePortal } from '@lsq/openportal';

interface ModalProps {
  title: string;
  onConfirm: () => void;
}

const Modal = ({ title, onConfirm }: ModalProps) => (
  <div class="modal-backdrop">
    <div class="modal-box">
      <h2>{title}</h2>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={() => closePortal('confirm-modal')}>Cancel</button>
    </div>
  </div>
);

// Open the modal
openPortal('confirm-modal', Modal, {
  title: 'Are you sure?',
  onConfirm: () => {
    doSomething();
    closePortal('confirm-modal');
  },
});
```

---

### Toast notifications

```tsx
import { h } from 'preact';
import { openPortal, closePortal } from '@lsq/openportal';

interface ToastProps {
  message: string;
  portalIndex: number; // automatically injected
}

const Toast = ({ message, portalIndex }: ToastProps) => (
  <div
    class="toast"
    style={{ bottom: `${20 + portalIndex * 60}px` }}
  >
    {message}
  </div>
);

function showToast(id: string, message: string) {
  openPortal(id, Toast, { message }, undefined, 'toasts');

  // Auto-dismiss after 3 seconds
  setTimeout(() => closePortal(id), 3000);
}

showToast('toast-save',   'Changes saved');
showToast('toast-delete', 'Item deleted');

// Dismiss all toasts at once (e.g. on route change)
// clearPortalsByNamespace('toasts');
```

---

### Drawer into a specific container

By default portals attach to `document.body`. You can target any element instead:

```tsx
import { h } from 'preact';
import { openPortal, closePortal } from '@lsq/openportal';

const Drawer = ({ title }: { title: string }) => (
  <aside class="drawer">
    <h3>{title}</h3>
    <button onClick={() => closePortal('side-drawer')}>Close</button>
  </aside>
);

const sidebar = document.getElementById('sidebar')!;

openPortal('side-drawer', Drawer, { title: 'Settings' }, sidebar);
```

The portal's `<div>` is appended inside `#sidebar` instead of `document.body`.

---

### Updating a portal's props

If you need to change what a portal is showing without closing and reopening it, use `updatePortal`:

```ts
import { openPortal, updatePortal, closePortal } from '@lsq/openportal';

// Open with initial props
openPortal('status-banner', Banner, { status: 'loading', message: 'Fetching data…' });

// Later — update just the props, no flicker or DOM replacement
updatePortal('status-banner', undefined, { status: 'success', message: 'Done!' });

// Or swap to a completely different component
updatePortal('status-banner', ErrorBanner, { error: new Error('Failed') });

// Close when done
closePortal('status-banner');
```

---

### Grouping portals with namespaces

Namespaces let you close a logical group of portals with a single call:

```ts
import { openPortal, clearPortalsByNamespace } from '@lsq/openportal';

// Open several portals under the same namespace
openPortal('tooltip-a', Tooltip, { text: 'Help text A' }, undefined, 'tooltips');
openPortal('tooltip-b', Tooltip, { text: 'Help text B' }, undefined, 'tooltips');
openPortal('tooltip-c', Tooltip, { text: 'Help text C' }, undefined, 'tooltips');

// Dismiss all tooltips at once
clearPortalsByNamespace('tooltips');
```

---

## How it works

```
openPortal('id', Component, props)
  │
  ├─ First call (new ID)
  │    ├── Creates a <div> and appends it to container (default: document.body)
  │    ├── Stores it in portalElements map
  │    ├── Registers the component + props in the internal registry (portalRegistry)
  │    └── Calls preact's render(h(Component, { ...props, portalIndex }), div)
  │
  └─ Subsequent calls (same ID)
       ├── Updates the registry entry (component + props)
       └── Re-renders in the existing <div> via the stored updateCallback

closePortal('id')
  ├── Removes the portal from the registry
  └── Removes the <div> from the DOM
```

The library uses Preact's `render` function directly — there is no hidden component tree, no context, and no wrapper component involved. Each portal is an independent Preact root.
