import js from '@eslint/js';
import globals from 'globals';
import vue from 'eslint-plugin-vue';
import ts from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default ts.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'tests/fixtures/source/**',
      'tcgdex_data/**',
      'migration_backups/**',
      'reports/**',
      'frontend/data*/**',
      'frontend/public/**',
      'frontend/dist/**',
      '**/node_modules/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue,js}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { parser: ts.parser },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/prop-name-casing': 'off',
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/component-name-in-template-casing': ['error', 'kebab-case'],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name=/^(ref|reactive|computed)$/]:not([typeArguments])',
          message: 'Explicitly type ref, reactive and computed with their concrete value type.',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  prettier,
  {
    files: ['**/*.vue'],
    rules: {
      // Prettier checks expression indentation; avoid conflicting fixes on nested expressions.
      'vue/script-indent': [
        'error',
        2,
        { baseIndent: 1, switchCase: 1, ignores: ['ConditionalExpression', 'LogicalExpression'] },
      ],
    },
  },
);
