// Shared by corpus-diff.mjs and fuzz-diff.mjs. Turns a config's `variants` into runnable
// functions, and classifies output differences. Generic: a variant is either
//
//   { engine: '/abs/engine262-worktree', env: {...}, features: [...], setup: (E) => {...} }
//       runs <caseDir>/<entry> with engine262-module-runner.mjs (MODULE-SPECIFIC), or
//   { fn: async ({ caseDir, input, env }) => string }
//       anything else: a polyfill, an isolated transcription of a spec algorithm, a
//       script runner for another engine... It must return a deterministic string.
//
// `matrix` (optional) is a list of extra env objects; every case runs once per entry, and
// that env is merged under each variant's own env. Use it for switches that should be
// tested both on and off (e.g. an unmerged sibling fix).

import { makeRunner, clean as cleanModuleOutput } from './engine262-module-runner.mjs';
import { join } from 'node:path';

export async function prepareVariants(variants, { entry = 'main.mjs', clean = cleanModuleOutput } = {}) {
  const runners = new Map();
  const prepared = {};
  for (const [name, v] of Object.entries(variants)) {
    if (typeof v.fn === 'function') {
      prepared[name] = async ({ caseDir, input, env }) => {
        const saved = applyEnv({ ...env, ...v.env });
        try { return String(await v.fn({ caseDir, input, env: { ...env, ...v.env } })); } catch (e) {
          return `[HOST-CRASH] ${e?.constructor?.name ?? ''}: ${e?.message}`;
        } finally { restoreEnv(saved); }
      };
    } else if (v.engine) {
      const key = `${v.engine}\0${(v.features ?? []).join(',')}`;
      if (!runners.has(key)) runners.set(key, await makeRunner(v.engine, { features: v.features ?? [], supportedImportAttributes: v.supportedImportAttributes }));
      const { runCase } = runners.get(key);
      prepared[name] = async ({ caseDir, env }) => clean(runCase(join(caseDir, entry), { env: { ...env, ...v.env }, setup: v.setup }));
    } else {
      throw new Error(`variant ${name}: needs either \`engine\` or \`fn\``);
    }
  }
  return prepared;
}

function applyEnv(env = {}) {
  const saved = {};
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k];
    if (v === undefined || v === null) delete process.env[k]; else process.env[k] = String(v);
  }
  return saved;
}

function restoreEnv(saved) {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
}

export const isCrash = (o) => /\[HOST-CRASH\]/.test(o);
export const isNonTermination = (o) => /\[NONTERMINATION\]/.test(o);
const errorCount = (o) => (o.match(/\[throw\]|\[reject\]|\[final\] rejected|\[uncaught\]|\b\w*Error\b|\bthrew\b/g) ?? []).length;

// Classifies how output `b` differs from output `a` (a = reference, b = candidate).
export function classify(a, b) {
  if (a === b) return 'same';
  if (isCrash(a) && !isCrash(b)) return 'crash-fixed';
  if (!isCrash(a) && isCrash(b)) return 'crash-introduced';
  if (isCrash(a) && isCrash(b)) return 'crash-changed';
  if (isNonTermination(a) !== isNonTermination(b)) return isNonTermination(a) ? 'hang-fixed' : 'hang-introduced';
  const ea = errorCount(a); const eb = errorCount(b);
  if (eb > ea) return 'new-error';
  if (eb < ea) return 'error-removed';
  return 'output-change';
}

// Pairs to compare: every variant against `baseline` if given, otherwise all pairs.
export function pairs(names, baseline) {
  if (baseline) return names.filter((n) => n !== baseline).map((n) => [baseline, n]);
  const out = [];
  for (let i = 0; i < names.length; i += 1) for (let j = i + 1; j < names.length; j += 1) out.push([names[i], names[j]]);
  return out;
}

export function matrixLabel(env) {
  const keys = Object.keys(env);
  return keys.length ? keys.map((k) => `${k}=${env[k]}`).join(',') : '-';
}

export async function loadConfig(path) {
  const { pathToFileURL } = await import('node:url');
  const { resolve } = await import('node:path');
  return (await import(pathToFileURL(resolve(path)).href)).default;
}
