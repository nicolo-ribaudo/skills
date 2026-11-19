# ECMA-262 Editorial Conventions (local cache)

> Snapshot of <https://github.com/tc39/ecma262/wiki/Editorial-Conventions>.
> The wiki is the source of truth — re-fetch it when in doubt, since it changes.

## General principles

- Maintain consistent phrasing throughout the specification. When a change introduces
  a phrasing, the same construct elsewhere should read the same way.
- Minimize the number of foundational concepts; don't invent a new mechanism when an
  existing one works.
- Consider diverse spec consumers (implementers, tool authors, downstream specs).
- Preserve old IDs with the `oldids` attribute when renaming a clause, so fragment links
  keep working.
- Abstract Operation summaries (the sentence(s) before the steps) are **normative**. Every
  claim must be correct without qualification, though details may be omitted for clarity.

## Phrasing

- **Intrinsics**: use `%Foo%` notation, not "the initial value of Foo".
- **Record field presence**: "_record_ has a[n] [[Field]] field", not "_record_.[[Field]] is present".
- **Identity**: use `a` / `an` / `a new` for values *with* identity (objects); use `the` for
  values *without* identity.
- **Grammar**: productions "match" source text; source text "is matched by" productions. Never reversed.
- **Type qualifiers**: don't over-qualify — "an Array", not "an Array object". Exceptions:
  distinguishing exotic objects, and "Set object", "Error object", "RegExp object", "Proxy object".
- Avoid "the value of _x_" — just "_x_".
- Prefer "a String" over "a String value".
- **Logical options**: `either A or B` (two); `one of A, B, or C` (three+).
- Prefer "the empty String" over `""`.

## Lists

- Empty List, standalone: "a new empty List".
- Empty/literal List inside an argument list or Record initializer: use « ».
- Concatenate: "the list-concatenation of ...".
- Add: "append _x_ to _list_" / "prepend _x_ to _list_".
- Emptiness: "_list_ is empty" / "_list_ is not empty".
- Single element: "the sole element of _list_".
- Length: "the number of elements in _list_".
- Membership: "_list_ contains _x_" / "_list_ does not contain _x_".

## Comparisons

- **Equality**:
  - BigInts / mathematical values: `_x_ = …`, `_x_ ≠ …`.
  - Objects / Symbols / ECMAScript language values in general: `SameValue(_x_, …)`.
  - Everything else: `_x_ is …` / `_x_ is not …`.
- **Multiple options**:
  - Keep pairwise where needed: `_x_ = a or _x_ = b`.
  - With `is`, two options: `either … or …` / `neither … nor …`.
  - With `is`, three+ options: `one of …`.
- **Relative**: `<`, `≤`, `>`, `≥` for numbers/BigInts/mathematical values.
- Prefer a consistent option order, e.g. "either undefined or null".

## Algorithm structure

- **Assertions** must not be required to understand the algorithm — removing them should
  not change a reader's interpretation.
- Prefer "if a or b" over "if a or if b".
- Introduce each alias at most once per algorithm trace.
- **If/else**:
  - All branches have substeps, or all collapse to a single line — don't mix.
  - Single-line if/else only when all branches perform the same action.
  - Two short/similar early-exiting branches: a single step.
  - A cascade of branches: multi-step, no leading "Else,".
  - Two branches of very different complexity: multi-step, no "Else,".
- Abstract Operations returning `~unused~` are invoked at top level with "Perform".
- Prefer spec enums over sentinels like -1; don't reuse an enum value across unrelated contexts.
- Return the constant, not an alias: "If _x_ is null, return null."
- Completion shorthands: "is a throw completion" over inspecting `[[Type]]`; use `throw` rather
  than `return ThrowCompletion(...)`.
- Lead with validation steps that early-exit, then the happy path.
- One action per step.
- Every Completion-Record-producing call is annotated `? Foo()`, `! Foo()`, or `Completion(Foo())`
  (except `NormalCompletion`).
- Aliases captured by an anonymous closure are never written to after capture.

## Alias naming

- Prefer descriptive, multi-word names over terse single words.
- Mandatory abbreviations: argument→arg, asynchronous→async, attribute→attr, boolean→bool,
  character→char, constructor→ctor, declaration→decl, descriptor→desc, environment→env,
  expression→expr, function→func, generator→gen, integer→int, object→obj, parameter→param,
  prototype→proto, reference→ref, regularExpression→regexp, statement→stmt, synchronous→sync,
  timeValue→tv, typedArray→ta.

## Text / typography

- Oxford commas.
- Denote characters literally; HTML entities only when HTML syntax requires them.
- Record spacing: `{ [[key1]]: value1, [[key2]]: value2 }`. List spacing: `« value1, value2 »`.
- Typographic quotes U+201C/U+201D, not straight quotes.
- Signed floating-point zero: `+0𝔽` / `-0𝔽`, never bare `0𝔽`.

## Markup notes (ecmarkup)

- Aliases render from `_name_`; abstract operations link via `<emu-xref aoid="Name">`.
- Algorithm steps live in `<emu-alg>`; grammar in `<emu-grammar>`; clauses in `<emu-clause>`.
- New abstract operations declared with `<emu-clause ... aoid="Name" type="abstract operation">`
  and a `<h1>` signature line. Check the signature (params, return type) matches usage.
- `<emu-note>`, `<emu-example>` are non-normative.
- Broken xrefs, duplicate ids, and unknown aoids are caught by the build (`npm run build`).
