# @lsq-pulse/floating-container

## 0.0.1

### Patch Changes

- Remove company-specific branding: rename CSS classes (`lsq-fc-*` → `fc-*`), storage key prefix (`pulse:fc:` → `fc:`), and update all import paths and docs to use the `@indiavenkatesh` scope

## 1.0.0

### Major Changes

- Prefix all exported interfaces with `I` (e.g. `StorageConfig` → `IStorageConfig`) — consumers must update type imports to use the new names

## 0.1.0

### Minor Changes

- Initial release
- `FloatingContainer` — zero-dependency shell for floating and embedded display modes
- Drag support with RAF-throttled pointer events and arrow-key navigation
- Eight resize handles (edges + corners) with RAF-throttled updates and keyboard support
- `PositionEngine` — anchor resolution, boundary clamping, and snap-to-edge
- `MountAdapter` interface — framework-agnostic mount/unmount/update/getHandle contract
- Session persistence via `sessionStorage` with per-instance namespace key
- Shadow DOM isolation mode
- Typed event bus (`container:mounted`, `container:open`, `container:close`, `container:minimize`, `container:restore`, `container:expand`, `container:dragStart`, `container:dragEnd`, `container:resizeStart`, `container:resizeEnd`, `container:modeChange`, `container:destroy`, `container:error`)
- ESM and UMD builds
