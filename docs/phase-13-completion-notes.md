# Phase 13 Completion Notes: Typed Variable Registry

## Active Phase

Phase 13: Build the Typed Variable Registry.

## Summary

Phase 13 adds a shared, React-free typed variable registry to
`@asym/pdf-template-schema`. The registry defines nonprofit, ministry, donor,
receipt, invoice, statement, asset, computed, and financial-report variable
domains for later editor, renderer, preview, preflight, and core adapter work.

## Implementation Notes

- `RegistryVariableDefinitionSchema` extends the Phase 6
  `VariableDefinitionSchema` contract with registry-only metadata:
  `description`, `required`, `fallback`, `formatter`, `privacy`, `sourcePath`,
  and non-empty `documentCategories`.
- `VariableDefinitionSchema` remains backward-compatible for template-embedded
  variables and existing Phase 6 fixtures.
- `TemplateCategorySchema` moved to `src/categories.ts` so template and
  registry schemas can share document categories without a runtime import
  cycle.
- `createVariableRegistry` validates definitions, rejects duplicate keys with
  `VariableRegistryError`, sorts definitions by key, supports lookup by key,
  lookup by group, required-variable filtering, unknown-key detection, and
  deterministic sample-data generation.
- `coreVariableDefinitions` and `coreVariableRegistry` cover all required Phase
  13 groups and all required value types.
- Sample data is fictional and deterministic. It is generated from
  `sourcePath`, not from real donor or financial data.
- `@asym/pdf-renderer` has a small import-boundary test proving the registry
  can be consumed from renderer code without React or editor imports.

## Tests Added Or Updated

- `packages/pdf-template-schema/test/variable-registry.spec.ts`
  - Registry validation.
  - Registry-only metadata requirements.
  - Duplicate key rejection.
  - Lookup by key and group.
  - Required variable filtering by document category.
  - Deterministic sample-data fixtures for donation receipt, tax receipt,
    annual statement, financial report, invoice, and certificate.
  - Unknown variable detection.
  - React-free package dependency check.
- `packages/pdf-template-schema/test/__snapshots__/variable-registry.spec.ts.snap`
  - Deterministic sample-data snapshots for the six Phase 13 fixture
    categories.
- `packages/pdf-template-schema/test/public-entry.spec.ts`
  - Phase 13 boundary metadata and public registry export smoke checks.
- `packages/pdf-renderer/test/variable-registry-import.spec.ts`
  - Renderer import boundary check for shared registry APIs.

## Validation

```sh
git status --short --branch
```

Result: `## codex/phase-13-variable-registry`

```sh
git branch --show-current
```

Result: `codex/phase-13-variable-registry`

```sh
gh pr list --repo Asymmetric-al/react-PDF --state merged --limit 15
gh pr list --repo Asymmetric-al/react-PDF --state open --limit 15
```

Result: merged PRs #1-#13 were reviewed from GitHub CLI output. No open PRs
were listed for `Asymmetric-al/react-PDF`.

```sh
pnpm --filter @asym/pdf-template-schema test
```

Result: Passed. `4 passed (4)` test files, `22 passed (22)` tests.

```sh
pnpm --filter @asym/pdf-template-schema typecheck
```

Result: Passed. `tsc --noEmit` exited 0.

```sh
pnpm --filter @asym/pdf-template-schema build
```

Result: Passed. `tsdown` built CJS and ESM outputs successfully.

```sh
pnpm --filter @asym/pdf-renderer test
```

Result: Passed. `8 passed (8)` test files, `49 passed (49)` tests.

```sh
pnpm test
```

Result: Passed. Turbo reported `16 successful, 16 total`.

Known existing warnings during root tests:

- Vitest warnings in upstream `@react-email/render` tests about nested
  `vi.mock("react-dom/server")`.
- Existing React key warnings in `@react-email/editor` serializer tests.
- Existing Vite dynamic import warning in `apps/web`.

```sh
pnpm build
```

Result: Failed for the known Windows upstream demo symlink caveat after
targeted package builds passed. The failure was:

```text
demo:build: Error: EPERM: operation not permitted, symlink
'C:\Users\Conrad\Documents\GitHub\react-PDF\node_modules\.pnpm\@babel+core@7.29.0\node_modules\@babel\core'
-> 'C:\Users\Conrad\Documents\GitHub\react-PDF\apps\demo\.react-email\node_modules\@babel\core'
Failed: demo#build
```

Targeted `@asym/pdf-template-schema`, `@asym/pdf-renderer`,
`@asym/pdf-editor`, `@asym/docraptor-client`, `@react-email/render`,
`react-email`, and `@react-email/editor` builds completed before the upstream
demo failure.

```sh
pnpm lint
```

Result: Passed with the existing warning in
`apps/web/src/app/editor/editor-overrides.css` for
`lint/complexity/noImportantStyles` on `!important`.

```sh
pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder
```

Result: Passed. `Change 'build-pdf-document-builder' is valid`.

```sh
pnpm dlx @fission-ai/openspec@latest validate --all
```

Result: Passed. `Totals: 1 passed, 0 failed (1 items)`.

```sh
git diff --check
```

Result: Passed with line-ending warnings only for touched Markdown/OpenSpec
files.

## Known Gaps

- Phase 13 does not resolve real data from a context. Phase 14 owns variable
  resolution.
- Phase 13 does not apply formatter output or fallback rendering. Phase 14
  owns formatter and fallback behavior.
- Phase 13 does not add editor variable chips. Phase 15 owns editor chip
  insertion and protected inline-node behavior.
- Phase 13 does not add preflight validation, real donor preview, DocRaptor
  production orchestration, or batch behavior.

## Source Of Truth For Future Agents

- `openspec/project.md`
- `openspec/changes/build-pdf-document-builder/tasks.md`
- `openspec/changes/build-pdf-document-builder/design.md`
- `packages/pdf-template-schema/src/variables.ts`
- `packages/pdf-template-schema/src/categories.ts`
- `packages/pdf-template-schema/test/variable-registry.spec.ts`
- `packages/pdf-renderer/test/variable-registry-import.spec.ts`
- `packages/pdf-template-schema/readme.md`

## Revert Guidance

- To remove the Phase 13 registry API, revert the additions in
  `packages/pdf-template-schema/src/variables.ts` and the root exports in
  `packages/pdf-template-schema/src/index.ts`.
- To restore the prior category location, move `TemplateCategorySchema` back
  into `packages/pdf-template-schema/src/template.ts` and remove
  `packages/pdf-template-schema/src/categories.ts`.
- To remove test coverage, delete
  `packages/pdf-template-schema/test/variable-registry.spec.ts`,
  `packages/pdf-template-schema/test/__snapshots__/variable-registry.spec.ts.snap`,
  and `packages/pdf-renderer/test/variable-registry-import.spec.ts`, then
  restore the prior public-entry expectation.
- To revert documentation and tracker updates, restore
  `packages/pdf-template-schema/readme.md`, `docs/roadmap.md`,
  `docs/decision-log.md`, this note, and
  `openspec/changes/build-pdf-document-builder/tasks.md` to their prior Phase
  13 entry state.
