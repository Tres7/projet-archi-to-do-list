import baseConfig from './jest.base.config.mjs';

export default {
    ...baseConfig,
    displayName: 'integration',
    maxWorkers: 1,
    testMatch: ['<rootDir>/apps/**/test/integration/**/*.spec.{js,ts}'],
    coverageDirectory: '<rootDir>/coverage/integration',
};
