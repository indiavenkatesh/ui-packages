# @lsq/mfe-host

## 0.2.2

### Patch Changes

- Fix ESM build generating `import(undefined)` for external dependencies.

  The shared rspack base config was missing ESM-compatible external resolution. The object-format externals (`commonjs`, `amd`, `root`) have no `module` key, causing rspack to emit `import(undefined)` in ESM output instead of a proper static import. Added `externalsType: 'module'` and a `toEsmExternals` helper that converts the object-format externals to string specifiers for the ESM build.

## 0.2.1

### Patch Changes

- Add `typesVersions` to support subpath type resolution under `moduleResolution: node`; fix `MicrofrontendHost` return type to `JSX.Element` for preact/compat compatibility

## 0.2.0

### Minor Changes

- Add `@lsq/mfe-host/preact` subpath with `MicrofrontendHost` component and `useRemoteAdapter` hook. `MicrofrontendHost` mounts any `MountAdapter` into a Preact component with built-in `loading` and `error` slots. `useRemoteAdapter` loads a `MountAdapter` from a pre-registered Module Federation remote at runtime via `@module-federation/enhanced/runtime`, requiring no static `remotes` config in rspack.

## 0.1.0

### Minor Changes

- Initial release
- `loadMicrofrontend()` — host-side loader that bootstraps once and mounts on demand
- Shared types: `MountAdapter`, `MicrofrontendInstance`, `WithReady`
- Bootstrap singleton with retry-reset on failure
- ESM and UMD builds
