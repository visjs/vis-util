import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import copyGlob from "rollup-plugin-copy-glob";
import resolve from "rollup-plugin-node-resolve";
import { readFileSync } from "fs";
import { terser } from "rollup-plugin-terser";

const babelrc = JSON.parse(readFileSync("./.babelrc"));

const commonPlugins = [
  resolve({
    extensions: [".ts", ".js", ".json"]
  }),
  commonjs(),
  babel({
    ...babelrc,
    babelrc: false,
    extensions: [".ts", ".js"],
    runtimeHelpers: true
  })
];
const rawPlugins = [
  ...commonPlugins,
  copyGlob([{ files: "dev-lib/dist/**/*", dest: "." }])
];
const minPlugins = [
  ...commonPlugins,
  terser({
    output: {
      comments: (_node, { value }) => /@license/.test(value)
    }
  })
];

const configs = [
  {
    input: "src/index.ts",
    output: [
      {
        file: "esm/vis-util.js",
        format: "esm"
      },
      {
        exports: "named",
        extend: true,
        file: "umd/vis-util.js",
        format: "umd",
        name: "vis"
      }
    ],
    plugins: rawPlugins
  }
];

const configsMin = configs.map(({ output, ...rest }) => ({
  ...rest,
  output: output.map(original => {
    const copy = JSON.parse(JSON.stringify(original));
    copy.file = original.file.replace(/\.js$/, ".min.js");
    return copy;
  }),
  plugins: minPlugins
}));

export default [...configs, ...configsMin];
