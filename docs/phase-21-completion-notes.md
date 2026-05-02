# Phase 21 Completion Notes

## Active Phase

- Active phase: Phase 21: Build Data Table End-to-End Preview Fixtures.
- Roadmap alignment: Phase 20 is complete and Phase 21 is now complete; Phase 22 is the next entry point.
- Repository discrepancy: the phase prompt mentioned Phase 17 as complete, but the local roadmap, proposal, design, and OpenSpec tasks showed Phase 20 complete and Phase 21 next before implementation.

## Implementation Notes

- Added deterministic data table preview fixtures for annual giving statements, invoices, and financial reports.
- Kept fixture data fictional, ordered, timestamp-free or fixed, and locale-stable.
- Added preview data plumbing so browser preview and DocRaptor test preview can render template table bindings with caller-supplied sample data.
- Kept totals and subtotals as explicit placeholder text. Phase 21 does not add calculation logic.
- Kept DocRaptor behavior server-side and covered the test preview path with an injected fetch implementation so no real network call occurs.

## Files Changed

- `README.md`
- `openspec/changes/build-pdf-document-builder/tasks.md`
- `openspec/changes/build-pdf-document-builder/proposal.md`
- `openspec/changes/build-pdf-document-builder/design.md`
- `docs/roadmap.md`
- `docs/decision-log.md`
- `docs/package-boundaries.md`
- `docs/phase-18-completion-notes.md`
- `docs/phase-19-completion-notes.md`
- `docs/phase-20-completion-notes.md`
- `docs/phase-21-completion-notes.md`
- `packages/pdf-template-schema/readme.md`
- `packages/pdf-template-schema/test/fixtures/table-preview-fixtures.ts`
- `packages/pdf-template-schema/test/table-preview-fixtures.spec.ts`
- `packages/pdf-editor/readme.md`
- `packages/pdf-editor/test/data-table-preview-fixtures.spec.tsx`
- `packages/pdf-renderer/readme.md`
- `packages/pdf-renderer/src/docraptor-preview.ts`
- `packages/pdf-renderer/src/index.ts`
- `packages/pdf-renderer/src/preview.ts`
- `packages/pdf-renderer/test/data-table-preview.spec.ts`
- `packages/pdf-renderer/test/docraptor-preview.spec.ts`
- `packages/pdf-renderer/test/public-entry.spec.ts`

## TDD Notes

Tests were added before the renderer preview plumbing implementation:

- Schema fixture validation in `packages/pdf-template-schema/test/table-preview-fixtures.spec.ts`.
- Editor data table round-trip coverage in `packages/pdf-editor/test/data-table-preview-fixtures.spec.tsx`.
- Renderer and preview end-to-end coverage in `packages/pdf-renderer/test/data-table-preview.spec.ts`.

The renderer preview tests initially failed because the preview pipeline did not pass `tableBindings` or `dataContext` into document composition. The implementation then added the smallest shared preview plumbing change to make browser preview and mocked DocRaptor preview use the fixture data.

## Validation Summary

All Phase 21 focused checks passed with `corepack pnpm`:

- `corepack pnpm --filter @asym/pdf-template-schema test -- table-preview-fixtures.spec.ts`
- `corepack pnpm --filter @asym/pdf-editor test -- data-table-preview-fixtures.spec.tsx`
- `corepack pnpm --filter @asym/pdf-renderer test -- data-table-preview.spec.ts preview.spec.ts`
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

Notes:

- Bare `pnpm` was unavailable on PATH, so `corepack pnpm` was used as the pnpm-compatible fallback.
- Turbo needed a temporary `%TEMP%\codex-pnpm-shim\pnpm.cmd` shim for nested package commands.
- Forced broad `turbo run test --force` runs exposed unrelated `@react-email/ui` timeout failures under Turbo load, including `get-tailwind-config.spec.ts` timing out at 5000ms. Rerunning `corepack pnpm --filter @react-email/ui test` passed, and the normal `corepack pnpm test` pass completed afterward.
- `corepack pnpm lint` passed with one existing Biome warning in `apps/web/src/app/editor/editor-overrides.css` for `!important`; Phase 21 did not touch that file.
- `git diff --check` could not be run because `git` is not available on PATH in this environment.
- GitHub CLI PR inspection could not be run because `gh` is not available on PATH.

## Known Gaps

- Phase 21 fixtures do not calculate totals, subtotals, or grouped values.
- Browser preview remains a deterministic development preview and is not production PDF fidelity.
- The table fixtures are test fixtures only, not public starter templates or new export subpaths.

## Revert Guidance

Rollback by reverting the Phase 21 fixture file, the new schema/editor/renderer tests, the `dataContext` preview request plumbing, renderer and DocRaptor preview maturity metadata, and the documentation/OpenSpec task updates listed above. No package export map was changed.

After reverting, rerun the affected package tests, typechecks, builds, the editor export smoke test, OpenSpec validation, and `git diff --check` in an environment where Git is available.

## Next Phase Entry Point

Phase 22 adds deterministic calculation support for totals, subtotals, and grouping. Start from the existing table binding schema, Phase 21 fixtures, and the warning/diagnostics paths covered by the preview tests.
