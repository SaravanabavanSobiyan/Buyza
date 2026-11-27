export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  testTimeout: 60_000,
  coverageProvider: "v8",
  collectCoverageFrom: ["src/**/*.js", "!src/server.js", "!src/jobs/**", "!src/**/*.snippet.js"],
  coverageReporters: ["text-summary", "lcov"],
  coverageThreshold: { global: { statements: 70, branches: 70, functions: 60, lines: 70 } },
};
