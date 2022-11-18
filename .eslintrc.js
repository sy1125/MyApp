module.exports = {
  root: true,
  extends: [
    'prettier',
    'airbnb',
    'airbnb/hooks',
    'prettier/react',
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-shadow': ['error'],
        'no-shadow': 'off',
        'no-undef': 'off',
      },
    },
  ],
};
