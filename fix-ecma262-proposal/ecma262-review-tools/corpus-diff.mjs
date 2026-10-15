#!/usr/bin/env node
// Runs every case of a corpus under every variant and reports which cases differ.
// Generic: variants can be engine262 checkouts (module cases) or plain-JS functions.
//
//   node corpus-diff.mjs <config.mjs> [--json out.json] [--show]
//
// config.mjs default-exports:
//   {
//     cases: '/abs/dir',          // every subdirectory is a case
//     entry: 'main.mjs',          // engine variants run <case>/<entry>; cases without it are skipped
//     variants: { base: {...}, fix: {...} },   // see variants.mjs
//     baseline: 'base',           // optional: compare every variant against this one only
//     matrix: [{}, { SWITCH: '1' }],           // optional extra env, every case runs once per entry
//     filter: (caseName) => true, // optional
//     classify: (a, b) => string, // optional, defaults to variants.mjs classify()
//   }
//
// --show prints both outputs for every differing case.

import { readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { prepareVariants, classify as defaultClassify, pairs, matrixLabel, loadConfig } from './variants.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
if (!args[0] || args[0].startsWith('--')) {
  console.error('usage: node corpus-diff.mjs <config.mjs> [--json out.json] [--show]');
  process.exit(2);
}
const config = await loadConfig(args[0]);
const entry = config.entry ?? 'main.mjs';
const hasEngine = Object.values(config.variants).some((v) => v.engine);
const cases = readdirSync(config.cases)
  .filter((c) => statSync(join(config.cases, c)).isDirectory())
  .filter((c) => !hasEngine || existsSync(join(config.cases, c, entry)))
  .filter((c) => !config.filter || config.filter(c))
  .sort();
const variants = await prepareVariants(config.variants, { entry, clean: config.clean });
const names = Object.keys(variants);
const cmp = pairs(names, config.baseline);
const classify = config.classify ?? defaultClassify;
const matrix = config.matrix ?? [{}];

const result = Object.fromEntries(cmp.map(([a, b]) => [`${a}/${b}`, []]));
for (const env of matrix) {
  for (const c of cases) {
    const caseDir = join(config.cases, c);
    const out = {};
    for (const n of names) out[n] = await variants[n]({ caseDir, env });
    for (const [a, b] of cmp) {
      if (out[a] === out[b]) continue;
      const item = { case: c, env: matrixLabel(env), kind: classify(out[a], out[b]) };
      if (args.includes('--show') || opt('--json')) Object.assign(item, { [a]: out[a], [b]: out[b] });
      result[`${a}/${b}`].push(item);
    }
  }
}

console.log(`${cases.length} cases x ${matrix.length} env setting(s)`);
for (const [pair, items] of Object.entries(result)) {
  const kinds = {};
  for (const it of items) kinds[it.kind] = (kinds[it.kind] ?? 0) + 1;
  console.log(`\n${pair}: ${items.length} diff(s) ${JSON.stringify(kinds)}`);
  for (const it of items) {
    console.log(`  ${it.case}${it.env === '-' ? '' : ` [${it.env}]`}: ${it.kind}`);
    if (args.includes('--show')) {
      const [a, b] = pair.split('/');
      console.log(`    --- ${a}\n${indent(it[a])}\n    --- ${b}\n${indent(it[b])}`);
    }
  }
}
if (opt('--json')) writeFileSync(opt('--json'), JSON.stringify(result, null, 2));

function indent(s) { return s.split('\n').map((l) => `      ${l}`).join('\n'); }
