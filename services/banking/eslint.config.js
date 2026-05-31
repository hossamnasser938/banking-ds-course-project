module.exports = [
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
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
