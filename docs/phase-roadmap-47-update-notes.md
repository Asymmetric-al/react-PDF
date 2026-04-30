# Phase Roadmap 47 Update Notes

Status: complete.

## Scope Completed

- Updated the canonical OpenSpec tracker from the historical 42-phase roadmap
  to the current 47-phase roadmap.
- Preserved completed Phases 1-18 exactly as implemented.
- Marked Phase 19, "Build Financial Data Table Editor Extension", as `Next`.
- Marked Phases 20-47 as `Not started`.
- Documented that Phase 18 already introduced data-table editor and renderer
  artifacts, while Phases 19 and 20 remain future audit, hardening,
  documentation, and formal completion gates.
- Moved financial calculation work to Phase 22 and summary/table-total
  rendering to Phase 23.
- Made documentation and OpenSpec tracker changes only. No package source,
  schemas, renderer behavior, editor behavior, build configs, lockfiles, or
  generated artifacts were changed.

## Old To New Phase Mapping

| Historical 42-phase item | Current 47-phase item |
|---|---|
| Phase 19 totals/subtotals/grouping/summary | Phase 22 calculation engine and Phase 23 summary/table-total rendering |
| Phase 20 page breaks/keep-together | Phase 25 page breaks/keep-together |
| Phase 21 header/footer | Phase 26 header/footer |
| Phase 22 image/assets | Phase 27 image/assets |
| Phase 23 branding/theme | Phase 28 branding/theme |
| Phase 24 starter templates/golden fixtures | Phase 29 starter templates/golden fixtures |
| Phase 25 preflight | Phase 30 preflight |
| Phase 26 render logs/artifact/audit | Phase 31 render logs/artifact/audit |
| Phase 27 lifecycle/versioning/publishing | Phase 32 lifecycle/versioning/publishing |
| Phase 28 batch framework | Phase 33 batch framework |
| Phase 29 async DocRaptor/retry | Phase 34 async DocRaptor/retry |
| Phase 30 Playwright local fallback | Phase 35 Playwright local fallback |
| Phase 31 accessibility/metadata/profile | Phase 36 accessibility/metadata/profile |
| Phase 32 security/tenant contracts | Phase 37 security/tenant contracts |
| Phase 33 Unlayer migration/coexistence | Phase 38 Unlayer migration/coexistence |
| Phase 34 core adapter/feature flag | Phase 39 core adapter/feature flag |
| Phase 35 docs/playground/examples | Phase 40 docs/playground/examples |
| Phase 36 performance/load tests | Phase 41 performance/load tests |
| Phase 37 release/API stability | Phase 42 release/API stability |
| Phase 38 security/secret/browser bundle audit | Phase 43 security/secret/browser bundle audit |
| Phase 39 OpenSpec reconciliation/archive readiness | Phase 44 OpenSpec reconciliation/archive readiness |
| Phase 40 mocked production-flow E2E | Phase 45 mocked production-flow E2E |
| Phase 41 core cutover playbook | Phase 46 core cutover playbook |
| Phase 42 final package sign-off | Phase 47 final package sign-off |

New current phases inserted before the shifted tail:

- Phase 19: Build Financial Data Table Editor Extension.
- Phase 20: Build Financial Data Table Renderer and Print Markup.
- Phase 21: Build Data Table End-to-End Preview Fixtures.
- Phase 24: Build Form Field, Signature, and QR Placeholder Contracts.

## Phase 19 Handoff

Phase 19 should treat existing Phase 18 data-table editor artifacts as starting
material. It should audit, harden, document, and formally complete:

- `packages/pdf-editor/src/extensions/data-table/index.ts`
- `packages/pdf-editor/src/extensions/index.ts`
- `packages/pdf-editor/test/data-table-extension.spec.tsx`
- `packages/pdf-editor/readme.md`

Phase 19 should verify command insertion, JSON attrs, deterministic HTML round
trip, shared `TableBindingSchema` diagnostics, extension exports, and no
renderer/DocRaptor/server-only imports from browser-facing editor exports.

At the time of this roadmap reconciliation, Phase 20 was expected to consume
the same node shape and serialized attributes for the renderer/print-markup
gate. Phase 22 remains the calculation entry point.

## Files Updated

- `AGENTS.md`
- `README.md`
- `docs/decision-log.md`
- `docs/package-boundaries.md`
- `docs/phase-04-readiness.md`
- `docs/phase-18-completion-notes.md`
- `docs/phase-5-completion-notes.md`
- `docs/phase-roadmap-47-update-notes.md`
- `docs/phase-roadmap-update-notes.md`
- `docs/pre-phase-12-reconciliation.md`
- `docs/roadmap.md`
- `openspec/changes/build-pdf-document-builder/design.md`
- `openspec/changes/build-pdf-document-builder/proposal.md`
- `openspec/changes/build-pdf-document-builder/tasks.md`

## Validation Results

Validation was run after the roadmap and history docs were updated.

### `git status --short --branch`

Result: passed; worktree contained only intended documentation and OpenSpec
changes.

```text
## codex/roadmap-47-reconciliation
 M AGENTS.md
 M README.md
 M docs/decision-log.md
 M docs/package-boundaries.md
 M docs/phase-04-readiness.md
 M docs/phase-18-completion-notes.md
 M docs/phase-5-completion-notes.md
 M docs/phase-roadmap-update-notes.md
 M docs/pre-phase-12-reconciliation.md
 M docs/roadmap.md
 M openspec/changes/build-pdf-document-builder/design.md
 M openspec/changes/build-pdf-document-builder/proposal.md
 M openspec/changes/build-pdf-document-builder/tasks.md
?? docs/phase-roadmap-47-update-notes.md
```

### `Select-String -Path AGENTS.md,README.md,docs/*.md,openspec/changes/build-pdf-document-builder/*.md -Pattern "42-phase|42 phases|Phase 19|Phase 42|Phase 47"`

Result: passed; remaining hits are current Phase 19/42/47 planning references
or explicitly historical 42-phase references in prior decision/completion
notes.

### `pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder`

Result: passed.

```text
Change 'build-pdf-document-builder' is valid
```

### `pnpm dlx @fission-ai/openspec@latest validate --all`

Result: passed.

```text
✓ change/build-pdf-document-builder
Totals: 1 passed, 0 failed (1 items)
- Validating...
```

### `pnpm lint`

Result: passed with the known existing CSS warning.

```text
Checked 1213 files in 466ms. No fixes applied.
Found 1 warning.
apps\web\src\app\editor\editor-overrides.css:7:21 lint/complexity/noImportantStyles
```

### `git diff --check`

Result: passed. Git reported LF-to-CRLF normalization warnings for touched
Markdown/OpenSpec files, but no whitespace errors.

## Known Gaps

- At the time of this note, Phase 19 and Phase 20 were not complete. Later
  completion notes now record Phase 19 editor hardening and Phase 20 renderer
  hardening.
- Financial calculations remain unimplemented until Phase 22.
- Summary blocks and computed table totals remain unimplemented until Phase 23.

## Revert Guidance

- Revert this roadmap reconciliation by restoring the touched Markdown and
  OpenSpec files to the previous historical 42-phase wording and deleting this
  file.
- No package source, schema, renderer, editor, lockfile, build config, or
  generated-artifact rollback is needed because this update is documentation
  only.
