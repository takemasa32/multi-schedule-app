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
    '^next-auth$': '<rootDir>/src/lib/__mocks__/next-auth.ts',
    '^next-auth/react$': '<rootDir>/src/lib/__mocks__/next-auth-react.ts',
    '^next-auth/providers/google$': '<rootDir>/src/lib/__mocks__/next-auth-providers-google.ts',
    '^@auth/pg-adapter$': '<rootDir>/src/lib/__mocks__/auth-pg-adapter.ts',
  },
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
};

export default createJestConfig(customJestConfig);
