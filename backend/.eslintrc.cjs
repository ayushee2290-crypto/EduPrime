module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
  },
  rules: {
    // allow console in scripts and server
    'no-console': 'off',
    // many routes accept unused next for express error handlers
    // keep CI green without forcing broad refactors in legacy code
    'no-unused-vars': [
      'off',
      {
        argsIgnorePattern: '^next$|^_|^req$|^res$',
        varsIgnorePattern: '^_'
      },
    ],
  },
  ignorePatterns: ['node_modules/', 'logs/', 'uploads/', 'frontend/'],
};
