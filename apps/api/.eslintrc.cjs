module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json"
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended-type-checked"],
  ignorePatterns: ["dist"]
};
