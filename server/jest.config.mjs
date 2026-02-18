import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
    path: path.resolve(process.cwd(), '.env.test'),
    override: true,
    quiet: true,
});

export default {
    testEnvironment: 'node',

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
    collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    collectCoverage: true,
    coverageReporters: ['html', 'text', 'text-summary'],
    coverageDirectory: 'coverage',

    testPathIgnorePatterns: ['/e2e/', '/tests/', '/dist/'],
};
