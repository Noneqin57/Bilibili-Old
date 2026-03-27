import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const browserGlobals = {
    ...globals.browser,
    ...globals.es2024,
    chrome: 'readonly',
    GM: 'readonly',
    _MUTEX_: 'readonly',
    documentPictureInPicture: 'readonly',
};

export default [
    {
        ignores: [
            'bilibili-api-17.4.1/**',
            'bilibili-html/**',
            'dist/**',
            'docs/**',
            'html/**',
            'log/**',
            'node_modules/**',
            '.agents/**',
            '.claude/**',
            '.continue/**',
            '.github/**',
            '.sisyphus/**',
            '.trae/**',
            'chrome/player/video.js',
            'tampermonkey/main.user.js',
            'tampermonkey/comment/main.user.js',
            '**/*.d.ts',
            '**/*.d.css.ts',
            '**/*.d.html.ts',
            '**/*.d.svg.ts',
            '**/*.d.txt.ts',
        ],
    },
    {
        files: ['src/**/*.ts', 'chrome/**/*.ts', 'tampermonkey/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: browserGlobals,
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            'no-duplicate-imports': 'error',
            'no-var': 'warn',
            'prefer-const': 'warn',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
        },
    },
    {
        files: ['chrome/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.serviceworker,
                ...globals.es2024,
                chrome: 'readonly',
                GM: 'readonly',
                _MUTEX_: 'readonly',
                documentPictureInPicture: 'readonly',
            },
        },
    },
];
