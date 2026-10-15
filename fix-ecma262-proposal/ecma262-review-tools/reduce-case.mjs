#!/usr/bin/env node
// Generic greedy delta-reducer for multi-file cases. It shrinks a case while a predicate
// still holds: first it drops whole files, then it drops chunks of lines (halving the chunk
// size down to single lines), repeating until a fixpoint.
//
//   node reduce-case.mjs <caseDir> --pred <pred.mjs> --out <dir> [--keep main.mjs]
//
// pred.mjs default-exports `async (caseDir) => boolean`: true when the candidate still shows
// the behaviour you are reducing (e.g. "variant A crashes and variant B does not"). Make it
// specific, or the reducer will happily reduce to a *different* failure. Files named with
// --keep (repeatable; default main.mjs) are never deleted, only shrunk.
//
// The input directory is not modified; the result is written to --out, which must not
// exist or be empty.

import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { loadConfig } from './variants.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const keepFiles = new Set(args.flatMap((a, i) => (a === '--keep' ? [args[i + 1]] : [])));
if (keepFiles.size === 0) keepFiles.add('main.mjs');
if (!args[0] || !opt('--pred') || !opt('--out')) {
  console.error('usage: node reduce-case.mjs <caseDir> --pred <pred.mjs> --out <dir> [--keep main.mjs]');
  process.exit(2);
}
if (existsSync(opt('--out')) && readdirSync(opt('--out')).length > 0) {
  console.error(`refusing to overwrite the non-empty directory ${opt('--out')}`);
  process.exit(2);
}
const pred = await loadConfig(opt('--pred'));
const OUT = resolve(opt('--out'));
const TRY = `${OUT}.try`;

const listFiles = (dir) => readdirSync(dir, { recursive: true })
  .map((f) => join(dir, f)).filter((f) => statSync(f).isFile())
  .map((f) => relative(dir, f)).sort();
let files = Object.fromEntries(listFiles(args[0]).map((f) => [f, readFileSync(join(args[0], f), 'utf8').split('\n')]));

let tries = 0;
async function holds(candidate) {
  tries += 1;
  rmSync(TRY, { recursive: true, force: true });
  for (const [f, lines] of Object.entries(candidate)) {
    mkdirSync(join(TRY, f, '..'), { recursive: true });
    writeFileSync(join(TRY, f), lines.join('\n'));
  }
  return pred(TRY);
}

if (!(await holds(files))) {
  console.error('the predicate does not hold on the original case');
  process.exit(1);
}
const size = (fs) => Object.values(fs).reduce((n, ls) => n + ls.filter((l) => l.trim()).length, 0);
console.error(`start: ${Object.keys(files).length} files, ${size(files)} non-empty lines`);

let changed = true;
while (changed) {
  changed = false;
  for (const f of Object.keys(files)) {
    if (keepFiles.has(f)) continue;
    const { [f]: _, ...rest } = files;
    if (await holds(rest)) { files = rest; changed = true; }
  }
  for (const f of Object.keys(files)) {
    for (let chunk = Math.max(1, files[f].length >> 1); chunk >= 1; chunk >>= 1) {
      for (let start = 0; start < files[f].length;) {
        const lines = [...files[f].slice(0, start), ...files[f].slice(start + chunk)];
        if (lines.length < files[f].length && await holds({ ...files, [f]: lines })) {
          files = { ...files, [f]: lines }; changed = true;
        } else {
          start += chunk;
        }
      }
    }
  }
}

rmSync(TRY, { recursive: true, force: true });
for (const [f, lines] of Object.entries(files)) {
  mkdirSync(join(OUT, f, '..'), { recursive: true });
  writeFileSync(join(OUT, f), lines.join('\n'));
}
console.error(`done after ${tries} tries: ${Object.keys(files).length} files, ${size(files)} non-empty lines -> ${OUT}`);
