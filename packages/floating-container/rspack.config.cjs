const { createLibraryConfig } = require('../../rspack.config.base.cjs');

module.exports = createLibraryConfig({
  dirname: __dirname,
  name: 'floating-container',
  globalName: 'FloatingContainer',
});
