// rspack.config.base.cjs — shared library build factory for all packages
const path = require('path');

const tsRule = {
  test: /\.tsx?$/,
  use: {
    loader: 'builtin:swc-loader',
    options: {
      jsc: {
        parser: { syntax: 'typescript' },
        target: 'es2020',
      },
    },
  },
  exclude: /node_modules/,
};

/**
 * @param {object} opts
 * @param {string} opts.dirname    - __dirname from the calling package
 * @param {string} opts.name       - output filename stem (e.g. 'cross-tab')
 * @param {string} opts.globalName - UMD global name (e.g. 'CrossTab')
 * @param {string} [opts.entry]    - entry point (default: './src/index.ts')
 * @param {object} [opts.alias]    - resolve.alias overrides
 * @param {object} [opts.externals]- externals config
 * @returns {import('@rspack/core').Configuration[]}
 */
function toEsmExternals(externals) {
  if (!externals) return undefined;
  return Object.fromEntries(
    Object.entries(externals).map(([key, val]) => [
      key,
      typeof val === 'object' ? (val.commonjs || key) : val,
    ])
  );
}

function createLibraryConfig({ dirname, name, globalName, entry = './src/index.ts', alias = {}, externals }) {
  const resolve = {
    extensions: ['.ts', '.tsx', '.js'],
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
    ...(Object.keys(alias).length > 0 ? { alias } : {}),
  };

  const esmExternals = toEsmExternals(externals);

  /** @type {import('@rspack/core').Configuration} */
  const esmConfig = {
    name: `${name}-esm`,
    target: 'web',
    entry,
    output: {
      path: path.resolve(dirname, 'dist'),
      filename: `${name}.js`,
      library: { type: 'module' },
    },
    experiments: { outputModule: true },
    module: { rules: [tsRule] },
    resolve,
    optimization: { minimize: false },
    externalsType: 'module',
    ...(esmExternals ? { externals: esmExternals } : {}),
  };

  /** @type {import('@rspack/core').Configuration} */
  const umdConfig = {
    name: `${name}-umd`,
    target: 'web',
    entry,
    output: {
      path: path.resolve(dirname, 'dist'),
      filename: `${name}.umd.cjs`,
      library: {
        name: globalName,
        type: 'umd',
      },
      globalObject: 'this',
    },
    module: { rules: [tsRule] },
    resolve,
    optimization: { minimize: false },
    ...(externals ? { externals } : {}),
  };

  return [esmConfig, umdConfig];
}

module.exports = { createLibraryConfig };
