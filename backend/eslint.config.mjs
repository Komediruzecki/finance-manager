import js from '@eslint/js';
import pluginSecurity from 'eslint-plugin-security';
import pluginSonarjs from 'eslint-plugin-sonarjs';

export default [
  js.configs.recommended,
  pluginSecurity.configs.recommended,
  pluginSonarjs.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        setInterval: 'readonly',
        fetch: 'readonly',
        window: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-proto': 'warn',
      'no-empty': 'off',
      'no-prototype-builtins': 'off',
    },
  },
  {
    // Global overrides
    rules: {
      'sonarjs/cognitive-complexity': 'off',
      'security/detect-object-injection': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/super-linear-regex': 'off',
      'security/detect-unsafe-regex': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/no-dead-store': 'off',
      'sonarjs/concise-regex': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-ignored-exceptions': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/no-unused-collection': 'off',
      'no-useless-escape': 'off',
      'sonarjs/publicly-writable-directories': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-session-cookies-on-static-assets': 'off',
      'sonarjs/content-length': 'off',
    }
  },
  {
    ignores: ['node_modules/**', 'test/**', 'jest.setup.js'],
  },
];
