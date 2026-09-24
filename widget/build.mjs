// Bundles widget/src into public/w.js and fails if it's over the 10KB gzipped budget.
//   node widget/build.mjs          build once
//   node widget/build.mjs --watch  rebuild on change (development)
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import * as esbuild from "esbuild";

const OUT = "public/w.js";
const BUDGET_BYTES = 10 * 1024;

const options = {
  entryPoints: ["widget/src/index.ts"],
  outfile: OUT,
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019"],
  legalComments: "none",
};

function checkSize() {
  const gzipped = gzipSync(readFileSync(OUT)).length;
  const kb = (gzipped / 1024).toFixed(2);
  if (gzipped > BUDGET_BYTES) {
    console.error(`widget: ${OUT} is ${kb}KB gzipped, over the 10KB budget.`);
    process.exitCode = 1;
  } else {
    console.log(`widget: ${OUT} ${kb}KB gzipped (budget 10KB)`);
  }
}

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [{ name: "size", setup: (build) => build.onEnd(checkSize) }],
  });
  await ctx.watch();
  console.log("widget: watching widget/src");
} else {
  await esbuild.build(options);
  checkSize();
}
