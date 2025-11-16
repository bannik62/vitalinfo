import svelte from 'eslint-plugin-svelte';

export default [
  ...svelte.configs['flat/recommended'],
  { ignores: ['node_modules', 'dist', 'build', '.vite', 'coverage'] },
  {
    files: ['**/*.js'],
    rules: { 'no-unused-vars': 'warn', 'no-undef': 'off', 'no-console': 'off' }
  }
];
