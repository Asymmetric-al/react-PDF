# Phase 18 Completion Notes

## Active Phase

Phase 18: Build Financial Data Table Block.

## Summary

Phase 18 added the first report-grade financial data table contract across the schema, editor, and renderer packages. The table block is structured JSON backed by `TableBindingSchema`; it is not raw HTML and it does not run arbitrary JavaScript.

This phase intentionally stops before totals, subtotals, grouping calculations, aggregation, and DocRaptor orchestration. After the roadmap split to 47 phases, Phase 19 owns the formal editor-extension audit/hardening gate, Phase 20 owns the formal renderer/print-markup audit/hardening gate, and Phase 22 owns calculated totals/subtotals/grouping behavior.

## Implementation Notes

- `@asym/pdf-template-schema` now exports `TableBindingInput`, column/grouping/total binding types, and `resolveTableRows`.
- `resolveTableRows` validates bindings with Zod, resolves row data from a context path, formats display cells through the existing Phase 14 formatter layer, applies the max-row guard, and returns structured diagnostics instead of throwing on invalid bindings.
- `@asym/pdf-editor/extensions` now exports the protected TipTap `DataTableBlock`, `createDataTableExtension`, `insertDataTable`, preview helpers, and table validation helpers.
- `@asym/pdf-renderer` now accepts `tableBindings` in `composePdfDocumentHtml` and renders `dataTable` nodes as deterministic table HTML with headers, body rows, empty-state rows, repeated-header-friendly classes, and total placeholder rows.
- Total placeholders are rendered as metadata/placeholders only. No financial calculations are performed in Phase 18.

## Tests Added

- `packages/pdf-template-schema/test/table-resolution.spec.ts`
- `packages/pdf-editor/test/data-table-extension.spec.tsx`
- `packages/pdf-renderer/test/data-table.spec.ts`

Existing public-entry, print-shell snapshot, variable, conditional, repeater, and React Email editor compatibility tests were also rerun.

## Validation

Focused red/green checks were run first and failed before implementation because the table APIs, editor node, and renderer node did not exist yet. After implementation and formatting, these checks passed:

```text
pnpm --filter @asym/pdf-template-schema test
PASS: 8 files, 53 tests

pnpm --filter @asym/pdf-editor test
PASS: 7 files, 31 tests

pnpm --filter @asym/pdf-renderer test
PASS: 12 files, 75 tests

pnpm --filter @asym/pdf-template-schema typecheck
PASS

pnpm --filter @asym/pdf-editor typecheck
PASS

pnpm --filter @asym/pdf-renderer typecheck
PASS

pnpm --filter @asym/pdf-template-schema build
PASS

pnpm --filter @asym/pdf-editor build
PASS

pnpm --filter @asym/pdf-renderer build
PASS

pnpm --filter @react-email/editor test
PASS: 50 files, 460 passed, 1 skipped

pnpm asym:editor-export-smoke
PASS

pnpm test
PASS: 16 successful turbo tasks

pnpm lint
PASS with the existing apps/web/src/app/editor/editor-overrides.css !important warning

pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder
PASS: Change 'build-pdf-document-builder' is valid

pnpm dlx @fission-ai/openspec@latest validate --all
PASS: 1 passed, 0 failed
```

`pnpm build` was also run. The Phase 18 package builds passed, but the broad workspace build failed on the known Windows symlink baseline issue in `playground` and `apps/demo`:

```text
Error: EPERM: operation not permitted, symlink ...\node_modules\.pnpm\@babel+core@7.29.0\node_modules\@babel\core -> ...\playground\.react-email\node_modules\@babel\core
Error: EPERM: operation not permitted, symlink ...\node_modules\.pnpm\@babel+core@7.29.0\node_modules\@babel\core -> ...\apps\demo\.react-email\node_modules\@babel\core
```

This matches the previously documented Windows `.react-email` symlink caveat and was not introduced by Phase 18.

## OpenSpec And Docs

- `openspec/changes/build-pdf-document-builder/tasks.md` marks Phase 18 complete and Phase 19 next.
- `openspec/changes/build-pdf-document-builder/design.md` current-state notes now include Phase 18.
- `docs/roadmap.md` marks Phase 18 complete and Phase 19 as the entry point.
- `docs/decision-log.md` records the Phase 18 decision to keep table calculations out of the table block foundation.
- Package readmes for schema, editor, and renderer document the Phase 18 table APIs.

## Roadmap Split Addendum

The 47-phase tracker keeps the Phase 18 implementation facts above intact, but
splits the remaining work more finely. Phase 18 landed broad data-table
foundation work ahead of the now-separated Phase 19 and Phase 20 gates.

At the time of the split, Phase 19 was defined to audit, harden, document, and
formally complete the existing TipTap-facing data table extension rather than
duplicate it.

Phase 20 has now audited, hardened, documented, and formally completed the
existing renderer and print markup behavior rather than duplicating it.

Totals, subtotals, grouping calculations, and summary rendering remain future
work under Phases 22 and 23.

## Original Phase 19 Handoff

Before Phase 19 began, the handoff identified these starting files:

- `packages/pdf-template-schema/src/bindings.ts`
- `packages/pdf-template-schema/src/tables.ts`
- `packages/pdf-renderer/src/compose-pdf-document-html.ts`
- `packages/pdf-renderer/src/data-table.ts`
- `packages/pdf-editor/src/extensions/data-table/index.ts`

Phase 19 was required to preserve:

- Structured `TableBindingSchema` validation.
- Deterministic row order and display values.
- Diagnostics-as-return-values behavior.
- No arbitrary JavaScript in table logic.
- No DocRaptor secret exposure.
- No renderer-only or server-only imports in browser-facing editor exports.

Phase 19 was expected to extend tests in:

- `packages/pdf-template-schema/test/table-resolution.spec.ts`
- `packages/pdf-renderer/test/data-table.spec.ts`
- `packages/pdf-editor/test/data-table-extension.spec.tsx`

Phase 19 was expected to focus on editor command insertion, JSON attrs, deterministic
HTML round trip, invalid/missing binding diagnostics, extension exports, and
regression safety for variable, conditional, and repeater extensions.

Phase 20 should consume the same node shape and binding attributes to verify
renderer markup. Phase 22 should add totals/subtotals/grouping calculation on
top of the declarative placeholders created in Phase 18.

## Phase 19 Completion Addendum

Phase 19 has now audited, hardened, documented, and formally completed the
TipTap-facing data table editor extension that Phase 18 introduced ahead of
the split roadmap. The Phase 19 handoff is recorded in
`docs/phase-19-completion-notes.md`.

Phase 20 has now completed the renderer-facing gate for semantic table markup,
repeated headers, empty states, row limit warnings, deterministic diagnostics,
and continued deferral of financial calculations. Phase 21 is next for
end-to-end data table preview fixtures.

## Known Gaps

- Totals, subtotals, grouping calculations, and grand totals are intentionally not implemented.
- Browser preview is not treated as production PDF fidelity.
- Data table styling is foundational and deterministic, not final report design polish.
- Root `pnpm build` still has the existing Windows symlink EPERM caveat for `playground` and `apps/demo`.

## Revert Guidance

- Revert schema behavior by restoring `packages/pdf-template-schema/src/bindings.ts`, deleting `packages/pdf-template-schema/src/tables.ts`, and deleting `packages/pdf-template-schema/test/table-resolution.spec.ts`.
- Revert editor behavior by deleting `packages/pdf-editor/src/extensions/data-table`, removing the data-table exports from `packages/pdf-editor/src/extensions/index.ts`, and deleting `packages/pdf-editor/test/data-table-extension.spec.tsx`.
- Revert renderer behavior by deleting `packages/pdf-renderer/src/data-table.ts`, removing data-table handling from `packages/pdf-renderer/src/compose-pdf-document-html.ts`, and deleting `packages/pdf-renderer/test/data-table.spec.ts`.
- Revert docs and tracker updates by restoring the touched Markdown/OpenSpec files and deleting this completion note.
