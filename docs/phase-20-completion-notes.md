# Phase 20 Completion Notes

## Active Phase

Phase 20. Build Financial Data Table Renderer and Print Markup.

## Summary

Phase 20 formally completed the renderer-facing financial data table gate. The
existing Phase 18 renderer path remains the implementation path; this phase
audited and hardened semantic table markup, repeated-header CSS, deterministic
HTML snapshots, missing/non-array source diagnostics, formatter diagnostics,
public boundary metadata, and calculation deferral.

No editor behavior, DocRaptor orchestration, financial calculation logic,
aggregation, grouping subtotal computation, batch behavior, or platform
integration was added.

## Files Changed

- `packages/pdf-renderer/src/compose-pdf-document-html.ts`
- `packages/pdf-renderer/src/index.ts`
- `packages/pdf-renderer/test/data-table.spec.ts`
- `packages/pdf-renderer/test/public-entry.spec.ts`
- `packages/pdf-renderer/readme.md`
- `README.md`
- `docs/roadmap.md`
- `docs/decision-log.md`
- `docs/phase-18-completion-notes.md`
- `docs/phase-19-completion-notes.md`
- `docs/phase-roadmap-47-update-notes.md`
- `openspec/changes/build-pdf-document-builder/proposal.md`
- `openspec/changes/build-pdf-document-builder/design.md`
- `openspec/changes/build-pdf-document-builder/tasks.md`
- `docs/phase-20-completion-notes.md`

## What Changed And Why

- Updated `@asym/pdf-renderer` maturity metadata to
  `phase-20-financial-data-table-renderer`.
- Updated stale Phase 18 data-table renderer warning messages to identify the
  Phase 20 renderer hardening gate.
- Added deterministic renderer tests for donation, invoice, and financial
  report table markup.
- Added diagnostics coverage for missing source, non-array source, max-row
  truncation, missing/invalid bindings, unsupported formatters, and empty
  states.
- Added a source-boundary test proving the browser-safe table renderer path
  does not import DocRaptor, calculation, aggregation, or subtotal logic.
- Marked Phase 20 complete and Phase 21 next in the OpenSpec tracker and
  mirrored roadmap docs.

## Repo Pattern Alignment

The renderer continues to follow the existing serializer pattern: document JSON
is walked recursively, data table nodes read inline `TableBinding` attrs or
external `bindingId` references, shared schema helpers validate and resolve
rows, and renderer warnings are returned as structured diagnostics instead of
throwing. Attribute and style serialization remain deterministic, and the root
renderer entry remains browser-safe.

## TDD Notes

Baseline checks passed before edits:

```text
pnpm --filter @asym/pdf-renderer test
PASS: 12 files, 75 tests

pnpm --filter @asym/pdf-renderer typecheck
PASS
```

Tests were added before production changes. The corrected red run failed for
the expected production gaps:

- `pdfRendererBoundary.maturity` still reported
  `phase-18-financial-data-table`.
- Data table missing/invalid binding diagnostics still used Phase 18 warning
  messages.

One over-specific unsupported-formatter assertion was corrected before
implementation so the red state represented production behavior, not a bad test
expectation. The minimal implementation then made the focused specs pass.

## Validation

- `pnpm --filter @asym/pdf-renderer test -- data-table.spec.ts public-entry.spec.ts` failed in the red phase for the expected maturity and diagnostic-message gaps, then passed after implementation and formatting.
- `pnpm --filter @asym/pdf-renderer test` passed: 12 files, 78 tests.
- `pnpm --filter @asym/pdf-renderer typecheck` passed.
- `pnpm --filter @asym/pdf-renderer build` passed. `tsdown` reported non-blocking plugin timing warnings.
- `pnpm --filter @asym/pdf-template-schema test` passed: 8 files, 53 tests.
- `pnpm --filter @asym/pdf-template-schema typecheck` passed.
- `pnpm --filter @asym/pdf-template-schema build` passed. `tsdown` reported non-blocking plugin timing warnings.
- `pnpm --filter @asym/pdf-editor test` passed: 7 files, 36 tests.
- `pnpm --filter @asym/pdf-editor typecheck` passed.
- `pnpm --filter @asym/pdf-editor build` passed. `tsdown` reported non-blocking plugin timing warnings.
- `pnpm --filter @react-email/editor test` passed: 50 files, 460 passed, 1 skipped. Existing Vite Prism dynamic import warning remains.
- `pnpm asym:editor-export-smoke` passed.
- `pnpm test` passed: Turbo reported 16 successful tasks. Existing warnings included Vitest mock-hoisting warnings, Vite dynamic import warnings, and tsdown plugin timing warnings.
- `pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder` passed.
- `pnpm dlx @fission-ai/openspec@latest validate --all` passed.
- `git diff --check` passed with Windows LF-to-CRLF working-copy warnings only.
- `pnpm lint` initially failed on formatting drift in touched TypeScript files plus the existing `apps/web/src/app/editor/editor-overrides.css` `!important` warning. The touched TypeScript files were formatted with `pnpm exec biome format --write ...`; the final lint run passed with the existing `!important` warning only.

## Documentation And OpenSpec Updates

- `openspec/changes/build-pdf-document-builder/tasks.md` now marks Phase 20
  complete and Phase 21 next.
- `docs/roadmap.md` now uses Phase 21 as the entry point.
- `packages/pdf-renderer/readme.md` documents the Phase 20 table renderer
  surface and the Phase 22 calculation deferral.
- `docs/decision-log.md` records the Phase 20 renderer-only hardening decision.
- Phase 18, Phase 19, and roadmap-update historical notes now clarify that
  Phase 20 has completed.

## Known Gaps

- Phase 21 has now completed end-to-end table preview fixtures across schema,
  editor, renderer, browser preview, and mocked DocRaptor preview.
- Calculations, subtotals, grouping computation, summary blocks, and table
  total rendering remain deferred to Phases 22 and 23.
- No table inspector UI, slash command wiring, DocRaptor orchestration, tenant
  storage, batch behavior, or platform integration was added.

## Revert Guidance

Rollback by reverting the renderer source and test changes in
`packages/pdf-renderer/src/compose-pdf-document-html.ts`,
`packages/pdf-renderer/src/index.ts`,
`packages/pdf-renderer/test/data-table.spec.ts`, and
`packages/pdf-renderer/test/public-entry.spec.ts`, then reverting the README,
roadmap, decision log, OpenSpec task, and completion-note updates listed above.
After rollback, rerun the focused `@asym/pdf-renderer` tests, package build,
export smoke, OpenSpec validation, lint, and `git diff --check`.

## Original Phase 21 Entry Point

Phase 21 was expected to create deterministic table preview fixtures that
connect the table schema, Phase 19 editor node, Phase 20 renderer markup,
browser preview, and mocked DocRaptor preview. It should avoid real network
calls and continue to leave calculations to Phase 22.

## Phase 21 Completion Addendum

Phase 21 has now completed the deterministic table preview fixture handoff.
The completion notes are recorded in `docs/phase-21-completion-notes.md`.
Phase 22 is the next entry point for deterministic totals, subtotals, and
grouping calculations.
