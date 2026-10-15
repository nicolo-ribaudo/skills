# Reporting

Lead with the verdict. Then give the evidence: case paths, counts, `spec.emu:line`, and short
spec quotes. Keep it short; the user reads diffs and cases, not essays.

## Triage answer (issue or list of findings)

```
## Fixed by recent merges
| Item | Fixed by |
## Still open in this proposal
**Normative** – item: what, where (spec.emu:L), case path, fix sketch
**Editorial** – one line each, with spec.emu:L
## Upstream (<base repo>)
– item, where the draft issue is
## Housekeeping
– stale notes, cases to re-baseline, etc.
```

Say explicitly when a report is a duplicate, intended behaviour, or an implementation artifact,
and why.

## Counterexample (when a simpler fix is too strict, or a premise doesn't hold)

A minimal program (all files, with a comment on the key line), and a results table:

```
| | Result |
|---|---|
| current spec | "object" |
| proposed simpler fix | TypeError: … |
| this fix | "object" |
```

Follow it with a three-to-five-step explanation of why, quoting the steps responsible.

## PR description test cases

One per fixed behaviour, smallest program that shows it:

```
### 1. <behaviour in a few words>
```js
// main.js
…
// dep.js
…
```
- Before: <observed on the current spec>
- After: <observed with the fix>
```

Also save each one as a case folder under `.tmp/fix-ecma262-bug/issue-<N>/cases/`, and list the
paths.

Include cases for behaviour that changes as a side effect (e.g. a different error type), not
only for the reported bug.

## Commit title (suggest; never commit)

- `Normative: <imperative summary>` for behaviour changes; `Editorial: <imperative summary>`
  for everything else.
- No issue or PR numbers, no body, no co-author or other trailers (unless the user's repo
  conventions say otherwise).
- When a fix spans unrelated parts, suggest separate commits and give a title for each.

Example: `Normative: Check async deps of deferred namespace re-exports for sync evaluation`.

## Draft issues

Append to `.tmp/fix-ecma262-bug/draft-issues.md`; never overwrite it. Use this format:

```
## <owner/repo>: <title> (<YYYY-MM-DD>, not posted)

<body: what is missing or wrong, a minimal example, the steps responsible, a suggested fix>
```

When a draft credits someone, use their GitHub handle as shown by `gh` (never guess one).
Posting is left to the user. If they ask you to post a comment, end it with the attribution
footer their environment requires.
