# Phase 19 Completion Notes

## Active Phase

Phase 19. Build Financial Data Table Editor Extension.

## Summary

Phase 19 formally completed the editor-facing financial data table gate. The
existing Phase 18 custom TipTap atom node remains the implementation path; this
phase audited and hardened command insertion, JSON attrs, HTML round trips,
invalid binding diagnostics, public boundary metadata, and extension export
safety.

No renderer behavior, DocRaptor behavior, financial calculation logic,
aggregation, subtotaling, or print markup was changed.

## Files Changed

- `packages/pdf-editor/src/extensions/data-table/index.ts`
- `packages/pdf-editor/src/index.ts`
- `packages/pdf-editor/test/data-table-extension.spec.tsx`
- `packages/pdf-editor/test/public-entry.spec.tsx`
- `packages/pdf-editor/readme.md`
- `README.md`
- `docs/roadmap.md`
- `docs/decision-log.md`
- `docs/phase-18-completion-notes.md`
- `openspec/changes/build-pdf-document-builder/design.md`
- `openspec/changes/build-pdf-document-builder/tasks.md`
- `docs/phase-19-completion-notes.md`

## What Changed And Why

- Preserved `bindingId` on invalid data table preview results so callers can
  attribute `invalid_table_binding` diagnostics to the external binding
  reference that produced them.
- Updated `@asym/pdf-editor` maturity metadata to
  `phase-19-financial-data-table-editor`.
- Added regression tests for full `TableBinding` insertion, binding-ID-only
  insertion, invalid insertion rejection, JSON attrs, HTML round trips,
  deterministic `data-table-binding` serialization, preview diagnostics,
  extension exports, and no renderer/DocRaptor/calculation/aggregation imports.
- Marked Phase 19 complete and Phase 20 next in the OpenSpec tracker and
  mirrored roadmap docs.

## Repo Pattern Alignment

The editor extension keeps the existing variable, conditional, and repeater
pattern: a protected structured TipTap node stores schema-backed attrs, exposes
an insertion command, renders deterministic `data-*` attributes, and returns
diagnostics instead of throwing. The editor still depends on
`@asym/pdf-template-schema` for table validation and row diagnostics, not on
renderer or server-only packages.

## TDD Notes

Tests were added before production changes. The focused red run failed on the
expected production gaps:

- `pdfEditorBoundary.maturity` still reported `phase-18-financial-data-table`.
- Invalid data table preview results did not preserve the requested
  `bindingId`.

One over-specific deterministic-serialization assertion was corrected before
implementation so the red state represented production behavior, not a bad
test expectation. The minimal implementation then made the focused specs pass.

## Validation

- `pnpm --filter @asym/pdf-editor test -- data-table-extension.spec.tsx public-entry.spec.tsx` failed in the red phase for the expected maturity and invalid-preview attribution gaps, then passed after implementation.
- `pnpm --filter @asym/pdf-editor test -- data-table-extension.spec.tsx public-entry.spec.tsx variable-chip-extension.spec.tsx conditional-section-extension.spec.tsx repeater-extension.spec.tsx` passed.
- `pnpm --filter @asym/pdf-editor test` passed.
- `pnpm --filter @asym/pdf-editor typecheck` passed.
- `pnpm --filter @asym/pdf-editor build` passed.
- `pnpm --filter @asym/pdf-template-schema test` passed.
- `pnpm --filter @asym/pdf-template-schema typecheck` passed.
- `pnpm --filter @asym/pdf-template-schema build` passed.
- `pnpm --filter @asym/pdf-renderer test` passed.
- `pnpm --filter @asym/pdf-renderer typecheck` passed.
- `pnpm --filter @asym/pdf-renderer build` passed.
- `pnpm --filter @react-email/editor test` passed with the existing Vite dynamic import warning in `packages/editor/src/extensions/prism-plugin.ts`.
- `pnpm asym:editor-export-smoke` passed.
- `pnpm test` passed. Existing warnings included Vitest mock-hoisting warnings, Vite dynamic import warnings, and tsdown plugin timing warnings.
- `pnpm lint` passed with the existing `apps/web/src/app/editor/editor-overrides.css` `!important` warning.
- `pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder` passed.
- `pnpm dlx @fission-ai/openspec@latest validate --all` passed.
- `git diff --check` passed with Windows LF-to-CRLF working-copy warnings only.

## Documentation And OpenSpec Updates

- `openspec/changes/build-pdf-document-builder/tasks.md` now marks Phase 19
  complete and Phase 20 next.
- `docs/roadmap.md` now uses Phase 20 as the entry point.
- `packages/pdf-editor/readme.md` documents the Phase 19-hardened data table
  extension surface and its non-goals.
- `docs/decision-log.md` records the Phase 19 editor-only hardening decision.
- `docs/phase-18-completion-notes.md` now has a Phase 19 completion addendum.

## Known Gaps

- Phase 20 has now audited and hardened data table renderer and print markup
  behavior. The handoff is recorded in `docs/phase-20-completion-notes.md`.
- Calculations, subtotals, grouping computation, summary blocks, and table
  total rendering remain deferred to Phases 22 and 23.
- No table inspector UI, slash command wiring, DocRaptor orchestration,
  tenant storage, batch behavior, or platform integration was added.

## Revert Guidance

Rollback by reverting the editor source and test changes in
`packages/pdf-editor/src/extensions/data-table/index.ts`,
`packages/pdf-editor/src/index.ts`,
`packages/pdf-editor/test/data-table-extension.spec.tsx`, and
`packages/pdf-editor/test/public-entry.spec.tsx`, then reverting the README,
roadmap, decision log, OpenSpec task, and completion-note updates listed
above. After rollback, rerun the `@asym/pdf-editor` focused tests, package
build, export smoke, OpenSpec validation, lint, and `git diff --check`.

## Phase 21 Entry Point

Phase 20 started from the Phase 19 editor node shape and the existing Phase 18
renderer artifacts. It completed semantic table markup, repeated headers, empty
states, row limit diagnostics, missing/non-array source diagnostics, formatter
display coverage, deterministic renderer snapshots, and continued deferral of
financial calculations.

Phase 21 has now connected the table schema, editor node, renderer, browser
preview, and mocked DocRaptor preview into deterministic end-to-end fixtures
without adding calculation behavior or real network calls. Its completion
handoff is recorded in `docs/phase-21-completion-notes.md`.
