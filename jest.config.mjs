export default {
    testEnvironment: 'node',

    setupFiles: ['<rootDir>/spec/jest.env.js'],

    testMatch: ['**/spec/**/*.spec.{js,ts}'],

    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },

    extensionsToTreatAsEsm: ['.ts'],

    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            { tsconfig: '<rootDir>/tsconfig.json', useESM: true },
        ],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    collectCoverage: true,
    coverageReporters: ['html', 'text', 'text-summary'],
    coverageDirectory: 'coverage',

    testPathIgnorePatterns: ['/e2e/', '/tests/', '/dist/'],
};
