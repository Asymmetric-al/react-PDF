# Phase 14 Completion Notes: Variable Resolution, Formatter, and Fallback System

## Active Phase

Phase 14: Build Variable Resolution, Formatter, and Fallback System.

## Summary

Phase 14 adds a shared, React-free variable resolver and formatter layer on
top of the Phase 13 typed variable registry. It resolves registry keys against
caller-provided data contexts, applies deterministic formatter output, returns
structured diagnostics, and exposes a thin renderer adapter for variable usages
collected by `composePdfDocumentHtml`.

## Implementation Notes

- A Phase 13 checkpoint commit was created before Phase 14 edits so the typed
  registry work stays reviewable separately.
- `@asym/pdf-template-schema` now exports formatter and resolver APIs:
  `createVariableResolver`, `resolveVariableValue`,
  `resolveVariableValues`, `formatVariableValue`, `getValueAtDataPath`, and
  `defaultVariableFormatters`.
- The resolver supports nested dotted `sourcePath` lookup, missing required
  errors, missing optional warnings, optional fallback values, invalid type and
  value diagnostics, unknown variables, unknown formatters, and formatter
  overrides from usage sites.
- Formatter defaults are deterministic: `en-US`, `USD`, and `UTC`.
- Supported formatter behavior includes text/rich text display strings,
  currency, date, date range, datetime, number, integer, percentage, multiline
  address, receipt/invoice/id passthrough, fiscal period/year labels, boolean
  labels, URL validation, and image URL validation.
- `@asym/pdf-renderer` now exports `resolvePdfDocumentVariables`, which
  resolves serializer-collected `PdfDocumentVariableUsage` entries without
  mutating generated HTML.

## Out Of Scope

- No editor variable chip extension. Phase 15 owns editor insertion and chip
  behavior.
- No arbitrary JavaScript in template logic.
- No string replacement of variable nodes in rendered HTML.
- No real donor, tenant, asset, or financial data fetching.
- No DocRaptor wiring or production render orchestration.
- No full preflight behavior.

## Tests Added Or Updated

- `packages/pdf-template-schema/test/variable-resolution.spec.ts`
  - String variable resolution.
  - Nested source path lookup.
  - Optional fallback usage.
  - Missing required variable errors.
  - Currency, date, date range, fiscal year, address, percentage, boolean, and
    image URL formatting.
  - Invalid type, unknown variable, and unknown formatter diagnostics.
  - Batch resolution and reusable resolver behavior.
  - React-free dependency check.
- `packages/pdf-renderer/test/variable-resolution.spec.ts`
  - Renderer adapter resolves serializer-collected variable usages.
  - Unknown serializer variable usages flow through structured diagnostics.
- Public-entry tests now cover Phase 14 boundary maturity and exports.

## Validation

```sh
pnpm --filter @asym/pdf-template-schema test -- variable-resolution.spec.ts
```

Initial TDD red result: failed as expected because `resolveVariableValue` and
`createVariableResolver` did not exist yet. Final result: passed,
`1 passed (1)` test file and `7 passed (7)` tests.

```sh
pnpm --filter @asym/pdf-renderer test -- variable-resolution.spec.ts
```

Initial TDD red result: failed as expected because
`resolvePdfDocumentVariables` did not exist yet. Final result: passed,
`1 passed (1)` test file and `2 passed (2)` tests.

```sh
pnpm --filter @asym/pdf-template-schema test
```

Result: passed. `5 passed (5)` test files, `29 passed (29)` tests.

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

Result: passed. `9 passed (9)` test files, `52 passed (52)` tests.

```sh
pnpm --filter @asym/pdf-renderer typecheck
```

Result: passed. `tsc --noEmit` exited 0.

```sh
pnpm --filter @asym/pdf-renderer build
```

Result: passed. `tsdown` built CJS and ESM outputs successfully.

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

- Phase 14 does not insert or render editor variable chips.
- Phase 14 does not replace variable placeholders in serialized HTML.
- Phase 14 does not fetch real platform data or enforce permissions.
- Phase 14 does not run full publish/render preflight.
- Root `pnpm build` remains blocked on the pre-existing Windows symlink issue
  in upstream demo/playground builds.

## Phase 15 Handoff

Phase 15 should build the variable chip editor extension against:

- `packages/pdf-template-schema/src/variables.ts`
- `packages/pdf-template-schema/src/formatters.ts`
- `packages/pdf-template-schema/src/variable-resolution.ts`
- `packages/pdf-renderer/src/variables.ts`
- `packages/pdf-template-schema/test/variable-registry.spec.ts`
- `packages/pdf-template-schema/test/variable-resolution.spec.ts`
- `packages/pdf-renderer/test/variable-resolution.spec.ts`

The editor chip should use structured registry keys and resolver sample or
fallback output, but should not introduce arbitrary JavaScript template logic.

## Revert Guidance

- To remove the Phase 14 resolver API, delete
  `packages/pdf-template-schema/src/formatters.ts` and
  `packages/pdf-template-schema/src/variable-resolution.ts`, then remove their
  root exports from `packages/pdf-template-schema/src/index.ts`.
- To remove renderer integration, delete
  `packages/pdf-renderer/src/variables.ts` and remove its exports from
  `packages/pdf-renderer/src/index.ts`.
- To remove test coverage, delete
  `packages/pdf-template-schema/test/variable-resolution.spec.ts` and
  `packages/pdf-renderer/test/variable-resolution.spec.ts`, then restore the
  prior public-entry expectations.
- To revert documentation and tracker updates, restore
  `packages/pdf-template-schema/readme.md`, `packages/pdf-renderer/readme.md`,
  `docs/roadmap.md`, `docs/decision-log.md`, this note, and
  `openspec/changes/build-pdf-document-builder/tasks.md` to their previous
  Phase 14 entry state.
