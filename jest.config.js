module.exports = {
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.(test|spec).(ts|tsx)",
    "**/?(*.)+(test|spec).(ts|tsx)",
  ],
  setupFiles: ["<rootDir>/jest.setup.js"],
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/lib/supabase$": "<rootDir>/src/lib/__mocks__/supabase.ts",
  },
};
