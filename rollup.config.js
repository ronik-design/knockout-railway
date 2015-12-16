import babel from "rollup-plugin-babel";

export default {
  entry: "lib/knockout-railway.js",
  plugins: [babel()],
  dest: "dist/knockout-railway.js",
  format: "cjs"
};
