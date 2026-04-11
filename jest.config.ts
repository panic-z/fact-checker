import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: '<rootDir>/tests/jest-environment-jsdom-fetch.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/__mocks__/styleMock.ts',
    '^react-markdown$': '<rootDir>/tests/__mocks__/reactMarkdownMock.tsx',
    '^remark-gfm$': '<rootDir>/tests/__mocks__/remarkGfmMock.ts',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.test.json',
    },
  },
}

export default config
