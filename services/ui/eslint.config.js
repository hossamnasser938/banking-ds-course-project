export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module"
    },
    rules: {
      "no-console": "off"
    }
  }
];
