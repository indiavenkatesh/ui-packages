const { createLibraryConfig } = require('../../rspack.config.base.cjs');

module.exports = createLibraryConfig({
  dirname: __dirname,
  name: 'openportal',
  globalName: 'OpenPortal',
  externals: {
    preact: {
      commonjs: 'preact',
      commonjs2: 'preact',
      amd: 'preact',
      root: 'preact',
    },
  },
});
