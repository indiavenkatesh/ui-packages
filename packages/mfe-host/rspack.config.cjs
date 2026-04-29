const { createLibraryConfig } = require('../../rspack.config.base.cjs');

module.exports = [
  ...createLibraryConfig({
    dirname: __dirname,
    name: 'mfe-host',
    globalName: 'MfeHost',
  }),
  ...createLibraryConfig({
    dirname: __dirname,
    name: 'preact',
    globalName: 'MfeHostPreact',
    entry: './src/preact/index.ts',
    externals: {
      preact: {
        commonjs: 'preact',
        commonjs2: 'preact',
        amd: 'preact',
        root: 'preact',
      },
      'preact/hooks': {
        commonjs: 'preact/hooks',
        commonjs2: 'preact/hooks',
        amd: 'preact/hooks',
        root: ['preact', 'hooks'],
      },
      // MF runtime is provided by the host app's ModuleFederationPlugin — don't bundle it.
      '@module-federation/enhanced/runtime': {
        commonjs: '@module-federation/enhanced/runtime',
        commonjs2: '@module-federation/enhanced/runtime',
        amd: '@module-federation/enhanced/runtime',
        root: '__federation_runtime__',
      },
    },
  }),
];
