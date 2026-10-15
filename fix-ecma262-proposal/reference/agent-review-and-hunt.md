# Agent reviews and bug hunts

Use subagents when independent checking is worth the cost: normative fixes, design
alternatives, or "find new bugs". Launch them in the background. Results arrive as
notifications; never predict them. If an orchestrator stops early, its children keep running:
check with ListAgents and take over coordination.

## Hard rules for every agent brief

- Read-only on the spec repo: no commits, pushes, PRs or GitHub posts. Drafts go in files.
- Write only under `.tmp/fix-ecma262-bug/<task>/` (and new engine worktrees). No global `/tmp`.
- Never edit a shared baseline engine worktree. Make a new one; scratch commits only, with no
  co-author trailers.
- Never `pkill -f`/`pgrep -f`.
- State the exact baseline (commit), how to build, how to run cases, and the known open items
  (so they are not re-reported).
- Say what output file to write, and that the final message must be a concise summary.

## Review trio (for a normative change)

1. **Spec-text reviewer** (no engine):
   - every call site updated, and argument and return types match;
   - `<ins>`/`<del>` checked against the real base;
   - a step-by-step soundness argument (e.g. "check returns true ⇒ evaluation never hits the
     Assert");
   - termination and cost;
   - prose accuracy;
   - the commit-title convention;
   - the strict build.
2. **Independent transcription:** writes its own transcription from the spec text in its own
   worktree, without copying the author's. It compares author vs own vs base on the corpus and on
   at least two fuzzers, and reports any mismatch and which side matches the text.
3. **Adversarial fuzzer:** tries to break the fix by finding a remaining crash, a new spurious
   error, non-termination, or a gap in a seen/visited list. It writes a generator biased toward
   the fix's weak points, reduces candidates to `cases/<prefix>-*`, and gives a verdict per
   candidate.

Summarise all three when done:
- what was confirmed;
- what to decide (wording, titles);
- anything that is really an upstream bug.

## Bug-hunt team (finding new bugs)

Keep to roughly 8 agents or fewer unless the user asks for more.

1. **Auditor first:** checks the transcription or polyfill against the spec text at the baseline.
   Hunters' findings stay provisional until it reports.
2. **Hunters**, one angle each, each writing new generators and hand cases:
   - **Generic angles** (choose those that fit the proposal):
     - spec-text review without an implementation: undefined names, types, unguarded subtype
       operations, a table of which edges or fields each AO walks;
     - interaction with existing features and other proposals or hosts;
     - repeated or incremental use and state reuse;
     - error paths and partial failure followed by retry;
     - ordering, async and microtask timing;
     - "alternative to X" and "declarative vs imperative" oracles.
   - **Module-specific angles:**
     - evaluation order and TLA;
     - linking and validation;
     - repeated `import()` with different requested names;
     - JSON, synthetic and host modules;
     - namespace objects.
3. **Verifiers:** for each candidate, an agent that **did not find it** reproduces it, traces the
   spec by hand, and classifies it **CONFIRMED / INTENDED / ARTIFACT** (an implementation
   divergence) **/ DUPLICATE**. For confirmed ones it adds a severity, a fix sketch (optionally
   prototyped behind a switch with corpus and fuzz diffs), and a draft issue body.
4. **Coordinator (you):**
   - re-run every confirmed repro yourself;
   - write `.tmp/fix-ecma262-bug/<task>/REPORT.md`, covering the confirmed bugs (repro,
     observed vs expected, the responsible steps, severity, the similar past fix, a fix sketch,
     the draft issue), the rejected candidates with reasons, and coverage with fuzz counts;
   - append the draft issues to `.tmp/fix-ecma262-bug/draft-issues.md`.

Seed the hunters with the recently fixed issues. Past bug classes generalise well:
- shared accumulators that are never reset (results depend on visit order or redundant edges);
- two AOs disagreeing about which edges they follow;
- a second operation leaving state stale;
- unbounded recursion through cycles;
- async states (`~evaluating-async~`-like) that a sync check forgets.

## Brief template

```
You are <role> for <proposal>, repo <path>, baseline <commit/branch>. Read first: <files>.
Known/out of scope: <list>. Goal: <angle>.
Harness: <engine worktree or polyfill>, run with <command>; corpus at <dir>.
Hard rules: <the list above>.
Write <file>; final message: concise summary with case paths and counts.
```
