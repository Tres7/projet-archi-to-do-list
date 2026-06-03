import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
    path: path.resolve(process.cwd(), '.env.test'),
    override: true,
    quiet: true,
});

const reporters = process.env.GITHUB_ACTIONS
    ? [['github-actions', { silent: false }], 'summary']
    : undefined;

export default {
    testEnvironment: 'node',
    reporters,
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.jest.json',
                useESM: true,
            },
        ],
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    moduleNameMapper: {
        '^@app/common/(.*)$': '<rootDir>/common/$1',
    },
    collectCoverageFrom: [
        'apps/**/*.ts',
        'common/**/*.ts',
        '!**/index.ts',
        '!**/*.d.ts',
        '!**/*.spec.ts',
        '!apps/**/test/**/*.ts',
    ],
    coverageReporters: ['html', 'lcov', 'json-summary', 'text', 'text-summary'],
    testPathIgnorePatterns: [
        '/dist/',
        '/node_modules/',
        '/coverage/',
        '/spec/legacy/',
    ],
};
