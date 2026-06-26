import baseConfig from './jest.base.config.mjs';

export default {
    ...baseConfig,
    displayName: 'unit',
    testMatch: ['<rootDir>/apps/**/test/unit/**/*.spec.{js,ts}'],
    coverageDirectory: '<rootDir>/coverage/unit',
    collectCoverageFrom: [
        ...baseConfig.collectCoverageFrom,
        // CLI entrypoints and migration definitions are exercised by the
        // RUN_MYSQL_TESTS integration suite (mysqlMigrations.spec.ts), not
        // by the unit suite.
        '!apps/**/src/scripts/**/*.ts',
        '!apps/**/src/migrations/**/*.ts',
        '!common/persistence/migrations/runMigrateCli.ts',
    ],
    coverageThreshold: {
        global: {
            lines: 84,
        },
    },
};
