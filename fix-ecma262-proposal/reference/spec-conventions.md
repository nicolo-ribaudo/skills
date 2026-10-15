# Spec conventions (ecmarkup)

## Layering

- `<ins>`/`<del>` mark changes relative to the **base** of the spec. That is ecma262 unless the
  editor's note says the spec is on top of another proposal. In that case the `<ins>`/`<del>`
  are relative to that proposal's rendered text, which may itself differ from ecma262.
- Lines whose only change is indentation (for example, wrapped in a new `If`) stay unmarked.
- Mark only the changed part of a step:
  - `1. Let _x_ be <del>_a_</del><ins>_b_</ins>.`
  - When appending arguments, put the comma inside the `<ins>`:
    `Foo(_a_<ins>, _b_, ~mode~</ins>)`. Otherwise the base view reads `Foo(_a_, )`.
- Clauses copied from the base keep their content unmarked except for the changes. A whole new
  AO or SDO has its header in `<ins>`, and its steps are left unmarked.
- An inserted NOTE in a base clause is `<emu-note><p><ins>…</ins></p></emu-note>`.
- New clauses for base SDOs/AOs reuse the base's `id`, and use `number="…"` attributes so that
  section numbers match ecma262. Check the rendered numbers in `build/index.html`.
- Upstream gaps (a base-proposal bug) are not fixed silently in your `<ins>`. Where your text
  needs the missing piece, add it, and say so in a draft upstream issue.

## ecmarkup quirks

- AO names in steps auto-link. Use `emu-xref` only for steps and clauses; it renders the number,
  or the signature when it has `title`.
- In `<emu-grammar>`, a `<del>`/`<ins>` pair **on one line** fails the build; put them on
  separate lines.
- Strict lint: an `Else` must be multi-line when its `If` is multi-line, so there is no
  `Else if …, return` after a multi-line `If`.
- Strict lint catches syntax, unknown nonterminals and some step style. Run it after every
  edit. "Warning: inlining assets" is normal.

## What the strict build does NOT catch: check by hand

- **Undefined aliases and fields:** a renamed `_x_` still used later, or `[[Field]]` that the
  record type doesn't have.
- **Type mismatches:** the argument type against the parameter type (e.g. a `~all~ or List` value
  passed to a `List of Strings` parameter), and return types against callers.
- **Subtype-only operations on supertype values:** e.g. Cyclic-only methods called on any Module
  Record. A JSON or other non-Cyclic module will reach them. Add the guard.
- **Missing SDO rules for new or renamed productions:** ecma262 lists productions explicitly in
  each SDO, and there is no catch-all; the chain rule only covers single-nonterminal right-hand
  sides. When adding or renaming a production, grep ecma262's `spec.html` for every SDO that
  lists the old or sibling production (BoundNames, LexicallyScopedDeclarations,
  IsConstantDeclaration, Evaluation, ModuleRequests, ExportedBindings, ReferencedBindings, …).
- **Edge-traversal consistency:** when two AOs must agree on what they walk (a readiness check
  vs the walk that actually evaluates), compare them side by side. Many bugs come from one
  following edges the other ignores, or from a shared accumulator that is never reset.
- **Termination:** every recursion needs a visited set or a monotone accumulator. Check that
  "seen" lists are not shared between walks with different semantics.
- **Stale prose:** field and AO descriptions after their behaviour changed; NOTEs that refer
  to removed steps.
- **Header nits:** trailing commas after the last parameter, "a List", and articles.

## Style

- Keep NOTEs out of algorithm steps unless the user asks. Prefer an `emu-note` after the
  algorithm, and keep it short and accurate ("checks", not "gathers", when it only checks).
- Names say what the AO returns or decides. If a rename would mislead, propose a better name.
- Editorial and normative changes go in separate commits/PRs.
