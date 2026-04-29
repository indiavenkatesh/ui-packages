const baseConfig = require('../../jest.config.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'openportal',
  rootDir: '.',
  moduleNameMapper: {
    // Preact ships as ESM; map to its CJS build so Jest can consume it
    '^preact$': '<rootDir>/node_modules/preact/dist/preact.js',
    '^preact/(.*)$': '<rootDir>/node_modules/preact/$1',
  },
};
