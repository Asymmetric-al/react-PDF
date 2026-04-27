# Phase 12 Completion Notes: Browser Preview and DocRaptor Test Preview

## Active Phase

Phase 12: Build Browser Preview and DocRaptor Preview Strategy.

## Summary

Phase 12 adds package-level preview infrastructure in `@asym/pdf-renderer`.
The root renderer entry now exposes browser-safe preview APIs that generate
print HTML/CSS snapshots from structured template JSON. True PDF preview is
separate and server-only through `@asym/pdf-renderer/docraptor-preview`, which
uses `@asym/docraptor-client` in test mode.

## Implementation Notes

- `createBrowserPdfPreview` validates input with
  `DocumentTemplateV1Schema.safeParse`, serializes parsed template content with
  `composePdfDocumentHtml`, wraps it with `composePrintDocumentHtml`, and
  returns a typed preview result.
- Browser preview metadata explicitly sets `finalPdfFidelity: false` and
  `productionRender: false`.
- `createDocRaptorTestPdfPreview` is exported only from
  `@asym/pdf-renderer/docraptor-preview`.
- `docraptorPreviewBoundary` records the server-only DocRaptor subpath
  dependency so the browser-safe root `pdfRendererBoundary` only lists the
  root entry's schema dependency.
- DocRaptor test preview uses `mode: "test"`, sends `media: "print"`, passes
  `baseUrl` as DocRaptor `baseurl` when provided, and returns PDF bytes as a
  preview artifact.
- Optional Phase 12 preview preflight hooks can add structured diagnostics
  without implementing the full Phase 25 preflight system.
- Preview operates from parsed data and regression tests cover that the caller
  template object is not mutated.

## Tests Added Or Updated

- `packages/pdf-renderer/test/preview.spec.ts`
  - Browser preview from a valid fixture.
  - Generated HTML/CSS snapshots.
  - Serializer warning flow.
  - Optional preflight warning flow.
  - Structured schema errors for invalid templates.
  - Browser preview non-final fidelity metadata.
  - Read-only template behavior.
  - Root entry does not expose DocRaptor preview helpers.
  - Root entry imports in a browser-like runtime.
- `packages/pdf-renderer/test/docraptor-preview.spec.ts`
  - DocRaptor test mode payload.
  - `prince_options.media: "print"`.
  - Optional `baseurl`.
  - PDF bytes preview artifact.
  - DocRaptor error normalization.
  - API key not serialized in preview results.
  - Schema and preflight errors prevent DocRaptor calls.
- `packages/pdf-renderer/test/public-entry.spec.ts`
  - Renderer boundary updated to `phase-12-preview`.
  - Browser preview root export smoke test.

## Validation

Intended validation commands:

```sh
pnpm --filter @asym/pdf-renderer test
pnpm --filter @asym/docraptor-client test
pnpm --filter @asym/pdf-renderer build
pnpm test
pnpm build
pnpm lint
pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder || true
pnpm dlx @fission-ai/openspec@latest validate --all || true
```

Local execution status:

- Blocked: `pnpm --filter @asym/pdf-renderer test`
- Blocked: `pnpm --filter @asym/docraptor-client test`
- Blocked: `pnpm --filter @asym/pdf-renderer build`
- Blocked: `pnpm test`
- Blocked: `pnpm build`
- Blocked: `pnpm lint`
- Blocked: `pnpm dlx @fission-ai/openspec@latest validate build-pdf-document-builder`
- Blocked: `pnpm dlx @fission-ai/openspec@latest validate --all`

All blocked commands failed because `pnpm` is not available on PATH in the
local Codex app environment. `node_modules` is also absent, so there is no
local package-manager fallback available in this workspace. `git diff --check`
completed successfully, with only Windows line-ending warnings.

## Known Gaps

- No product UI or editor preview panel is added in Phase 12.
- No real donor, ministry, tenant, or financial data resolution is added.
- No full preflight system is added; Phase 12 only exposes an optional
  diagnostic hook.
- No production DocRaptor render orchestration is added. The DocRaptor path is
  test-mode preview only and may be watermarked.
- No batch generation, lifecycle/versioning, or core integration behavior is
  added.

## Source Of Truth For Future Agents

- `openspec/project.md`
- `openspec/changes/build-pdf-document-builder/tasks.md`
- `openspec/changes/build-pdf-document-builder/design.md`
- `packages/pdf-renderer/src/preview.ts`
- `packages/pdf-renderer/src/docraptor-preview.ts`
- `packages/pdf-renderer/readme.md`
- `packages/docraptor-client/src/client.ts`
- `packages/pdf-template-schema/src/template.ts`

## Revert Guidance

- To remove the browser preview API, revert `packages/pdf-renderer/src/preview.ts`
  and the related root exports in `packages/pdf-renderer/src/index.ts`.
- To remove the DocRaptor test preview subpath, revert
  `packages/pdf-renderer/src/docraptor-preview.ts`,
  `packages/pdf-renderer/package.json`, `packages/pdf-renderer/tsdown.config.ts`,
  `packages/pdf-renderer/tsconfig.json`, and
  `packages/pdf-renderer/vitest.config.ts`.
- To remove test coverage, revert the Phase 12 additions in
  `packages/pdf-renderer/test/preview.spec.ts`,
  `packages/pdf-renderer/test/docraptor-preview.spec.ts`, and
  `packages/pdf-renderer/test/public-entry.spec.ts`.
- To revert documentation and tracker updates, restore
  `packages/pdf-renderer/readme.md`, `docs/roadmap.md`,
  `docs/decision-log.md`, `docs/package-boundaries.md`,
  `docs/package-strategy.md`, this note, and
  `openspec/changes/build-pdf-document-builder/tasks.md` to their prior
  Phase 12 entry state.
