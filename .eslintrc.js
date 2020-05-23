module.exports = {
  env: {
    browser: true,
    es6: true,
    mocha: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "prettier/@typescript-eslint",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2019,
  },
  plugins: ["prettier", "eslint-plugin-tsdoc", "eslint-plugin-jsdoc"],
  rules: {
    "prettier/prettier": "error",

    // This enforces valid TSDoc syntax.
    "tsdoc/syntax": "error",

    // Various rules to ensure TSDoc is complete.
    "jsdoc/check-alignment": "error",
    "jsdoc/check-examples": "error",
    "jsdoc/check-indentation": "error",
    "jsdoc/check-param-names": "error",
    "jsdoc/check-syntax": "error",
    "jsdoc/empty-tags": "error",
    "jsdoc/newline-after-description": "error",
    "jsdoc/no-types": "error",
    "jsdoc/require-description": "error",
    "jsdoc/require-description-complete-sentence": "error",
    "jsdoc/require-hyphen-before-param-description": "error",
    "jsdoc/require-jsdoc": "error",
    "jsdoc/require-param": "error",
    "jsdoc/require-param-description": "error",
    "jsdoc/require-param-name": "error",
    "jsdoc/require-returns": "error",
    "jsdoc/require-returns-check": "error",
    "jsdoc/require-returns-description": "error",

    // TypeScript uses other tags that are not a part of standard JSDoc.
    "jsdoc/check-tag-names": [
      "error",
      {
        definedTags: ["remarks", "typeParam"],
      },
    ],

    // This would be a breaking change for little gain. Though there definitely
    // is some merit in this.
    "@typescript-eslint/ban-types": "off",
    // Enforcing this would be a very good thing but with some of the functions
    // I just have no idea how to type them, so disable for now.
    "@typescript-eslint/explicit-module-boundary-types": "off",
    // Empty functions are useful sometimes.
    "@typescript-eslint/no-empty-function": "off",
    // This is really crazy given the functions in this package.
    "@typescript-eslint/no-explicit-any": "off",
    // These are hoisted, I have no idea why it reports them by default.
    "@typescript-eslint/no-use-before-define": [
      "error",
      { functions: false, classes: false, typedefs: false },
    ],
    // False positives for overloading, also tsc compiles with errors anyway.
    "no-dupe-class-members": "off",
    // Blocks typesafe exhaustive switch (switch (x) { … default: const never: never = x }).
    "no-case-declarations": "off",
    // Reports typeof bigint as an error, tsc validates this anyway so no problem turning this off.
    "valid-typeof": "off",
  },
  settings: {
    jsdoc: {
      mode: "typescript",
    },
  },
};
