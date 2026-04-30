# Pre-Phase 18 Reconciliation Notes

## Active Phase

Pre-Phase 18: Post-Phase 17 Reconciliation, Safety Fixes, and OpenSpec
Alignment.

This note verifies the repository after Phase 17 and before Phase 18 starts.
It does not implement the Phase 18 financial data table block.

## Branch And Repository State

- Branch: `codex/pre-phase-18-reconciliation`
- Base: `canary` at `1c564b50`, the merge commit for Phase 17.
- Recent local Phase 17 commits reviewed:
  - `0033a96d feat: add phase 17 repeater support`
  - `6f2d3569 fix: harden repeater binding resolution`
  - `1c564b50 Merge pull request #17 from Asymmetric-al/codex/phase-17-repeaters`
- `gh pr view 17 --json ...` did not resolve in the configured GitHub
  repository, so PR 17 details were verified from local merge history,
  OpenSpec tasks, and Phase 17 completion notes.
- `gh pr list --state open --limit 20` showed upstream React Email,
  dependency, and infrastructure PRs. None directly block Phase 18 package
  work in the private `@asym/*` PDF builder packages.
- `gh issue list --state open --limit 20` showed upstream React Email issues.
  None directly block Phase 18.

## Completed Phase 12-17 Features

- Phase 12: Browser preview and DocRaptor test-mode preview package strategy.
- Phase 13: Typed variable registry in `@asym/pdf-template-schema`.
- Phase 14: Variable resolution, formatting, fallback behavior, and renderer
  variable adapter.
- Phase 15: Protected structured variable chips in `@asym/pdf-editor`.
- Phase 16: Structured conditional section schema, evaluator, renderer, and
  editor extension.
- Phase 17: Structured repeaters, scoped data resolution, renderer scope
  metadata, and repeater editor extension.

## Drift Found And Fixed

- `README.md` still said Phase 12 was next. It now lists Phases 12-17 as
  complete and Phase 18 as next.
- `openspec/changes/build-pdf-document-builder/design.md` current-state notes
  stopped at Phase 12. They now describe Phases 13-17 and Phase 18 as the next
  table phase.
- `docs/phase-17-completion-notes.md` did not mention the post-merge Phase 17
  hardening commit. It now records the invalid-binding and deterministic
  sorting fixes from `6f2d3569`.
- `openspec/changes/build-pdf-document-builder/tasks.md` now records this
  completed Pre-Phase 18 gate while keeping Phase 18 marked `Next`.

## Safety Fixes Made

- Renderer link and button `href` output now uses an allowlist before
  serialization.
  - Allowed: `http:`, `https:`, `mailto:`, `tel:`, fragments, and safe relative
    paths.
  - Blocked: `javascript:`, `data:`, `vbscript:`, protocol-relative URLs,
    control/space characters, backslashes, and malformed absolute URLs.
  - Unsafe URLs are omitted with an `unsafe_url` warning.
- Ordered conditional comparisons and repeater date sorting now use strict ISO
  date parsing.
  - ISO date-only values and ISO datetimes with explicit timezone are parsed.
  - Informal date strings are not parsed by `Date.parse`.
  - Invalid ordered condition comparisons return the existing structured
    `invalid_condition_value` diagnostic.
- Renderer external repeater binding parsing now preserves invalid binding
  diagnostics keyed by binding ID.
  - A repeater that references an invalid external binding renders author
    content once with `invalid_repeater_binding`, not a misleading
    `missing_repeater_binding`.

## Validation Output

Red checks before implementation:

```txt
pnpm --filter @asym/pdf-renderer test -- compose-pdf-document-html.spec.ts
1 failed: unsafe javascript/data/vbscript href values were serialized.

pnpm --filter @asym/pdf-template-schema test -- conditional-rules.spec.ts repeater-resolution.spec.ts
2 failed: informal date strings were parsed by Date.parse in conditions and repeater sorting.

pnpm --filter @asym/pdf-renderer test -- repeater-section.spec.ts
1 failed: invalid external repeater bindings were reported as missing.
```

Green validation after implementation:

```txt
pnpm --filter @asym/pdf-renderer test -- compose-pdf-document-html.spec.ts
Test Files  1 passed (1)
Tests  18 passed (18)

pnpm --filter @asym/pdf-template-schema test -- conditional-rules.spec.ts repeater-resolution.spec.ts
Test Files  2 passed (2)
Tests  15 passed (15)

pnpm --filter @asym/pdf-renderer test -- repeater-section.spec.ts
Test Files  1 passed (1)
Tests  6 passed (6)

pnpm --filter @asym/pdf-renderer typecheck
tsc --noEmit passed.

pnpm --filter @asym/pdf-template-schema typecheck
tsc --noEmit passed.

pnpm --filter @asym/pdf-renderer build
tsdown build completed.

pnpm --filter @asym/pdf-template-schema build
tsdown build completed.

pnpm lint
biome check passed with the existing apps/web/src/app/editor/editor-overrides.css !important warning.

pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder
Change 'build-pdf-document-builder' is valid.

pnpm dlx @fission-ai/openspec@latest validate --all
Totals: 1 passed, 0 failed (1 items).

git diff --check
Passed. Git printed Windows line-ending normalization warnings only.
```

## Phase 18 Readiness Decision

Go for Phase 18.

Phase 18 can begin after this pre-phase because the current tracker and roadmap
agree that Phase 17 is complete and Phase 18 is next, stale Phase 12 status was
removed, and the URL, date determinism, and invalid external repeater binding
safety gates now have focused regression coverage.

## Known Risks For Phase 18

- Phase 18 must preserve structured diagnostics for unsafe URLs, invalid
  repeater bindings, missing repeater sources, non-array sources, max row
  guards, and invalid condition comparisons.
- Phase 18 should extend `packages/pdf-template-schema/src/repeaters.ts`,
  `packages/pdf-renderer/src/repeaters.ts`, and
  `packages/pdf-renderer/test/repeater-section.spec.ts` for table data
  behavior rather than adding arbitrary JavaScript mapping logic.
- Phase 18 should not implement totals, subtotals, grouping calculations,
  DocRaptor orchestration, batch generation, or browser-preview fidelity
  claims. Later phases own those contracts.

## Revert Guidance

- To revert docs-only reconciliation, restore `README.md`, `docs/roadmap.md`,
  `docs/decision-log.md`, `docs/phase-17-completion-notes.md`,
  `openspec/changes/build-pdf-document-builder/design.md`,
  `openspec/changes/build-pdf-document-builder/tasks.md`, and delete this file.
- To revert URL safety, restore
  `packages/pdf-renderer/src/compose-pdf-document-html.ts` and
  `packages/pdf-renderer/test/compose-pdf-document-html.spec.ts`.
- To revert deterministic date parsing, delete
  `packages/pdf-template-schema/src/dates.ts` and restore
  `packages/pdf-template-schema/src/conditions.ts`,
  `packages/pdf-template-schema/src/repeaters.ts`,
  `packages/pdf-template-schema/test/conditional-rules.spec.ts`, and
  `packages/pdf-template-schema/test/repeater-resolution.spec.ts`.
- To revert invalid external repeater binding diagnostics, restore
  `packages/pdf-renderer/src/compose-pdf-document-html.ts` and
  `packages/pdf-renderer/test/repeater-section.spec.ts`.
