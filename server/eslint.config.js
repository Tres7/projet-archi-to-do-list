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
            '**/*.cjs',
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
            'no-empty': ['error', { allowEmptyCatch: true }],
            'prefer-const': 'off',
            'preserve-caught-error': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrors: 'none',
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
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },

    eslintConfigPrettier,
];
