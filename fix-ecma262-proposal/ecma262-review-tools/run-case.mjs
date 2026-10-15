#!/usr/bin/env node
// MODULE-SPECIFIC: runs one module case (<caseDir>/main.mjs) on an engine262 checkout.
//
//   node run-case.mjs <caseDir> --engine <root> [--entry main.mjs] [--features a,b]
//                     [--env K=V]... [--setup <setup.mjs>] [--loads] [--raw]
//
// --env       sets an env var for this run (repeatable); scratch builds read their switches from it
// --setup     a module whose default export `(E) => void` is called before running, e.g. to set
//             a scratch mode exported by the engine build
// --loads     keep the [load] lines; --raw keeps everything, including the crash stack excerpt

import { resolve, join } from 'node:path';
import { makeRunner, clean } from './engine262-module-runner.mjs';
import { loadConfig } from './variants.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const all = (k) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
if (!args[0] || args[0].startsWith('--') || !opt('--engine')) {
  console.error('usage: node run-case.mjs <caseDir> --engine <root> [--entry main.mjs] [--features a,b] [--env K=V]... [--setup setup.mjs] [--loads] [--raw]');
  process.exit(2);
}
const env = Object.fromEntries(all('--env').map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i), kv.slice(i + 1)]; }));
const setup = opt('--setup') ? await loadConfig(opt('--setup')) : undefined;
const features = opt('--features', '').split(',').filter(Boolean);
const { runCase } = await makeRunner(resolve(opt('--engine')), { features });
const out = runCase(join(resolve(args[0]), opt('--entry', 'main.mjs')), { env, setup });
console.log(args.includes('--raw') ? out : clean(out, { loads: args.includes('--loads') }));
