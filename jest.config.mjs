import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '@testing-library/jest-dom'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/supabase$': '<rootDir>/src/lib/__mocks__/supabase.ts',
  },
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
};

export default createJestConfig(customJestConfig);
