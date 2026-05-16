import baseConfig from './jest.base.config.mjs';

export default {
    ...baseConfig,
    displayName: 'e2e',
    maxWorkers: 1,
    testMatch: ['<rootDir>/spec/e2e/**/*.spec.{js,ts}'],
    coverageDirectory: '<rootDir>/coverage/e2e',
};
