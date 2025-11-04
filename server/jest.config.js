export default {
  // Run tests within the dedicated integration suite folder
  roots: ['<rootDir>/tests'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  // Global setup hook to share database and timeout configuration
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  // All tests are integration style, so no coverage instrumentation is required
  collectCoverage: false
};
