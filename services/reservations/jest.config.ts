import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Relajar noUnusedLocals/noUnusedParameters solo en tests
          noUnusedLocals: false,
          noUnusedParameters: false
        }
      }
    ]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/db/knexfile.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      lines: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false
};

export default config;
