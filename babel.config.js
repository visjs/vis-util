module.exports = {
  exclude: require("vis-dev-utils").BABEL_IGNORE_RE,
  presets: [["vis-dev-utils/babel-preset", { ts: true }]],
};
