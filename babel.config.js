import { BABEL_IGNORE_RE } from "vis-dev-utils";

export default {
  exclude: BABEL_IGNORE_RE,
  presets: [["vis-dev-utils/babel-preset", { ts: true }]],
};
