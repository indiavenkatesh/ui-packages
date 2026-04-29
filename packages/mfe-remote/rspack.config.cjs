const { createLibraryConfig } = require('../../rspack.config.base.cjs');

module.exports = [
  ...createLibraryConfig({
    dirname: __dirname,
    name: 'react',
    globalName: 'MfeRemoteReact',
    entry: './src/react/index.ts',
    externals: {
      react: {
        commonjs: 'react',
        commonjs2: 'react',
        amd: 'react',
        root: 'React',
      },
      'react-dom': {
        commonjs: 'react-dom',
        commonjs2: 'react-dom',
        amd: 'react-dom',
        root: 'ReactDOM',
      },
    },
  }),
  ...createLibraryConfig({
    dirname: __dirname,
    name: 'preact',
    globalName: 'MfeRemotePreact',
    entry: './src/preact/index.ts',
    externals: {
      preact: {
        commonjs: 'preact',
        commonjs2: 'preact',
        amd: 'preact',
        root: 'preact',
      },
    },
  }),
  ...createLibraryConfig({
    dirname: __dirname,
    name: 'web-components',
    globalName: 'MfeRemoteWebComponents',
    entry: './src/web-components/index.ts',
  }),
];
