// jest.config.base.cjs — shared jest settings for all packages
/** @type {import('jest').Config} */
const baseConfig = {
  transform: {
    '^.+\\.tsx?$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript' },
        target: 'es2020',
      },
    }],
  },
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/*.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};

module.exports = baseConfig;
