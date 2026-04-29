// jest.config.cjs — root jest config that orchestrates all packages
/** @type {import('jest').Config} */
module.exports = {
  projects: ['<rootDir>/packages/*/jest.config.cjs'],
};
