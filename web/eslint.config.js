import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.vite-cache/**'],
  },
  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^[A-Z]',
        },
      ],
    },
  },
];
