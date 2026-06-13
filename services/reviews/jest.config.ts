import type { Config } from 'jest';

const config: Config = {
  // Usar ts-jest para compilar TypeScript en tests (Req 16.3)
  preset: 'ts-jest',

  // Entorno Node para microservicio Express
  testEnvironment: 'node',

  // Raíz del proyecto de tests
  rootDir: '.',

  // Patrones de archivos de test
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
  ],

  // Cobertura — requerida ≥ 80% líneas (Req 16.3)
  collectCoverage: false, // activar con --coverage flag
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',       // excluir el entry point
    '!src/**/*.d.ts',
    '!src/config/**',      // configuración de entorno — requiere variables reales
    '!src/db/**',          // conexiones y migraciones — requieren PostgreSQL real
    '!src/middleware/**',  // middleware Express — cubierto por tests de integración
    '!src/controllers/**', // controllers — cubiertos por tests de integración
    '!src/routes/**',      // routes — cubiertos por tests de integración
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 80,
      functions: 80,
      statements: 80,
    },
  },

  // Mapeo de módulos para resolver paths de TypeScript
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Configuración de ts-jest
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          // Relajar strict para tests sin afectar el código de producción
          strict: true,
          esModuleInterop: true,
        },
      },
    ],
  },

  // Variables de entorno por defecto para tests (nunca credenciales reales)
  testEnvironmentOptions: {},

  // Timeout por defecto (ms) — aumentar si se usan testcontainers en integración
  testTimeout: 30000,

  // Mostrar detalles de cada test
  verbose: true,

  // Limpiar mocks entre tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

export default config;
