# @lsq/openportal

## 0.0.1

### Patch Changes

- Remove company-specific branding: rename CSS classes (`lsq-fc-*` → `fc-*`), storage key prefix (`pulse:fc:` → `fc:`), and update all import paths and docs to use the `@indiavenkatesh` scope

## 0.1.0

### Minor Changes

- Initial release
- `openPortal()` — renders a Preact component into a new DOM node outside the current tree; updates in place on repeat calls with the same ID
- `closePortal()` — unmounts the component and removes the DOM node
- `updatePortal()` — updates props or swaps the component of an open portal without closing it
- `clearAllPortals()` — closes every open portal at once
- `clearPortalsByNamespace()` — closes all portals registered under a given namespace
- `registerPortal()` / `unregisterPortal()` — low-level registry helpers
- `getPortal()` / `getPortalIndex()` — registry read helpers
- `cleanupPortalElement()` — removes a portal's DOM node without touching the registry
- `portalElements` — exported map of live DOM nodes keyed by portal ID
- `PortalEntry` type export
- Auto-injects `portalIndex` prop (open order) into every rendered component
- Namespace support for grouping and bulk-closing portals
- Custom container support — portals can target any `HTMLElement`, not just `document.body`
- SSR-safe — no-ops when `window` / `document` are unavailable
- ESM and UMD builds
