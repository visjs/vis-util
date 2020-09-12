module.exports = {
  extends: [require.resolve("vis-dev-utils/eslint-shareable-config")],
  overrides: [
    {
      files: ["./test/util.test.js"],
      rules: {
        "no-var": "off",
      },
    },
  ],
};
