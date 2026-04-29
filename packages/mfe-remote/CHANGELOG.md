# @lsq/mfe-remote

## 0.0.1

### Patch Changes

- Remove company-specific branding: rename CSS classes (`lsq-fc-*` → `fc-*`), storage key prefix (`pulse:fc:` → `fc:`), and update all import paths and docs to use the `@indiavenkatesh` scope

## 0.1.2

### Patch Changes

- Fix ESM build generating `import(undefined)` for external dependencies.

  The shared rspack base config was missing ESM-compatible external resolution. The object-format externals (`commonjs`, `amd`, `root`) have no `module` key, causing rspack to emit `import(undefined)` in ESM output instead of a proper static import. Added `externalsType: 'module'` and a `toEsmExternals` helper that converts the object-format externals to string specifiers for the ESM build.

## 0.1.1

### Patch Changes

- Add `typesVersions` to support subpath type resolution under `moduleResolution: node`; fix `MicrofrontendHost` return type to `JSX.Element` for preact/compat compatibility

## 0.1.0

### Minor Changes

- Initial release
- `createReactAdapter()` — React 18 adapter using `createRoot` with `flushSync` for synchronous handle delivery
- `createPreactAdapter()` — Preact adapter
- `createWebComponentAdapter()` — Web Components (Custom Elements) adapter with DOM property application
- All adapters implement the `MountAdapter` contract from `@lsq/mfe-host`
- ESM and UMD builds per adapter entry (`/react`, `/preact`, `/web-components`)
