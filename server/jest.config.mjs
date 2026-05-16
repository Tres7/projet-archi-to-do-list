import baseConfig from './jest.base.config.mjs';

export default {
    ...baseConfig,
    displayName: 'all',
    maxWorkers: 1,
    testMatch: ['**/spec/**/*.spec.{js,ts}', '**/test/**/*.spec.{js,ts}'],
    coverageDirectory: '<rootDir>/coverage/all',
};
