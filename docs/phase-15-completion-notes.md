# Phase 15 Completion Notes: Variable Chip Editor Extension

## Active Phase

Phase 15: Build the Variable Chip Editor Extension.

## Summary

Phase 15 adds protected structured inline variable chips to
`@asym/pdf-editor`. The chip extension is backed by the Phase 13 variable
registry and Phase 14 resolver, preserves `@react-email/editor` exports, and
does not add DocRaptor wiring, slash-command UI wiring, or plain `{{merge_tag}}`
behavior.

## Implementation Notes

- Added `@asym/pdf-editor/extensions` as the Phase 15 extension export surface.
- Added `VariableChip` and `createVariableChipExtension` as a TipTap inline atom
  node named `variable`.
- Added `editor.commands.insertVariableChip({ key, formatter, fallback, label })`
  through TipTap command augmentation.
- Variable chips serialize to JSON attrs using `key`, optional `formatter`,
  optional `fallback`, and optional `label`.
- HTML parse/render uses deterministic `data-asym-variable-chip`,
  `data-variable-key`, `data-variable-formatter`, `data-variable-fallback`, and
  `data-variable-label` attributes.
- Rendered chips use `contenteditable="false"` so users cannot type into the
  variable key.
- Added preview helpers backed by `coreVariableRegistry`,
  `createVariableResolver`, sample data, fallback overrides, and structured
  diagnostics.
- Extended Phase 14 resolver request support so optional chip fallback overrides
  flow through resolver diagnostics while required missing variables remain
  errors.
- Extended `@asym/pdf-renderer` variable usage propagation so serializer
  fallback attrs can be resolved without mutating HTML.
- Updated `pdfEditorBoundary.maturity` to `phase-15-variable-chip`.

## Out Of Scope

- No `@react-email/editor` export changes.
- No editor shell or slash-command UI wiring.
- No DocRaptor behavior.
- No arbitrary JavaScript in template logic.
- No raw text merge-tag parsing.
- No variable substitution into rendered HTML.

## Tests Added Or Updated

- `packages/pdf-editor/test/variable-chip-extension.spec.tsx`
  - Insert variable through `editor.commands.insertVariableChip`.
  - JSON serialization and deserialization.
  - Visible editor DOM rendering.
  - `contenteditable=false` atom behavior.
  - HTML parse/render round trip.
  - Structured fallback round trip.
  - Sample-value preview rendering.
  - Optional fallback display.
  - Unknown key diagnostics and broken-key detection.
  - Configured registry and preview context.
- `packages/pdf-template-schema/test/variable-resolution.spec.ts`
  - Resolver fallback override support.
  - Array path traversal guard for data contexts.
- `packages/pdf-renderer/test/variable-resolution.spec.ts`
  - Renderer variable fallback propagation without mutating HTML.
- `packages/pdf-editor/test/public-entry.spec.tsx`
  - Phase 15 maturity and `./extensions` export coverage.

## Validation

```sh
git status --short --branch
```

Result: on `codex/phase-15-variable-chip-editor-extension` with Phase 15
changes pending.

```sh
pnpm --filter @asym/pdf-editor test -- variable-chip-extension.spec.tsx
```

Initial TDD red result: failed as expected before implementation because
`@asym/pdf-editor/extensions` did not exist. A later structured fallback
round-trip regression also failed before the parse fix. Final result: passed,
`1 passed (1)` test file and `7 passed (7)` tests.

```sh
pnpm --filter @asym/pdf-template-schema test -- variable-resolution.spec.ts
```

Initial TDD red result: failed as expected because array paths traversed arrays
as records and request fallback overrides were ignored. Final result: passed,
`1 passed (1)` test file and `9 passed (9)` tests.

```sh
pnpm --filter @asym/pdf-renderer test -- variable-resolution.spec.ts
```

Result: passed. `1 passed (1)` test file and `3 passed (3)` tests.

```sh
pnpm --filter @asym/pdf-editor test
```

Result: passed. `4 passed (4)` test files, `16 passed (16)` tests.

```sh
pnpm --filter @asym/pdf-editor typecheck
```

Result: passed. `tsc --noEmit` exited 0.

```sh
pnpm --filter @asym/pdf-editor build
```

Result: passed. `tsdown` built `src/extensions/index.ts`, `src/index.ts`, and
`src/react-email-compat.ts` successfully.

```sh
pnpm --filter @asym/pdf-template-schema test
```

Result: passed. `5 passed (5)` test files, `31 passed (31)` tests.

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

Result: passed. `9 passed (9)` test files, `53 passed (53)` tests.

```sh
pnpm --filter @asym/pdf-renderer typecheck
```

Result: passed. `tsc --noEmit` exited 0.

```sh
pnpm --filter @asym/pdf-renderer build
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

Result: passed. `status=ok`, and all existing `@react-email/editor` JS,
CSS, and theme export paths resolved.

```sh
pnpm test
```

Result: passed. Turbo reported `16 successful, 16 total`.

Known existing warnings during root tests:

- Vitest warnings in upstream `@react-email/render` tests about nested
  `vi.mock("react-dom/server")`.
- Existing Vite dynamic import warning in `apps/web`.

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

Result: passed with line-ending warnings only for touched Markdown/OpenSpec
files.

## Known Gaps

- Phase 15 does not wire variable chips into the editor shell UI or slash
  command menu.
- Phase 15 does not replace variable nodes in rendered HTML.
- Phase 15 does not implement conditionals, repeaters, preflight, or asset
  validation.
- Root `pnpm build` remains blocked on the pre-existing Windows symlink issue
  in upstream demo/playground builds.

## Phase 16 Handoff

Phase 16 can build conditional section support against:

- `packages/pdf-editor/src/extensions/variable/index.ts`
- `packages/pdf-template-schema/src/variable-resolution.ts`
- `packages/pdf-template-schema/src/variables.ts`
- `packages/pdf-renderer/src/compose-pdf-document-html.ts`
- `packages/pdf-renderer/src/variables.ts`

The variable chip should remain a protected structured node. Future phases
should continue using registry keys and resolver diagnostics instead of raw
string replacement or arbitrary JavaScript.

## Revert Guidance

- To remove the Phase 15 editor extension, delete
  `packages/pdf-editor/src/extensions/`, remove the `./extensions` package
  export, remove the TipTap dependency additions from
  `packages/pdf-editor/package.json`, and restore the prior tsconfig, tsdown,
  and Vitest aliases.
- To remove fallback override support, revert the additions to
  `packages/pdf-template-schema/src/variable-resolution.ts` and
  `packages/pdf-renderer/src/variables.ts`, then remove the related tests.
- To remove serializer fallback propagation, revert the variable fallback
  changes in `packages/pdf-renderer/src/compose-pdf-document-html.ts`.
- To remove tests, delete
  `packages/pdf-editor/test/variable-chip-extension.spec.tsx` and restore the
  public-entry, schema resolver, and renderer resolver tests to their previous
  expectations.
- To revert documentation and tracker updates, restore
  `packages/pdf-editor/readme.md`, `docs/roadmap.md`, `docs/decision-log.md`,
  this note, and `openspec/changes/build-pdf-document-builder/tasks.md` to
  their previous Phase 15 entry state.
