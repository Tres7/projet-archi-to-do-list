import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    {
        ignores: [
            '**/node_modules/**',
            '**/coverage/**',
            '**/test_outputs/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**',
            '**/*.db',
            'var/**',
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ['**/*.{ts,js,mjs}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-console': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },

    {
        files: ['**/*.spec.ts', '**/spec/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node,
            },
        },
    },

    eslintConfigPrettier,
];
