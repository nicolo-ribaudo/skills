# Verification strategies

Use **one or more**. The harness is in `../ecma262-review-tools/`; see its README.

## Choosing

| The proposal changes… | Use |
|---|---|
| syntax, early errors, modules, core semantics (anything engine-internal) | **engine262**: transcribe the change into a worktree, behind an env switch |
| only built-in APIs (new methods, objects, options) | **a polyfill**: implement the spec steps in JS as a `fn` variant |
| either, but the bug is in one or a few algorithms | **an isolated transcription**: the algorithm(s) as plain JS over a small data model, for fast and targeted fuzzing |

The variants usually compared are:
- `base`: the current spec;
- `fix`: the proposed change;
- each alternative someone suggested, such as a reviewer's simpler version.

## Workflow

1. **Audit before trusting.** Compare the transcription (yours or an existing one) with the
   spec text step by step. A "bug" that only exists because the transcription diverges from the
   spec is not a spec bug.
2. **Transcribe** with each spec step as a comment, behind an env switch. On engine262, do this
   in a new worktree (`new-engine262-worktree.sh`), never a shared baseline checkout, and commit
   it as `SCRATCH: …`.
3. **Reproduce first:** the failing case must fail on `base`, and stop failing on `fix`.
4. **Corpus:** run every saved case under all variants (`corpus-diff.mjs`). The goal is "only
   the intended cases change, in the intended way".
5. **Fuzz** (`fuzz-diff.mjs`) with a generator biased toward the area of the bug. Use several
   seed ranges in parallel. Report counts per variant.
6. **Sensitivity check:** switch off the fix for a known bug, and confirm that the fuzzer finds
   it.
7. **Classify every diff:**
   - `crash-fixed`: expected for crash fixes.
   - `new-error`: a stricter check. Is each one justified, or a spurious error in a program that
     works today?
   - `output-change`: needs an explanation.
8. **Reduce** interesting seeds (`reduce-case.mjs`) and save them as named case folders, each with
   a comment saying what it shows. These become the PR test cases.

## Generic oracles

- **Assert failures and host crashes are always bugs.** Spec asserts are claims the text must
  uphold.
- **Termination:** no input may loop forever. Look for cycles in data structures and graphs.
- **An alternative to X behaves like X:** when a proposal adds an alternative form of an existing
  feature, compare a program using it with the equivalent program using the original. Diffs
  must be exactly the intended ones.
- **Declarative vs imperative:** when the same thing can be done with syntax and with an API
  call, both must agree.
- **Order invariance:** where semantics should not depend on declaration or iteration order,
  permute it and compare.
- **Idempotence and repetition:** doing the same operation twice, or in increments, gives the
  same result as doing it once with everything.
- **Fresh vs reused state:** an operation on a fresh realm or object agrees with one that already
  went through other operations.
- **Strict vs over-strict:** when a fix adds a check, count the programs that work on `base`
  and now throw. Each one needs a reason.

## Modules (module proposals only)

- Static `import` agrees with dynamic `import()` (and with `import.defer()` or other phases).
- Repeated `import()`s, with different requested names, behave like one import of the union.
- Each module is evaluated at most once.
- Nothing is evaluated earlier than the spec allows, and nothing that should be evaluated is
  left unevaluated.
- No TDZ `ReferenceError` in acyclic graphs.
- **Check the entry's final promise state.** A top-level-await entry can reject *after* the
  first job; `[pending]` alone hides it. `engine262-module-runner.mjs` prints `[final]`.
- Generators should mix:
  - cycles, TLA modules, JSON/synthetic modules and missing files;
  - every import/export form the proposal touches;
  - both declaration orders.
- Linking errors are deterministic for a given graph. A retry must fail the same way.

## Pitfalls

- Never `pkill -f`/`pgrep -f` (they can match your own shell). Use `ps … | grep "[x]"`.
- Repo-local `.tmp/` only. Long runs go in the background, waiting on a condition rather than
  `sleep`.
- In zsh, unquoted `$VAR` is not word-split. Write flags out explicitly.
- engine262 needs absolute paths for module entries; the runner resolves them.
- Interpret counts against the generator's bias. "0 of 6000" means "not found by this
  generator", not "impossible".
