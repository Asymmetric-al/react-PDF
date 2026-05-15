# Phase 22 Completion Notes

## Active Phase

- Active phase: Phase 22: Build Calculation Engine for Totals, Subtotals, and
  Grouping.
- Roadmap alignment: Phase 21 is complete and Phase 22 is now complete; Phase
  23 is the next entry point.
- Repository discrepancy: the phase prompt mentioned Phase 17 as complete and
  Phase 18 as next, but the local roadmap, proposal, design, and OpenSpec tasks
  showed Phase 21 complete and Phase 22 next before implementation.

## Implementation Notes

- Added `@asym/pdf-template-schema` calculation helpers for numeric aggregates,
  table totals, grouped subtotals, invoice totals, financial income/expense/net,
  and tax-deductible amount.
- Kept the engine React-free, browser-safe, and schema-owned so renderer,
  preview, future preflight, and future core adapter code can share the same
  contracts.
- Used structured data paths only. No arbitrary JavaScript, template
  expressions, data fetching, or DocRaptor behavior was added.
- Used internal BigInt decimal arithmetic with default scale `2` and
  `half_away_from_zero` rounding. No decimal dependency was added.
- Preserved original source-array indexes in grouped-total diagnostics so
  future editor, preflight, audit, and `Asymmetric-al/core` adapter surfaces can
  point back to the correct source row.
- Scoped grouped grand totals to rows with valid group keys so rendered
  grouped subtotals and grand totals reconcile in Phase 23.
- Kept renderer table output unchanged; Phase 23 owns summary block and table
  total rendering.
- Replaced BigInt literal/exponent syntax with `BigInt(...)` and a looped scale
  factor so downstream packages with lower TypeScript targets can typecheck the
  schema source through path aliases.

## Files Changed

- `README.md`
- `openspec/changes/build-pdf-document-builder/tasks.md`
- `openspec/changes/build-pdf-document-builder/proposal.md`
- `openspec/changes/build-pdf-document-builder/design.md`
- `docs/roadmap.md`
- `docs/decision-log.md`
- `docs/phase-22-completion-notes.md`
- `packages/pdf-template-schema/readme.md`
- `packages/pdf-template-schema/src/calculations.ts`
- `packages/pdf-template-schema/src/index.ts`
- `packages/pdf-template-schema/test/calculations.spec.ts`
- `packages/pdf-template-schema/test/public-entry.spec.ts`
- `packages/pdf-renderer/readme.md`

## TDD Notes

Tests were added before implementation:

- `packages/pdf-template-schema/test/calculations.spec.ts`
- `packages/pdf-template-schema/test/public-entry.spec.ts`

The focused red run failed for the expected missing calculation exports and
Phase 22 maturity metadata. The implementation then added the smallest
schema-only calculation engine and public export update needed to pass.
Follow-up red runs covered grouped diagnostic source indexes and grouped grand
total reconciliation before the review fixes were applied.

## Validation Summary

All Phase 22 focused and broad checks passed with `corepack pnpm`:

- `corepack pnpm --filter @asym/pdf-template-schema test -- calculations.spec.ts public-entry.spec.ts`
- `corepack pnpm --filter @asym/pdf-template-schema test`
- `corepack pnpm --filter @asym/pdf-template-schema typecheck`
- `corepack pnpm --filter @asym/pdf-template-schema build`
- `corepack pnpm --filter @asym/pdf-renderer test`
- `corepack pnpm --filter @asym/pdf-renderer typecheck`
- `corepack pnpm --filter @asym/pdf-renderer build`
- `corepack pnpm --filter @asym/pdf-editor test`
- `corepack pnpm --filter @asym/pdf-editor typecheck`
- `corepack pnpm --filter @asym/pdf-editor build`
- `corepack pnpm --filter @react-email/editor test`
- `corepack pnpm asym:editor-export-smoke`
- `corepack pnpm test`
- `corepack pnpm lint`
- `corepack pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder`
- `corepack pnpm dlx @fission-ai/openspec@latest validate --all`
- `git diff --check`

Notes:

- Bare `pnpm` was unavailable on PATH, so `corepack pnpm` was used as the
  pnpm-compatible fallback.
- Turbo needed a temporary `%TEMP%\codex-pnpm-shim\pnpm.cmd` shim for nested
  package commands during `corepack pnpm test`.
- `gh` was unavailable on PATH, so GitHub CLI PR inspection was not performed.
- Build commands emitted existing non-blocking `tsdown` plugin timing warnings.
- `@react-email/editor` tests emitted the existing Vite dynamic import warning
  for `packages/editor/src/extensions/prism-plugin.ts`.
- `corepack pnpm lint` passed with the existing warning in
  `apps/web/src/app/editor/editor-overrides.css` for `!important`.
- `git diff --check` passed with Windows LF-to-CRLF working-copy warnings only.
- An intermediate `@asym/pdf-editor typecheck` run failed because BigInt
  literals in the schema source were parsed under the editor package's lower
  TypeScript target. The source was adjusted and the check passed.

## Documentation And OpenSpec Updates

- Marked Phase 22 complete and Phase 23 next in the OpenSpec tracker.
- Updated the proposal, design, root README, schema readme, renderer readme,
  and roadmap to describe the calculation contract and Phase 23 handoff.
- Recorded the durable Phase 22 calculation precision and package-boundary
  decision in `docs/decision-log.md`.

## Known Gaps

- Phase 22 does not render summary blocks or calculated table total rows.
- Phase 22 does not add UI controls for calculations.
- Calculation helpers do not fetch real donor, invoice, or financial data.
- Browser preview remains deterministic authoring feedback, not production PDF
  fidelity.

## Revert Guidance

Rollback by reverting the new calculation source, schema export and maturity
metadata changes, calculation tests, package readme updates, root docs,
OpenSpec task/proposal/design updates, decision log entry, and this completion
note. After rollback, rerun schema, renderer, editor, React Email editor,
export smoke, OpenSpec validation, lint, and `git diff --check`.

## Next Phase Entry Point

Phase 23 exposes summary blocks and table total rendering. Start from
`packages/pdf-template-schema/src/calculations.ts`, the Phase 21 table preview
fixtures, and the Phase 20 renderer placeholder-row tests.
