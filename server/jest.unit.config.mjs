import baseConfig from './jest.base.config.mjs';

export default {
    ...baseConfig,
    displayName: 'unit',
    testMatch: ['<rootDir>/apps/**/test/unit/**/*.spec.{js,ts}'],
    coverageDirectory: '<rootDir>/coverage/unit',
};
