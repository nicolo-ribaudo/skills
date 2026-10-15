#!/usr/bin/env node
// Differential fuzzing: generates cases from seeds, runs them under every variant, and
// counts crashes, hangs and classified differences. Generic: variants can be engine262
// checkouts (module cases) or plain-JS functions (polyfill / isolated algorithm).
//
//   node fuzz-diff.mjs <config.mjs> --out <dir> [--n 1000] [--seed 1] [--keep 5]
//
// config.mjs default-exports:
//   {
//     gen: (seed) => ({ files: { 'main.mjs': '...', 'a.mjs': '...' } })   // written to a case dir
//          or     ({ input: anything })                                    // passed to fn variants
//          or     null                                                      // skip this seed
//     entry: 'main.mjs',
//     variants: {...}, baseline?: 'base', matrix?: [{...}], classify?: (a, b) => string,
//     oracle?: (outputs, gen) => string | null,   // optional property check per seed:
//                                                 // return a label to count a violation
//   }
//
// Prints a JSON summary. The first --keep seeds of every (pair, kind) and every oracle
// label are saved under <out>/seed-<n>/ with an outputs.txt (and input.json for `input`
// generators) next to the case files, so
// they can be reduced with reduce-case.mjs and promoted into the corpus.
//
// Run several seed ranges in parallel (in the background) to go faster; each run uses its
// own <out>/work-<seed>/ scratch directory.

import { mkdirSync, rmSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { prepareVariants, classify as defaultClassify, isCrash, isNonTermination, pairs, matrixLabel, loadConfig } from './variants.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!args[0] || args[0].startsWith('--') || !opt('--out')) {
  console.error('usage: node fuzz-diff.mjs <config.mjs> --out <dir> [--n 1000] [--seed 1] [--keep 5]');
  process.exit(2);
}
const config = await loadConfig(args[0]);
const N = Number(opt('--n', 1000));
const SEED0 = Number(opt('--seed', 1));
const KEEP = Number(opt('--keep', 5));
const OUT = resolve(opt('--out'));
const entry = config.entry ?? 'main.mjs';
const variants = await prepareVariants(config.variants, { entry, clean: config.clean });
const names = Object.keys(variants);
const cmp = pairs(names, config.baseline);
const classify = config.classify ?? defaultClassify;
const matrix = config.matrix ?? [{}];
const work = join(OUT, `work-${SEED0}`);

const summary = { n: 0, skipped: 0, crash: {}, hang: {}, diffs: {}, oracle: {}, examples: {} };
const keep = (key, seed, caseDir, outputs, input) => {
  const list = (summary.examples[key] ??= []);
  if (list.length >= KEEP) return;
  list.push(seed);
  const dest = join(OUT, `seed-${seed}`);
  if (caseDir && !existsSync(dest)) cpSync(caseDir, dest, { recursive: true });
  mkdirSync(dest, { recursive: true });
  if (input !== undefined) writeFileSync(join(dest, 'input.json'), `${JSON.stringify(input, null, 2)}\n`);
  writeFileSync(join(dest, 'outputs.txt'), Object.entries(outputs).map(([k, v]) => `=== ${k}\n${v}`).join('\n\n') + '\n');
};

for (let seed = SEED0; seed < SEED0 + N; seed += 1) {
  const g = config.gen(seed);
  if (!g) { summary.skipped += 1; continue; }
  let caseDir;
  if (g.files) {
    rmSync(work, { recursive: true, force: true });
    for (const [f, c] of Object.entries(g.files)) {
      mkdirSync(dirname(join(work, f)), { recursive: true });
      writeFileSync(join(work, f), c);
    }
    caseDir = work;
  }
  summary.n += 1;
  for (const env of matrix) {
    const label = matrixLabel(env);
    const outputs = {};
    for (const n of names) outputs[n] = await variants[n]({ caseDir, input: g.input, env });
    for (const n of names) {
      const k = `${n} [${label}]`;
      if (isCrash(outputs[n])) { summary.crash[k] = (summary.crash[k] ?? 0) + 1; keep(`crash ${k}`, seed, caseDir, outputs, g.input); }
      if (isNonTermination(outputs[n])) { summary.hang[k] = (summary.hang[k] ?? 0) + 1; keep(`hang ${k}`, seed, caseDir, outputs, g.input); }
    }
    for (const [a, b] of cmp) {
      if (outputs[a] === outputs[b]) continue;
      const kind = classify(outputs[a], outputs[b]);
      const k = `${a}/${b} [${label}]`;
      const d = (summary.diffs[k] ??= {});
      d[kind] = (d[kind] ?? 0) + 1;
      keep(`${k} ${kind}`, seed, caseDir, outputs, g.input);
    }
    if (config.oracle) {
      const v = config.oracle(outputs, g);
      if (v) { const k = `${v} [${label}]`; summary.oracle[k] = (summary.oracle[k] ?? 0) + 1; keep(`oracle ${k}`, seed, caseDir, outputs, g.input); }
    }
  }
}
rmSync(work, { recursive: true, force: true });
console.log(JSON.stringify({ seeds: [SEED0, SEED0 + N - 1], ...summary }, null, 2));
