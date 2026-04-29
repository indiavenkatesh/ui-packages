# @lsq/floating-container

A framework-agnostic floating panel library. It owns the shell — position, size, drag, resize, and lifecycle — and never touches the content inside. Any framework (React, Preact, Vue, Angular, vanilla DOM) can render into the container by implementing a single `MountAdapter` interface.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
   - [FloatingContainerConfig](#floatingcontainerconfig)
   - [PositionOptions](#positionoptions)
   - [DimensionOptions](#dimensionoptions)
4. [MountAdapter](#mountadapter)
5. [Public API](#public-api)
6. [Events](#events)
7. [Lifecycle States](#lifecycle-states)
8. [Session Persistence](#session-persistence)
9. [Mobile / Responsive Behaviour](#mobile--responsive-behaviour)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Framework Examples](#framework-examples)
12. [Advanced Usage](#advanced-usage)

---

## Installation

```bash
npm install @lsq/floating-container
```

No external CSS file is required. The library injects its own styles into `<head>` automatically on first use.

---

## Quick Start

```ts
import { FloatingContainer } from '@lsq/floating-container';

// 1. Create the container
const container = new FloatingContainer({
  mode:       'floating',
  position:   { anchor: 'bottom-right', x: 20, y: 20 },
  dimensions: { width: 380, height: 520 },
});

// 2. Implement a MountAdapter for your framework
const adapter = {
  mount(mountPoint) {
    mountPoint.innerHTML = '<p>Hello from the panel!</p>';
  },
  unmount() {
    // clean up if needed
  },
};

// 3. Mount and open
container.mount(adapter);
container.open();
```

---

## Configuration

Pass a `FloatingContainerConfig` object to the constructor. Every field is optional — the library ships with sensible defaults.

### FloatingContainerConfig

| Property | Type | Default | Description |
|---|---|---|---|
| `mode` | `'floating' \| 'embedded' \| 'auto'` | `'auto'` | Display mode. `floating` = fixed overlay. `embedded` = fills a target element. `auto` = floating unless an embed target is set. |
| `position` | `Partial<PositionOptions>` | see below | Where the panel appears in the viewport. |
| `dimensions` | `Partial<DimensionOptions>` | see below | Panel size and resize limits. |
| `draggable` | `boolean` | `true` | Enable pointer / touch drag. Floating mode only. |
| `resizable` | `boolean` | `true` | Enable resize handles on the right, bottom, and corner edges. |
| `zIndex` | `number` | `9999` | CSS `z-index` applied to the shell. |
| `animationDuration` | `number` | `200` | Open/close fade+slide animation duration in milliseconds. Set to `0` to disable. |
| `shadowDom` | `boolean` | `false` | Wrap the shell in a Shadow DOM for CSS isolation from the host page. |

---

### PositionOptions

Controls where the panel is placed in the viewport. All fields are optional in config (merged with defaults).

| Property | Type | Default | Description |
|---|---|---|---|
| `anchor` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-right'` | The viewport corner the panel is anchored to. |
| `x` | `number \| string` | `24` | Horizontal offset **from the anchor corner** in px or `%` (e.g. `'5%'`). |
| `y` | `number \| string` | `24` | Vertical offset **from the anchor corner** in px or `%`. |
| `snapToEdge` | `boolean` | `false` | After a drag ends, snap the panel to the nearest left or right viewport edge. |
| `boundaryPadding` | `number` | `8` | Minimum gap (px) between the panel and all four viewport edges. |

**How `x` and `y` map to screen coordinates:**

| Anchor | Panel left | Panel top |
|---|---|---|
| `top-left` | `x` | `y` |
| `top-right` | `vw − width − x` | `y` |
| `bottom-left` | `x` | `vh − height − y` |
| `bottom-right` | `vw − width − x` | `vh − height − y` |

So `{ anchor: 'bottom-right', x: 20, y: 20 }` places the panel 20 px from the right edge and 20 px from the bottom — regardless of viewport size.

---

### DimensionOptions

Controls the initial size and resize limits.

| Property | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `380` | Initial width in px. |
| `height` | `number` | `520` | Initial height in px. |
| `minWidth` | `number` | `280` | Minimum width during resize. |
| `minHeight` | `number` | `200` | Minimum height during resize. |
| `maxWidth` | `number \| string` | `760` | Maximum width. Accepts `'80vw'` style strings. |
| `maxHeight` | `number \| string` | `'90vh'` | Maximum height. Accepts `'90vh'` style strings. |
| `expandedWidth` | `number \| string` | `600` | Width used when `expand()` is called. |
| `expandedHeight` | `number \| string` | `'80vh'` | Height used when `expand()` is called. |

---

## MountAdapter

The `MountAdapter` interface is the only contract between the library and your app. Implement it to render any framework into the container's mount point.

```ts
interface MountAdapter {
  // Required
  mount(mountPoint: HTMLElement): void;
  unmount(): void;

  // Optional
  update?(props: Record<string, unknown>): void;
  getHandle?(): unknown;
  onResize?(dimensions: { width: number; height: number }): void;
  onVisibilityChange?(visible: boolean): void;
}
```

| Method | When called | Purpose |
|---|---|---|
| `mount(mountPoint)` | Once on `container.mount()` | Render your component into `mountPoint`. |
| `unmount()` | On `container.destroy()` | Tear down your component and remove event listeners. |
| `update?(props)` | On `container.updateProps()` | Apply prop changes without remounting. |
| `getHandle?()` | On `container.getComponentHandle()` | Return an imperative API object from your component. |
| `onResize?(dim)` | After every resize | Notify your component of the new width/height. |
| `onVisibilityChange?(visible)` | On open / close / minimize | Pause background work when the panel is hidden. |

---

## Public API

All methods are on the `FloatingContainer` instance.

### Lifecycle

```ts
container.mount(adapter: MountAdapter): void
```
Attaches the adapter and adds the shell to the DOM. Must be called before `open()`.

> **Note:** Calling `mount()` while the panel is `OPEN` or `MINIMIZED` is a no-op. Close the panel first before remounting with a different adapter.

```ts
container.open(): Promise<void>
```
Shows the panel with an enter animation. State: `MOUNTED | CLOSED → OPEN`.

> **Note:** If an animation is already running (e.g. a `close()` animation), this call is a no-op. Wait for the current animation to finish before calling again.

```ts
container.close(reason?: string): Promise<void>
```
Hides the panel with a leave animation. The adapter stays mounted. State: `OPEN | MINIMIZED → CLOSED`.

Closing always resets both the minimized and expanded states, so the panel opens in its normal size on the next `open()` call.

> **Note:** If an animation is already running (e.g. an `open()` animation), this call is a no-op.

```ts
container.toggle(): Promise<void>
```
Opens if closed, closes if open.

```ts
container.minimize(): void
```
Collapses the panel to ~48 px (header height only). State: `OPEN → MINIMIZED`.

```ts
container.restore(): void
```
Restores from minimized back to full height. State: `MINIMIZED → OPEN`.

```ts
container.expand(): void
```
Expands to `expandedWidth` / `expandedHeight`. Calling again collapses back to the previous size. State: `OPEN` only.

Both the position (x, y) and size (width, height) before expanding are saved internally. On collapse, the panel returns to **exactly** the same position and size it was at before `expand()` was called — including the Y coordinate.

```ts
container.unmount(): void
```
Detaches the adapter without removing the shell from the DOM.

```ts
container.destroy(): void
```
Full teardown — unmounts the adapter, removes the DOM element, removes all event listeners. State: `→ DESTROYED`.

---

### Position & Size

```ts
container.setPosition(pos: Partial<PositionOptions>): void
```
Repositions the panel. Floating mode only. Recalculates from the given anchor/offset.

```ts
container.setDimensions(dim: Partial<DimensionOptions>): void
```
Resizes the panel within the configured min/max bounds.

```ts
container.setMode(mode: DisplayMode): void
```
Switches between `'floating'` and `'embedded'` at runtime.

```ts
container.setEmbedTarget(el: HTMLElement | null): void
```
Assigns a host element for embedded mode. Pass `null` to return to floating mode.

---

### Content & Props

```ts
container.setDragHandle(el: HTMLElement | null): void
```
Registers an element inside the mount point as the drag trigger. Pass `null` to deregister. Must be called after `mount()`.

```ts
container.updateProps(props: Record<string, unknown>): void
```
Shallow-merges `props` and calls `adapter.update(props)`. Useful for passing new data to the mounted component without remounting.

```ts
container.getComponentHandle<T = unknown>(): T | null
```
Returns the value from `adapter.getHandle()` cast to `T`. Returns `null` before mount or after destroy.

```ts
container.getMountPoint(): HTMLElement
```
Returns the raw `HTMLElement` that the adapter renders into.

---

### Drag from iframe

```ts
container.startDrag(x: number, y: number): void
```
Programmatically begins a drag from viewport coordinates. Use this to relay a `PULSE_DRAG_START` `postMessage` from a cross-origin iframe header.

```ts
// In the host page, listening to iframe messages:
window.addEventListener('message', (e) => {
  if (e.data?.type === 'PULSE_DRAG_START') {
    container.startDrag(e.data.x, e.data.y);
  }
});
```

> **Security:** Always validate `event.origin` before calling `startDrag`.

---

### Events

```ts
container.on(event: ContainerEvent, handler): Unsubscribe
```
Subscribe to a lifecycle event. Returns an unsubscribe function.

```ts
const off = container.on('container:dragEnd', ({ x, y, snapped }) => {
  console.log('Dragged to', x, y, snapped ? '(snapped)' : '');
});

off(); // remove the listener
```

---

### State

```ts
container.getState(): ContainerState
```
Returns a snapshot of the current state.

```ts
interface ContainerState {
  lifecycle:   'CREATED' | 'MOUNTED' | 'OPEN' | 'MINIMIZED' | 'CLOSED' | 'DESTROYED';
  mode:        'floating' | 'embedded' | 'auto';
  x:           number;
  y:           number;
  width:       number;
  height:      number;
  isMinimized: boolean;
  isExpanded:  boolean;
}
```

---

## Events

Subscribe with `container.on(eventName, handler)`.

| Event | Payload | Fired when |
|---|---|---|
| `container:mounted` | `{ mountPoint }` | `mount()` completes |
| `container:open` | `{ mode, position, dimensions }` | Panel becomes visible |
| `container:close` | `{ reason }` | Panel is hidden |
| `container:minimize` | `{}` | Panel collapses to header |
| `container:restore` | `{ dimensions }` | Panel expands from minimized or expanded state |
| `container:expand` | `{ dimensions }` | Panel expands to expanded size |
| `container:dragStart` | `{ x, y }` | Drag begins |
| `container:dragEnd` | `{ x, y, snapped }` | Drag ends |
| `container:resizeStart` | `{ width, height }` | Resize begins |
| `container:resizeEnd` | `{ width, height }` | Resize ends |
| `container:modeChange` | `{ from, to }` | Mode switches |
| `container:destroy` | `{}` | `destroy()` is called |
| `container:error` | `{ code, message, cause? }` | Internal error |

---

## Lifecycle States

```
CREATED → MOUNTED → OPEN ⇄ MINIMIZED
                ↓
              CLOSED
                ↓
            DESTROYED
```

| State | Entered by | What is possible |
|---|---|---|
| `CREATED` | Constructor | — |
| `MOUNTED` | `mount()` | `open()` |
| `OPEN` | `open()` | `close()`, `minimize()`, `expand()`, `toggle()` |
| `MINIMIZED` | `minimize()` | `restore()`, `close()` |
| `CLOSED` | `close()` | `open()`, `toggle()`, `mount()` (swap adapter) |
| `DESTROYED` | `destroy()` | Nothing — all calls are no-ops |

**Important state rules:**
- `mount()` is a no-op when the panel is `OPEN` or `MINIMIZED`
- `open()` and `close()` are no-ops while a transition animation is already running
- `close()` always resets both `isMinimized` and `isExpanded` flags to `false`

---

## Session Persistence

When in `floating` mode, the library automatically saves position and size to `sessionStorage` after every drag or resize. On the next page load, the panel is restored to the last known position instead of recalculating from the anchor config.

**Storage keys:**

| Key | Value |
|---|---|
| `pulse:fc:x` | Left position (px) |
| `pulse:fc:y` | Top position (px) |
| `pulse:fc:width` | Width (px) |
| `pulse:fc:height` | Height (px) |

**Expanded state is never saved to session.**
If the user expands the panel, drags it, or resizes it while expanded, none of those changes are written to session storage. The session always reflects the panel's pre-expand state. On reload, the panel opens at the normal (non-expanded) position and size regardless of what the user did while expanded.

**To reset to the config anchor position**, clear the keys:

```js
['x', 'y', 'width', 'height'].forEach(k =>
  sessionStorage.removeItem(`pulse:fc:${k}`)
);
```

**When is session NOT written:**
- While the panel is expanded (`isExpanded = true`)
- While in `embedded` mode

Session storage is scoped to the browser tab. A normal page reload (`F5`) or hard reload (`Ctrl+Shift+R`) does **not** clear session storage — only closing the tab does.

---

## Mobile / Responsive Behaviour

The library handles small and narrow viewports automatically — no extra configuration is needed.

**Height clamping**

On every layout update, the displayed height is capped to:
```
effectiveHeight = min(configuredHeight, viewportHeight − boundaryPadding × 2)
```
This means the panel never extends below the bottom edge of the viewport, even if the configured `height` is larger than the screen (e.g. a 500 px panel on a 480 px landscape mobile screen).

The configured `height` is preserved internally — when the user rotates back to portrait, the panel returns to its full configured height automatically.

**Position re-clamping on resize**

Whenever the viewport changes (rotation, browser chrome appearing/disappearing), `applyLayout()` is called and the position is re-clamped using the new effective height. The panel always stays within the viewport boundary.

**Expand on mobile**

`expand()` already caps `expandedWidth` and `expandedHeight` to `viewport − 2 × boundaryPadding`, so the expanded panel always fits the screen regardless of the configured values.

**Collapse after expand**

After collapsing from expanded view, the panel returns to the **exact** position (x and y) it was at before expanding — not just x, but y too.

---

## Keyboard Shortcuts

| Key | Condition | Action |
|---|---|---|
| `Arrow keys` | Drag handle is focused | Move panel by 8 px |
| `Shift + Arrow keys` | Resize handle is focused | Resize panel by 8 px |
| `Escape` | Panel is focused | Close the panel |

---

## Framework Examples

### Vanilla DOM

```ts
import { FloatingContainer } from '@lsq/floating-container';

const container = new FloatingContainer({
  position: { anchor: 'bottom-right', x: 20, y: 20 },
});

container.mount({
  mount(el) {
    el.innerHTML = `<div style="padding:16px">Hello World</div>`;
  },
  unmount() {},
});

container.open();
```

---

### React

```tsx
import { FloatingContainer, MountAdapter } from '@lsq/floating-container';
import { createRoot, Root } from 'react-dom/client';
import { App } from './App';

let root: Root;

const adapter: MountAdapter = {
  mount(mountPoint) {
    root = createRoot(mountPoint);
    root.render(<App />);
  },
  unmount() {
    root.unmount();
  },
  onVisibilityChange(visible) {
    // Pause polling, animations, etc. when hidden
  },
};

const container = new FloatingContainer({
  position:   { anchor: 'bottom-right', x: 20, y: 20 },
  dimensions: { width: 380, height: 520 },
});

container.mount(adapter);
container.open();
```

---

### Preact

```tsx
import { FloatingContainer, MountAdapter } from '@lsq/floating-container';
import { render } from 'preact';
import { App } from './App';

const adapter: MountAdapter = {
  mount(el) { render(<App />, el); },
  unmount()  { render(null, mountPoint); },
};
```

---

### With a drag handle

Register a header element inside your component as the drag trigger after mount:

```ts
container.mount(adapter);

// Once your component has rendered its header:
const header = document.querySelector('#my-panel-header') as HTMLElement;
container.setDragHandle(header);

container.open();
```

To exclude a button inside the header from triggering drag, add `data-drag-exclude`:

```html
<header id="my-panel-header">
  Panel Title
  <button data-drag-exclude>✕</button>
</header>
```

---

### Listening to events

```ts
container.on('container:open', ({ position, dimensions }) => {
  console.log('Opened at', position, dimensions);
});

container.on('container:dragEnd', ({ x, y, snapped }) => {
  console.log(`Dropped at ${x}, ${y}`, snapped ? '— snapped to edge' : '');
});

container.on('container:resizeEnd', ({ width, height }) => {
  console.log(`Resized to ${width}×${height}`);
});
```

---

## Advanced Usage

### Shadow DOM isolation

Enable this when the host page has global CSS that bleeds into the panel:

```ts
const container = new FloatingContainer({ shadowDom: true });
```

The shell and all its styles are encapsulated in a Shadow DOM. Note that global CSS variables on `:root` will still be accessible inside the shadow, but class-based styles from the host will not.

---

### Embedded mode

Render the panel inside a specific element instead of floating over the page:

```ts
const container = new FloatingContainer({ mode: 'embedded' });
const target = document.getElementById('sidebar') as HTMLElement;

container.setEmbedTarget(target);
container.mount(adapter);
container.open();
```

In embedded mode, drag and resize are disabled. The panel fills the target element completely.

---

### Snap to edge

After dragging, automatically snap the panel to the nearest left or right edge:

```ts
const container = new FloatingContainer({
  position: { anchor: 'bottom-right', x: 20, y: 20, snapToEdge: true },
});
```

---

### Singleton pattern (recommended)

Create one instance and reuse it across open/close cycles rather than creating a new one per interaction:

```ts
// pulse.ts
import { FloatingContainer } from '@lsq/floating-container';

export const pulseContainer = new FloatingContainer({
  mode:       'floating',
  position:   { anchor: 'bottom-right', x: 20, y: 20 },
  dimensions: { width: 280, height: 500 },
});
```

```ts
// button click handler
import { pulseContainer } from './pulse';
pulseContainer.toggle();
```

---

### Passing props to a mounted component

```ts
container.updateProps({ userId: 'abc123', theme: 'dark' });
```

Your adapter's `update()` method receives the shallow-merged props:

```ts
const adapter: MountAdapter = {
  mount(el)  { /* initial render */ },
  unmount()  { /* teardown */ },
  update(props) {
    // re-render with new props
  },
};
```

---

### Imperative component handle

Expose an API from inside your component using `getHandle`:

```ts
const adapter: MountAdapter = {
  mount(el) { /* render */ },
  unmount()  { /* teardown */ },
  getHandle() {
    return { focusInput: () => document.querySelector('#chat-input')?.focus() };
  },
};

// Later, from outside:
const handle = container.getComponentHandle<{ focusInput(): void }>();
handle?.focusInput();
```
