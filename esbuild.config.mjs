/// <reference types="node" />
import { build, context } from 'esbuild';

const entryPoints = [
  { in: 'src/contexts/popup/index.ts', out: 'popup' },
  { in: 'src/contexts/worker/index.ts', out: 'worker' },
  'src/i18n.ts',
];

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints,
  outdir: 'package',
  alias: { '@': './src' },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  ...(watch ? { sourcemap: 'inline' } : { minify: true }),
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
