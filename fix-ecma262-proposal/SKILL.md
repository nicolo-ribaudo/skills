---
name: fix-ecma262-proposal
description: Triages, fixes and differentially verifies bugs in TC39 proposal / ecma262 spec text (ecmarkup), via engine262, polyfills or isolated algorithms. Use for spec issues and reviews.
---

# Fix an ecma262 / TC39 proposal spec bug

Takes a reported problem in spec text and brings it to a verified fix, ready for the user to
commit. The problem can be a GitHub issue, a PR review comment, a bug-hunt finding, or "is this
still a bug?". The skill works for any proposal; module-specific material is labelled as such.

The skill **never commits and never pushes**. It ends by suggesting a commit title and a list
of minimal test cases for the PR description.

## When to use

- "There's a new issue #N from X, what is still to fix?"
- "Y left a review comment on PR #M, fix it as a new commit / on a new branch"
- "Is issue #N still a bug after the latest changes?"
- "Prepare an editorial branch for these nits"
- "Find new bugs in the proposal" (a bug hunt with agents)

## Step 1: Context

**⚠️ CRITICAL: context awareness.** Read the full conversation first, including earlier
decisions, names the user chose, and constraints they set. Read the whole issue or PR,
**comments included** (`gh issue view N --comments`, `gh api repos/O/R/pulls/M/comments`).

Plans go through plan mode (EnterPlanMode → plan file → ExitPlanMode), never only in chat.

## Step 2: Workspace

- Work in the repo-local `.tmp/fix-ecma262-bug/issue-<N>/`
- When creating `.tmp/`, add `.tmp/.gitignore` containing `*`.
- Draft issues from every run go in **one** file, `.tmp/fix-ecma262-bug/draft-issues.md`. Always append, never overwrite.

## Step 3: Triage

1. Fetch the default branch first (`git fetch <remote> main`), and check against it, not
   against a stale checkout.
2. Decide whether the report is:
   - still a bug;
   - already fixed (by which merged PR);
   - a duplicate of an open item;
   - intended behaviour;
   - an upstream problem (ecma262 or a base proposal).
3. Check each claim of the report separately. Reviewers' examples can be slightly wrong; for
   example, an example module may not link. Fix the example and say so.
4. For lists of findings, answer "fixed by … / still open here / upstream / housekeeping",
   with `spec.emu:line` for each.

## Step 4: Layering

Work out what `<ins>`/`<del>` are relative to before editing. Look at:
- the editor's note at the top of the spec;
- the `--load-biblio` entries in `package.json`.

It is **ecma262** unless the spec says it is on top of another proposal.

## Step 5: Edit the spec

- Follow `reference/spec-conventions.md`: layering, ecmarkup quirks, and the checklist of what
  the strict build does **not** catch.
- Build with the repo's strict build (usually `npm run build`) after every edit.
- Use a branch off the up-to-date default branch, or the PR's branch when asked for "a new
  commit in that PR". Prefer amending the user's unpushed work only when they ask.

## Step 6: Verify (one or more strategies)

See `reference/verification-strategies.md` and `ecma262-review-tools/README.md`.

1. Pick the strategies:
   - engine262, for syntax and core semantics;
   - a polyfill, for API-only proposals;
   - the changed algorithms transcribed in isolation, for fast, targeted fuzzing.
2. **Reproduce the failure before the fix**, then show it gone with the fix (`run-case.mjs`,
   or a `fn` variant).
3. Run the corpus (`corpus-diff.mjs`) and fuzzers (`fuzz-diff.mjs`) with the baseline against
   the fix. Every diff must be explained. "Only the N crash cases change" is the goal.
4. Do a sensitivity check: with a known bug's fix switched off, the fuzzer must find it.
5. When the user or a reviewer proposes a simpler fix, run it as another variant. If it's
   stricter than needed, show a **minimal counterexample** (see `reference/reporting.md`).
6. Reduce interesting seeds (`reduce-case.mjs`) and save them as named case folders.

## Step 7: Independent review (normative changes)

Spawn the review trio from `reference/agent-review-and-hunt.md`:
- a spec-text reviewer;
- an independent transcription;
- an adversarial fuzzer.

For "find new bugs", run the bug-hunt team described there. **Re-run every repro an agent
reports before repeating it to the user.** Agents' results only come in through notifications;
never predict them.

## Step 8: Report and hand off

Follow `reference/reporting.md`:
- Lead with the verdict, then the evidence: case paths, counts, spec quotes.
- **Suggested commit title**: `Normative: …` or `Editorial: …`, imperative, no issue number.
- **Minimal test cases for the PR description**: before and after for each fixed behaviour.
- Append any upstream or new issue drafts to `.tmp/fix-ecma262-bug/draft-issues.md`.
- Mention leftovers you noticed but did not fix (one line each).

Do not commit, push, open PRs or post comments. The user does that; if they ask, follow their
repo's conventions.

## Step 9: Improve this skill

If this run produced a **new reusable harness piece**, or **improved the existing ones***, always suggest to the user adding it to
`ecma262-review-tools/` and the references, naming the files. Examples:
- a script runner;
- a runner for another engine or host;
- a polyfill adapter;
- a generator for a family of syntax;
- a new oracle or classification.

Do the same for a new spec-authoring pitfall: suggest adding it to
`reference/spec-conventions.md`.

## Principles

- **Evidence over assertion.** Never claim a result that wasn't run, or report a subagent's
  finding without re-running it.
- **Precise over merely safe.** Prefer the fix that mirrors what evaluation actually does over
  a simpler, over-strict one. Show the difference with a counterexample.
- **Push back with an alternative.** When a requested rename or premise doesn't hold, explain
  why with a small example, then propose a better option and let the user choose. Example:
  "LocalNamedBindings would suggest it includes aliased bindings; UnaliasedImportNames?"
- **Minimal edits.** Keep NOTEs out of algorithms unless asked, mark only the lines that
  change, and don't widen the change beyond the issue.
- **Concise answers.** The user writes short imperatives ("Push", "Drop the note"). Answer the
  same way: the result first, then details.

## Files

- `reference/spec-conventions.md`: layering, ecmarkup quirks, and the hand-check list.
- `reference/verification-strategies.md`: choosing strategies, oracles (generic, plus a modules
  section), and pitfalls.
- `reference/agent-review-and-hunt.md`: the review trio, the bug-hunt team, and brief templates.
- `reference/reporting.md`: formats for triage answers, counterexamples, PR test cases, commit
  titles and draft issues.
- `ecma262-review-tools/README.md`: the harness (corpus and fuzz drivers, reducer, engine262
  runner and worktree script).
