/**
 * Um unico arquivo de configuracao com tres "projects", um por nivel da
 * piramide de testes. Isso permite rodar cada nivel isoladamente:
 *
 *   npm run test:unit         -> apenas test/unit
 *   npm run test:integration  -> apenas test/integration (SQLite real)
 *   npm run test:e2e          -> apenas test/e2e (Nest + Supertest)
 *   npm run test:cov          -> os tres, com relatorio de cobertura
 */
const tsJestTransform = {
  '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
};

module.exports = {
  rootDir: '.',
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
      transform: tsJestTransform,
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      transform: tsJestTransform,
      globalSetup: '<rootDir>/test/setup/global-setup.ts',
      setupFilesAfterEnv: ['<rootDir>/test/setup/test-env.ts'],
      maxWorkers: 1,
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/test/e2e/**/*.spec.ts'],
      transform: tsJestTransform,
      globalSetup: '<rootDir>/test/setup/global-setup.ts',
      setupFilesAfterEnv: ['<rootDir>/test/setup/test-env.ts'],
      maxWorkers: 1,
    },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/index.ts',
    '!src/swagger.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      lines: 90,
      statements: 90,
      branches: 85,
      functions: 90,
    },
    // O nucleo (dominio + aplicacao) tem exigencia maior: e onde moram as regras.
    './src/modules/auth/application/': {
      lines: 100,
      statements: 100,
      branches: 100,
      functions: 100,
    },
  },
};
