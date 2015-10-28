/* eslint no-console:0 */

import { rollup } from "rollup";
import babel from "rollup-plugin-babel";
// import npm from "rollup-plugin-npm";
// import inject from "rollup-plugin-inject";
// import commonjs from "rollup-plugin-commonjs";


const input = {
  entry: "lib/knockout-railway.js",
  // external: ["object-assign"],
  plugins: [
    // npm({ jsnext: true, main: true }),
    // commonjs(),
    // inject({ "Object.assign": "object-assign" }),
    babel()
  ]
};

const output = {
  dest: "dist/knockout-railway.js",
  format: "cjs"
};

rollup(input).then((bundle) => bundle.write(output)).catch(console.error);
