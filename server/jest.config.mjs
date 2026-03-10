import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
    path: path.resolve(process.cwd(), '.env.test'),
    override: true,
    quiet: true,
});

export default {
    testEnvironment: 'node',
    maxWorkers: 1,
    testMatch: ['**/spec/**/*.spec.{js,ts}'],
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.jest.json',
                useESM: true,
            },
        ],
    },
    collectCoverageFrom: [
        'apps/**/*.{ts,tsx,js,jsx}',
        'common/**/*.{ts,tsx,js,jsx}',
        '!**/index.{ts,tsx,js,jsx}',
        '!**/*.d.ts',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    collectCoverage: true,
    coverageReporters: ['html', 'text', 'text-summary'],
    coverageDirectory: 'coverage',
    testPathIgnorePatterns: [
        '/tests/',
        '/dist/',
        '/node_modules/',
        '/coverage/',
        '/spec/legacy/',
    ],
};
