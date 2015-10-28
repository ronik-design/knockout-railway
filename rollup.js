/* eslint no-console:0 */

import { rollup } from "rollup";
import npm from "rollup-plugin-npm";
import babel from "rollup-plugin-babel";
import inject from "rollup-plugin-inject";


const input = {
  entry: "lib/knockout-railway.js",
  external: ["object-assign"],
  plugins: [
    npm({ jsnext: true, main: true }),
    inject({ "Object.assign": "object-assign" }),
    babel()
  ]
};

const output = {
  dest: "dist/knockout-railway.js",
  format: "cjs"
};

rollup(input).then((bundle) => bundle.write(output)).catch(console.error);
