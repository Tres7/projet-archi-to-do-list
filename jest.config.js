module.exports = {
    setupFiles: ['<rootDir>/spec/jest.env.js'],
    testMatch: ['**/spec/**/*.spec.js'],

    collectCoverage: true,
    coverageReporters: ['html', 'text', 'text-summary'],
    coverageDirectory: 'coverage',

    testPathIgnorePatterns: ['/e2e/', '/tests/'],
};
