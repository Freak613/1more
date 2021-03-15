"use strict";

import resolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

const plugins = [
  resolve({
    mainFields: ["module", "jsnext"],
    browser: true,
  }),
  terser(),
];

const files = ["index", "box", "utils"];

export default files.map(name => ({
  input: `${name}.js`,
  output: {
    file: `dist/${name}.min.js`,
    format: "umd",
    name: "1more",
    sourcemap: false,
    exports: "named",
    extend: true,
  },
  plugins,
}));
