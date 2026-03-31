import nextJest from "next/jest.js";

const createJestConfig = nextJest({
    dir: "./",
});

const customJestConfig = {
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    testEnvironment: "jest-environment-jsdom",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    testPathIgnorePatterns: ["<rootDir>/tests/e2e/", "<rootDir>/.next/"],
    modulePathIgnorePatterns: ["<rootDir>/.next/"],
    watchPathIgnorePatterns: ["<rootDir>/.next/"],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};

export default createJestConfig(customJestConfig);
