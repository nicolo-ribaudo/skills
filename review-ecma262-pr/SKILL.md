---
name: review-ecma262-pr
description: Review a tc39/ecma262 pull request for editorial issues and possible bugs, from the perspective of a spec editor. Gathers the PR diff, existing editor reviews, and checks consistency with the rest of spec.html, then writes a .claude/.reviews/pr-<number>-<date>.md notes file for the user to manually go through. Use when the user asks to review an ecma262 PR, check a PR for editorial issues, or prepare review notes for a pull request. Never posts anything to GitHub.
---

# Reviewing an ecma262 pull request

You are helping a **spec editor** prepare to review a pull request against `tc39/ecma262`.
Your job is to produce a thorough, honest set of review notes in a file: **never** to post a
review, comment, or approval on GitHub. The editor reads your notes and decides what to post.

## Core rules

- **Ask focus first (Step 0) before any tool call.** The very first action is asking the user
  what to focus on: not fetching the PR, not reading files.
- **Never post.** No `gh pr review`, no `gh pr comment`, no `gh api ... POST`. Read-only `gh`
  only. The single deliverable is `.claude/.reviews/pr-<number>-<date>.md`.
- **Don't repeat existing feedback.** Other editors often have pending reviews/comments. Read
  them first and skip anything already raised (but note if you'd extend or disagree with a point).
- **Cite the spec.** Every finding points at a concrete location: a `spec.html` line, a clause id,
  an abstract operation name, or a diff hunk. Vague findings are not useful to an editor.
- **Separate normative from editorial.** A normative change alters observable behavior; flag if
  the commit tag (Normative/Editorial/Markup/Meta) looks wrong, and be extra careful with anything
  that changes behavior.
- **Calibrate.** The user is an expert. Prefer a short list of real issues over a long list of
  nits. Mark confidence. Don't invent problems to look thorough.

## Step 0: REQUIRED FIRST ACTION: ask what to focus on

Your first action MUST be to ask the user (via AskUserQuestion) what they want to focus on:
before running any command, including fetching the PR. Do not skip this even when operating
autonomously; if the user gives no answer, do a full review. Different PRs might have different
intrinsic complexities, and the spec editor you are working with is in the best position to know
what is most risky.

## Step 1: Identify and fetch the PR

Determine the PR number (from the user, or `gh pr view --json number` for the current branch).
Then gather, read-only:

```bash
PR=<number>
gh pr checkout $PR    # check out the PR branch locally so grep/build see the PR's spec.html
gh pr view $PR --json number,title,body,author,state,labels,commits,files,baseRefName,headRefName
gh pr diff $PR
```

Check out the PR branch with `gh pr checkout` so that the consistency greps and the optional
build in Step 5 run against the PR's version of `spec.html`, not `main`. (Warn the user first if
the working tree has uncommitted changes.)

Read the title/body for the author's stated intent, and check each **commit message tag**
(`Normative:` / `Editorial:` / `Markup:` / `Meta:`) against what the diff actually does.

## Step 2: Workspace

- Create a repo-local `.tmp/review-ecma262-pr/` folder where you can store information.
- When creating `.tmp/`, add `.tmp/.gitignore` containing `*`.
- If you need to download other external artifacts or create temporary files, put them in a `.tmp/review-ecma262-pr/pr-<pr number>/` too. If there are files needed for multiple PRs ask the user what to do with them.

## Step 3: Read existing reviews (to avoid duplicating)

```bash
gh pr view $PR --comments                                  # top-level review + issue comments
gh api repos/tc39/ecma262/pulls/$PR/reviews                # review summaries + states
gh api repos/tc39/ecma262/pulls/$PR/comments               # inline (diff-anchored) comments
```

Build a short list of what other editors have already raised. Any point already covered is
**out of scope** for your notes (unless you have a materially different take: say so explicitly).
Also check whether the PR resolves a linked issue and whether that issue raises constraints.

## Step 4: Review for editorial issues

Fetch the [Editorial Conventions wiki](https://github.com/tc39/ecma262/wiki/Editorial-Conventions) into `.tmp/review-ecma262-pr/editorial-conventions.md`, if it's not already there or if it's stale.

Check the PR diff against those conventions: phrasing and aliases, list/record notation, comparison forms (`is` vs `=` vs `SameValue`), if/else structure, alias naming and mandatory abbreviations, "Perform" for `~unused~`, Completion annotations (`?`/`!`/`Completion()`), `%Foo%` intrinsics, typographic quotes, signed `𝔽` zeros, Oxford commas, aliases, one-action-per-step.

## Step 5: Review for correctness / possible bugs

- **Algorithm logic**: off-by-one, wrong early-exit order, missing `Return`, un-annotated
  Completion-producing calls (dropped `?`/`!`), assertions that can actually fail, aliases used
  before introduction or written after closure capture, wrong branch when refactoring if/else.
- **Signatures & types**: an operation's params/return type match every call site; enum values are
  from the declared set; `𝔽`/ℝ/BigInt conversions are correct and not mixed.
- **Grammar**: production changes are consistent with early-error and evaluation clauses that
  reference the same nonterminals; "matches" / "is matched by" direction is correct.
- **References**: `<emu-xref aoid=...>`, ids, and `oldids` resolve; renamed clauses keep `oldids`.

## Step 6: Check consistency (within the PR and across the spec)

This is where the real bugs hide. For each operation, term, or production the PR touches:

```bash
grep -n "OperationName" spec.html          # every definition and call site
grep -n 'aoid="OperationName"' spec.html   # the declaration
grep -n "id=\"sec-...\"" spec.html         # related clauses
```

- Is the new phrasing consistent with how the **same construct is written elsewhere**? If the PR
  changes a pattern in one place, are there sibling places that should change too (or that now
  read inconsistently)?
- Is the PR **internally consistent**: same term/notation used the same way across its own hunks?
- Do parallel operations (e.g. sync/async, get/set, Array/TypedArray variants) need the mirror change?
- Optionally, build to catch broken xrefs/ids/aoids and dead links:
  `npm run build` (writes `out/`; surfaces ecmarkup errors). Mention if you ran it.

Look at 1–2 **similar merged PRs** for precedent when a judgment call comes up: search the repo
history or `gh pr list --state merged --search "<keyword>"` and how reviewers handled them.

## Step 7: Write the review file

- Work in the repo-local `.tmp/review-ecma262-pr/`
- When creating `.tmp/`, add `.tmp/.gitignore` containing `*`.
- Draft replies go in a `.tmp/review-ecma262-pr/pr-<pr number>-<date>.md` file. Always append, never overwrite.
- If you need to download other external artifacts or create temporary files, put them in a `.tmp/review-ecma262-pr/pr-<pr number>/` too. If there are files needed for multiple PRs ask the user what to do with them.

Write to `.tmp/review-ecma262-pr/pr-<number>-<YYYY-MM-DD>.md` (use today's date). Do **not** post it.
Structure:

```markdown
# Review notes: PR #<number>: <title>

- **Author / tag**: <author> · <Normative|Editorial|Markup|Meta>: <is the tag right?>
- **Summary**: <1–2 sentences on what the PR does>
- **Overall**: <your read: looks good / needs work / has a normative concern / etc.>
- **Existing editor feedback (not repeated below)**: <who raised what, briefly, or "none">

## Possible bugs / correctness
<Each: location (spec.html:line or clause), what's wrong, why, confidence. Empty if none.>

## Editorial / conventions
<Convention deviations with the specific rule. Empty if none.>

## Consistency
<Mismatches within the PR or with the rest of the spec, with the other locations cited.>

## Questions / judgment calls
<Things for the editor to decide: not clearly right or wrong.>

## Nitpicks (optional)
<Low-priority; clearly separated so they're easy to skip.>
```

Each finding: **location → observation → why it matters → confidence (high/med/low)**. If a
section is empty, say "None found" rather than padding.

## Finish

Tell the user the file path and give a 2–3 line summary of the most important findings so they
can decide where to start. Remind them nothing was posted.
