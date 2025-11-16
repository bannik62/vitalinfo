const svelteParser = require('svelte-eslint-parser');

module.exports = [
  { ignores: ['node_modules', 'dist', 'build', '.vite', 'coverage'] },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      ecmaVersion: 2024,
      sourceType: 'module'
    },
    rules: { 'no-unused-vars': 'warn', 'no-undef': 'off', 'no-console': 'off' }
  },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
    rules: { 'no-unused-vars': 'warn', 'no-undef': 'off', 'no-console': 'off' }
  }
];
