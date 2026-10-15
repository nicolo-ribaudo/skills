# ecma262-review-tools

Differential-testing harness for spec changes in ecma262 and TC39 proposals. Everything is plain
Node.js (ESM), with no dependencies besides an engine262 checkout for the engine262 tools.

| File | Generic? | What it does |
|---|---|---|
| `prng.mjs` | generic | Seeded PRNG for generators: `rng(seed)` → `{ next, int, chance, pick, shuffle }` |
| `variants.mjs` | generic | Shared by the drivers: variant kinds, env handling, diff classification |
| `corpus-diff.mjs` | generic | Runs a corpus of cases under N variants; reports differing cases per pair |
| `fuzz-diff.mjs` | generic | Seeds → generated cases → N variants; counts crashes, hangs, classified diffs; saves examples |
| `reduce-case.mjs` | generic | Delta-reduces a failing multi-file case under a predicate |
| `engine262-module-runner.mjs` | **modules only** | Runs a module graph (`main.mjs` + imports) on an engine262 checkout |
| `run-case.mjs` | **modules only** | CLI around the module runner, for a single case |
| `new-engine262-worktree.sh` | engine262 | New worktree + build for an experiment (never edit a shared checkout) |

Put all work in the repo's `.tmp/fix-ecma262-bug/<issue-or-task>/`, and make sure `.tmp/.gitignore`
contains `*`.

## Variants

A variant is one implementation of the semantics under test. Configs name several and compare them.

```js
// engine262 (module cases): <caseDir>/<entry> is run with engine262-module-runner.mjs
base: { engine: '/abs/engine262-base', features: ['import-defer'], env: { MY_FIX: '' } },
fix:  { engine: '/abs/engine262-base', features: ['import-defer'], env: { MY_FIX: '1' },
        setup: (E) => E.setSomeScratchMode?.('...') },   // optional, before every run

// anything else: a polyfill, an isolated transcription of a spec algorithm, another engine...
// Must return a deterministic string. Throwing is reported as [HOST-CRASH].
poly: { fn: async ({ caseDir, input, env }) => String(runWithPolyfill(caseDir)) },
```

`baseline: 'base'` compares every variant against `base` only; otherwise all pairs are compared.
`matrix: [{}, { OTHER_FIX: '1' }]` runs everything once per env object, for switches that must
be tested both on and off, e.g. an unmerged sibling fix.

Diffs are classified (`variants.mjs` `classify(a, b)`, overridable per config):
`crash-fixed`, `crash-introduced`, `crash-changed`, `hang-fixed`, `hang-introduced`,
`new-error`, `error-removed` and `output-change`. A fix is clean when, against the baseline,
the only kinds are the ones it is supposed to produce, typically `crash-fixed` or a known
`new-error`.

## engine262 module runner (modules only)

```sh
node run-case.mjs <caseDir> --engine <root> --features a,b --env SWITCH=1 [--setup setup.mjs] [--loads] [--raw]
```

The output is one line per event:
- `[load] spec phase=… from=…`
- `print(...)` output
- `[throw]`, `[reject]`, `[pending]`, `[uncaught]`
- `[NONTERMINATION]`
- `[final] <state>`: look at it, because a top-level-await entry can reject *after* `[pending]`
- `[HOST-CRASH]`: a failed spec Assert counts as a crash and is always a bug

`clean()` drops the `[load]` lines and the crash stack excerpt, so outputs can be compared.

Case convention: one directory per case, with `main.mjs` as the entry and a comment at the top
saying what it shows and what is expected.

In zsh, unquoted `$VAR` is not word-split: write the flags out, or use an array, instead of
`F="--features a,b"; … $F`.

## Corpus

```sh
node corpus-diff.mjs config.mjs [--show] [--json out.json]
```

```js
export default {
  cases: '/abs/repo/.tmp/fix-ecma262-bug/cases',  // or the repo's existing case corpus
  entry: 'main.mjs',
  baseline: 'base',
  variants: { base: {...}, fix: {...} },
  matrix: [{}, { OTHER_FIX: '1' }],
};
```

## Fuzzing

```sh
node fuzz-diff.mjs config.mjs --out <dir> --n 2000 --seed 1 --keep 5
```

```js
import { rng } from '<this dir>/prng.mjs';
export default {
  gen: (seed) => {             // return { files } for engine variants, { input } for fn variants
    const r = rng(seed);
    return { files: { 'main.mjs': `...${r.int(3)}...`, 'a.mjs': '...' } };
  },
  baseline: 'base',
  variants: {...},
  oracle: (outputs, g) => (/ReferenceError/.test(outputs.fix) ? 'tdz' : null), // optional
};
```

- Run disjoint seed ranges in parallel, in the background, for volume.
- The `examples` in the summary point at `<out>/seed-<n>/`. Each has the case files (or
  `input.json`) and `outputs.txt`.
- **Sensitivity check:** also run with a known bug's fix switched off. A fuzzer that can't find
  a known bug proves nothing by finding no new ones.

## Reducing

```sh
node reduce-case.mjs <out>/seed-123 --pred pred.mjs --out <dir> --keep main.mjs
```

`pred.mjs` default-exports `async (caseDir) => boolean`. Make the predicate specific (for
example "base crashes on this Assert **and** fix doesn't"), or the reducer will drift to a
different failure. `--out` must be empty or not exist.

## engine262 worktrees

```sh
new-engine262-worktree.sh /abs/engine262-baseline my-experiment [ref]
```

This creates `../my-experiment` on a new branch, symlinks `node_modules`, copies the git-ignored
generated inputs that a fresh worktree lacks, and builds it.

Transcribe the spec change there behind an env switch, with each spec step as a comment.
Commit it as `SCRATCH: …` and never touch the shared baseline worktree. When done, remove it
with `git -C <baseline> worktree remove --force ../my-experiment`.

## Contributing back

These tools grow with each proposal. If a run builds something reusable, propose adding it here
(and to the skill's references), naming the files. Examples: a script runner, a runner for another
engine or host, a generator for a family of syntax, a new oracle, a polyfill adapter.

## Future work

- A **script** (non-module) runner for engine262, with the same output protocol as
  `engine262-module-runner.mjs`.
- A generic AST-based generator toolkit, beyond the per-proposal generators.
