# Phase 17 Completion Notes

## Active Phase

Phase 17: Build Repeater Extension and Scoped Data Resolver.

## Branch And Base

- Branch: `codex/phase-17-repeaters`
- Base: `origin/canary` after merged Phase 16 commit `59991390`

## Implementation Notes

Phase 17 adds structured repeaters without arbitrary JavaScript and without
DocRaptor, financial table, totals, grouping, or batch orchestration behavior.

- `@asym/pdf-template-schema` now validates repeater `indexAlias`, structured
  `filters`, DataPath-based item aliases, and exposes a React-free repeater
  resolver.
- `@asym/pdf-renderer` now renders `repeater` nodes from inline bindings or
  binding IDs, creates scoped data contexts per item, and stores repeater scope
  metadata without storing repeated source values.
- `@asym/pdf-editor/extensions` now exports a protected TipTap `repeater`
  block node with command insertion, deterministic HTML attrs, and preview
  diagnostics.
- Package maturity metadata moved from `phase-16-conditional-sections` to
  `phase-17-repeaters`.

## Tests Added

- `packages/pdf-template-schema/test/repeater-resolution.spec.ts`
- `packages/pdf-renderer/test/repeater-section.spec.ts`
- `packages/pdf-editor/test/repeater-extension.spec.tsx`

Coverage includes array resolution, missing and non-array source warnings,
structured filtering, deterministic sorting, max-item guard behavior, scoped
variable metadata, scoped variable resolution, nested conditionals, empty
states, command insertion, JSON/HTML round trips, preview diagnostics, and
public extension exports.

## Validation Output

TDD red checks were run first:

```sh
pnpm --filter @asym/pdf-template-schema test -- repeater-resolution.spec.ts
```

Initial result: failed as expected because `RepeaterBindingSchema` did not yet
accept `indexAlias`/`filters`, `itemAlias` still used `VariableKeySchema`, and
`resolveRepeaterItems` / `createScopedRepeaterContext` were not implemented.

```sh
pnpm --filter @asym/pdf-renderer test -- repeater-section.spec.ts
```

Initial result: failed as expected because `repeater` was treated as an unknown
container node and scoped variable metadata/resolution did not exist.

```sh
pnpm --filter @asym/pdf-editor test -- repeater-extension.spec.tsx
```

Initial result: failed as expected because `insertRepeaterSection`,
`createRepeaterSectionExtension`, `getRepeaterSectionPreview`, and `repeater`
node parsing did not exist.

Focused package validation after implementation:

```sh
pnpm --filter @asym/pdf-template-schema test
```

Passed: 7 files, 42 tests.

```sh
pnpm --filter @asym/pdf-renderer test
```

Passed: 11 files, 67 tests.

```sh
pnpm --filter @asym/pdf-editor test
```

Passed: 6 files, 26 tests.

```sh
pnpm --filter @asym/pdf-template-schema typecheck
pnpm --filter @asym/pdf-renderer typecheck
pnpm --filter @asym/pdf-editor typecheck
```

Passed.

```sh
pnpm --filter @asym/pdf-template-schema build
pnpm --filter @asym/pdf-renderer build
pnpm --filter @asym/pdf-editor build
```

Passed. `tsdown` reported non-blocking plugin timing warnings.

Compatibility validation:

```sh
pnpm --filter @react-email/editor test
```

Passed: 50 files, 460 passed, 1 skipped. Known Vite Prism dynamic import
warning remains unchanged.

```sh
pnpm asym:editor-export-smoke
```

Passed with `status=ok`.

Repo validation:

```sh
pnpm test
```

Passed: Turbo reported 16 successful tasks.

```sh
pnpm build
```

Failed for the known Windows upstream demo/playground symlink caveat:

```text
playground:build: Error: EPERM: operation not permitted, symlink ...\@babel\core -> ...\playground\.react-email\node_modules\@babel\core
demo:build: Error: EPERM: operation not permitted, symlink ...\@babel\core -> ...\apps\demo\.react-email\node_modules\@babel\core
Failed: demo#build, playground#build
```

Targeted Phase 17 package builds passed before this failure.

```sh
pnpm lint
```

Passed with the existing non-blocking warning in
`apps/web/src/app/editor/editor-overrides.css` for `!important`.

```sh
pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder
```

Passed: `Change 'build-pdf-document-builder' is valid`.

```sh
pnpm dlx @fission-ai/openspec@latest validate --all
```

Passed: `Totals: 1 passed, 0 failed (1 items)`.

```sh
git diff --check
```

Passed with line-ending warnings only for modified text files.

## Documentation Updated

- `packages/pdf-template-schema/readme.md`
- `packages/pdf-renderer/readme.md`
- `packages/pdf-editor/readme.md`
- `docs/decision-log.md`
- `docs/roadmap.md`
- `openspec/changes/build-pdf-document-builder/tasks.md`

## OpenSpec Tracking

`openspec/changes/build-pdf-document-builder/tasks.md` now marks Phase 17
complete and Phase 18 as next.

## Known Gaps

- Phase 17 does not implement financial table blocks, totals/subtotals,
  grouping, UI picker controls, DocRaptor orchestration, batch behavior, or
  variable text substitution into HTML.
- Root `pnpm build` still hits the existing Windows `.react-email` symlink
  `EPERM` caveat in `demo` and `playground`.
- The existing editor Prism dynamic import warning and CSS `!important` lint
  warning remain unchanged.

## Phase 18 Handoff

Phase 18 should build the first report-grade data table block on top of the
Phase 17 scoped repeater behavior. Use these files as the immediate starting
point:

- `packages/pdf-template-schema/src/repeaters.ts`
- `packages/pdf-template-schema/test/repeater-resolution.spec.ts`
- `packages/pdf-renderer/src/repeaters.ts`
- `packages/pdf-renderer/test/repeater-section.spec.ts`
- `packages/pdf-editor/src/extensions/repeater/index.ts`
- `packages/pdf-editor/test/repeater-extension.spec.tsx`

## Revert Guidance

- To remove schema repeater behavior, revert
  `packages/pdf-template-schema/src/repeaters.ts`,
  `packages/pdf-template-schema/src/bindings.ts`,
  `packages/pdf-template-schema/src/index.ts`, and the schema repeater tests.
- To remove renderer repeater behavior, revert
  `packages/pdf-renderer/src/repeaters.ts`,
  `packages/pdf-renderer/src/compose-pdf-document-html.ts`,
  `packages/pdf-renderer/src/variables.ts`,
  `packages/pdf-renderer/src/index.ts`, and renderer repeater/public-entry
  tests.
- To remove editor repeater behavior, revert
  `packages/pdf-editor/src/extensions/repeater`,
  `packages/pdf-editor/src/extensions/index.ts`,
  `packages/pdf-editor/src/index.ts`, and editor repeater/public-entry tests.
- To revert planning/docs only, restore the Phase 16/Phase 17 status in
  `docs/roadmap.md`, `docs/decision-log.md`,
  `openspec/changes/build-pdf-document-builder/tasks.md`, the package readmes,
  and delete this note.
