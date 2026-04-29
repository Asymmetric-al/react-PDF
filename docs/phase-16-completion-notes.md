# Phase 16 Completion Notes: Conditional Section Engine And Editor Extension

## Active Phase

Phase 16: Build Conditional Section Engine and Editor Extension.

## Summary

Phase 16 adds structured, deterministic conditional-section support across the
shared schema package, PDF renderer, and PDF editor extension package. The
implementation evaluates safe rule objects only, preserves editor JSON as the
source of truth, and does not add arbitrary JavaScript, DocRaptor wiring,
browser preview fidelity claims, or React Email export changes.

## Implementation Notes

- Extended `ConditionalRuleSchema` with Phase 16 operators:
  `greater_than_or_equal`, `less_than_or_equal`, `not_contains`, `in`, and
  `not_in`.
- Kept `exists`, `not_exists`, `is_empty`, and `is_not_empty` value-free.
- Required comparison values for comparison operators and array values for
  `in` and `not_in`.
- Added `evaluateConditionalRule` and `evaluateConditionalRules` in
  `@asym/pdf-template-schema` with structured diagnostics.
- Added deterministic condition evaluation using nested field-path lookup,
  stable JSON equality, numeric/date ordering, string/array membership, and no
  arbitrary JavaScript execution.
- Added `evaluatePdfDocumentCondition` in `@asym/pdf-renderer` as the renderer
  adapter for schema diagnostics.
- Added optional `dataContext` support to `composePdfDocumentHtml` for
  conditional evaluation only.
- Added built-in `conditionalSection` rendering. True sections render nested
  content in a deterministic wrapper; false sections are omitted and their
  nested variables/assets are not collected.
- Missing renderer context or invalid renderer rules render nested content with
  structured warnings rather than silently hiding author content.
- Missing fields in a supplied renderer context honor the evaluator's
  `matched: false` result so editor preview and PDF rendering stay aligned.
- Added `ConditionalSection` and `createConditionalSectionExtension` in
  `@asym/pdf-editor/extensions`.
- Added `editor.commands.insertConditionalSection({ rule, content })`.
- Conditional sections serialize a structured `rule` attr and preserve nested
  content through JSON and HTML round trips.
- Editor DOM output uses deterministic `data-asym-conditional-section`,
  `data-condition-rule`, `data-condition-field-path`,
  `data-condition-operator`, and `data-condition-visible` attributes.
- Updated package maturity metadata to `phase-16-conditional-sections`.

## Out Of Scope

- No DocRaptor behavior or client wiring.
- No slash command UI or condition-builder UI.
- No variable text replacement or raw HTML template logic.
- No browser-preview production fidelity claim.
- No changes to `@react-email/editor` exports.

## Tests Added Or Updated

- `packages/pdf-template-schema/test/conditional-rules.spec.ts`
  - Schema validation for value-free and value-required operators.
  - Every supported operator.
  - Missing field warnings.
  - Invalid comparison type errors.
  - Deterministic `evaluateConditionalRules` AND semantics.
  - No arbitrary JavaScript execution.
- `packages/pdf-renderer/test/conditional-section.spec.ts`
  - True condition renders nested content.
  - False condition omits nested content.
  - Variables and assets inside false sections are not collected.
  - Missing fields in a supplied context omit nested content with diagnostics.
  - Missing context diagnostics are structured.
  - Deterministic output.
- `packages/pdf-editor/test/conditional-section-extension.spec.tsx`
  - Insert conditional section through command/API.
  - JSON serialization and deserialization preserve nested content.
  - Editor DOM renders the condition wrapper.
  - Preview true/false states.
  - Missing field diagnostics.
  - `@asym/pdf-editor/extensions` export coverage.
- Public-entry tests for schema, renderer, and editor maturity/export coverage.
- Print-shell CSS snapshot updated for the new conditional-section base class.

## Validation

```sh
git status --short --branch
```

Result: on `codex/phase-16-conditional-sections` with Phase 16 changes
pending.

```sh
pnpm --filter @asym/pdf-template-schema test -- conditional-rules.spec.ts
```

Initial TDD red result: failed as expected before implementation because Phase
16 condition evaluator exports and operators were not present. Final result:
passed, `1 passed (1)` test file and `5 passed (5)` tests.

```sh
pnpm --filter @asym/pdf-renderer test -- conditional-section.spec.ts
```

Initial TDD red result: failed as expected before implementation because
conditional sections rendered as unknown nodes and the renderer adapter did not
exist. Final result: passed, `1 passed (1)` test file and `4 passed (4)` tests.

```sh
pnpm --filter @asym/pdf-editor test -- conditional-section-extension.spec.tsx
```

Initial TDD red result: failed as expected before implementation because
`conditionalSection` and its command/export surface did not exist. Final result:
passed, `1 passed (1)` test file and `5 passed (5)` tests.

```sh
pnpm --filter @asym/pdf-template-schema test
```

Result: passed. `6 passed (6)` test files, `36 passed (36)` tests.

```sh
pnpm --filter @asym/pdf-template-schema typecheck
```

Result: passed. `tsc --noEmit` exited 0.

```sh
pnpm --filter @asym/pdf-template-schema build
```

Result: passed. `tsdown` built CJS and ESM outputs successfully.

```sh
pnpm --filter @asym/pdf-renderer test
```

Result: passed. `10 passed (10)` test files, `60 passed (60)` tests.

```sh
pnpm --filter @asym/pdf-renderer typecheck
```

Result: passed. `tsc --noEmit` exited 0.

```sh
pnpm --filter @asym/pdf-renderer build
```

Result: passed. `tsdown` built CJS and ESM outputs successfully.

```sh
pnpm --filter @asym/pdf-editor test
```

Result: passed. `5 passed (5)` test files, `21 passed (21)` tests.

```sh
pnpm --filter @asym/pdf-editor typecheck
```

Result: passed. `tsc --noEmit` exited 0.

```sh
pnpm --filter @asym/pdf-editor build
```

Result: passed. `tsdown` built CJS and ESM outputs successfully.

```sh
pnpm --filter @react-email/editor test
```

Result: passed. `50 passed (50)` test files, `460 passed | 1 skipped (461)`
tests.

Known existing warnings during editor tests:

- Vite cannot analyze the dynamic Prism import in
  `packages/editor/src/extensions/prism-plugin.ts`.
- Existing React key warnings in serializer tests.

```sh
pnpm asym:editor-export-smoke
```

Result: passed. `status=ok`, and all existing `@react-email/editor` JS, CSS,
and theme export paths resolved.

```sh
pnpm test
```

Result: passed. Turbo reported `16 successful, 16 total`.

Known existing warnings during root tests:

- Vitest warnings in upstream `@react-email/render` tests about nested
  `vi.mock("react-dom/server")`.
- Existing Vite dynamic import warning in `apps/web`.
- Existing React key warnings in editor serializer tests.

```sh
pnpm build
```

Result: failed for the known Windows upstream demo/playground symlink caveat
after targeted package builds passed. The failure was:

```text
demo:build: Error: EPERM: operation not permitted, symlink
'C:\Users\Conrad\Documents\GitHub\react-PDF\node_modules\.pnpm\@babel+core@7.29.0\node_modules\@babel\core'
-> 'C:\Users\Conrad\Documents\GitHub\react-PDF\apps\demo\.react-email\node_modules\@babel\core'
playground:build: Error: EPERM: operation not permitted, symlink
'C:\Users\Conrad\Documents\GitHub\react-PDF\node_modules\.pnpm\@babel+core@7.29.0\node_modules\@babel\core'
-> 'C:\Users\Conrad\Documents\GitHub\react-PDF\playground\.react-email\node_modules\@babel\core'
```

```sh
pnpm lint
```

Result: passed with the known existing warning in
`apps/web/src/app/editor/editor-overrides.css` for
`lint/complexity/noImportantStyles` on `!important`.

```sh
pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder
```

Result: passed. `Change 'build-pdf-document-builder' is valid`.

```sh
pnpm dlx @fission-ai/openspec@latest validate --all
```

Result: passed. `Totals: 1 passed, 0 failed (1 items)`.

```sh
git diff --check
```

Result: passed with Windows line-ending warnings only for touched text files.

## Known Gaps And Follow-Up

- Phase 17 owns repeaters and array section rendering.
- Phase 18 owns data tables beyond the Phase 09 serializer foundation.
- A future editor shell can add condition-builder UI and slash-command wiring.
- The root `pnpm build` Windows symlink failure remains the same documented
  upstream demo/playground environment caveat; targeted Phase 16 package builds
  pass.

## Phase 17 Handoff

Phase 17 can build repeaters on top of the Phase 16 condition evaluator pattern:
keep structured JSON as the source of truth, keep renderer decisions
diagnostic-driven, and avoid arbitrary JavaScript.

## Revert Guidance

- To remove schema condition evaluation, revert
  `packages/pdf-template-schema/src/conditions.ts`,
  `packages/pdf-template-schema/src/bindings.ts`, the schema public-entry test,
  and the schema README changes.
- To remove renderer conditional support, revert
  `packages/pdf-renderer/src/conditions.ts`,
  `packages/pdf-renderer/src/compose-pdf-document-html.ts`, renderer tests, the
  public-entry test, the print-shell snapshot update, and renderer README
  changes.
- To remove editor conditional sections, revert
  `packages/pdf-editor/src/extensions/conditional-section`,
  `packages/pdf-editor/src/extensions/index.ts`, editor tests, the public-entry
  test, and editor README changes.
- To revert planning/docs only, revert this file plus the Phase 16 entries in
  `docs/roadmap.md`, `docs/decision-log.md`, and
  `openspec/changes/build-pdf-document-builder/tasks.md`.
