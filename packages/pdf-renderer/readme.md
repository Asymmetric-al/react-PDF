# @asym/pdf-renderer

Phase 16 preview, variable resolution, and conditional rendering foundation for the Asym PDF Document
Builder print renderer.

## Purpose

This package owns deterministic document serialization, print-ready HTML,
paged-media CSS foundations, browser-safe preview helpers, server-only
DocRaptor test preview orchestration, renderer variable resolution adapters,
conditional section rendering, and renderer fixtures.

DocRaptor remains the production PDF fidelity target. Browser preview is fast
authoring feedback only and must never be treated as final PDF output.

## Public API Promise

The root package entry is browser-safe and intentionally does not import the
server-only DocRaptor client:

- `pdfRendererBoundary`
- `PdfRendererBoundary`
- `composePdfDocumentHtml`
- `ComposePdfDocumentHtmlInput`
- `ComposePdfDocumentHtmlResult`
- `PdfDocumentCssRequirement`
- `PdfDocumentRenderWarning`
- `PdfDocumentAssetReference`
- `PdfDocumentVariableUsage`
- `PdfDocumentNodeRenderer`
- `PdfDocumentMarkRenderer`
- `composePrintDocumentHtml`
- `ComposePrintDocumentHtmlInput`
- `ComposePrintDocumentHtmlResult`
- `PrintDocumentPageBox`
- `createBrowserPdfPreview`
- `CreateBrowserPdfPreviewRequest`
- `PdfPreviewResult`
- `PdfPreviewDiagnostic`
- `PdfPreviewPreflightHook`
- `PdfPreviewSnapshots`
- `PdfPreviewArtifact`
- `resolvePdfDocumentVariables`
- `ResolvePdfDocumentVariablesInput`
- `ResolvePdfDocumentVariablesResult`
- `evaluatePdfDocumentCondition`
- `EvaluatePdfDocumentConditionInput`
- `PdfDocumentConditionEvaluation`

The server-only DocRaptor test preview API is isolated behind:

```ts
import { createDocRaptorTestPdfPreview } from '@asym/pdf-renderer/docraptor-preview';
```

The subpath also exports `docraptorPreviewBoundary` so dependency inspectors can
see the server-only `@asym/docraptor-client` edge without treating the browser
safe root entry as a DocRaptor consumer.

Do not import `@asym/pdf-renderer/docraptor-preview` from browser code. The
subpath imports `@asym/docraptor-client`, which enforces a server-only runtime.

## Browser Preview

`createBrowserPdfPreview` validates a structured template with
`DocumentTemplateV1Schema`, serializes the template content with
`composePdfDocumentHtml`, wraps it with `composePrintDocumentHtml`, and returns
generated HTML/CSS snapshots plus structured diagnostics.

```ts
import { createBrowserPdfPreview } from '@asym/pdf-renderer';

const preview = await createBrowserPdfPreview({
  template,
  preflight: async () => [
    {
      code: 'custom_warning',
      message: 'Optional Phase 12 preview preflight warning.',
    },
  ],
});

if (preview.status !== 'error') {
  console.log(preview.snapshots.html);
  console.log(preview.snapshots.css);
}
```

Browser preview metadata always reports:

- `renderer: "browser"`
- `finalPdfFidelity: false`
- `productionRender: false`
- `docraptorTestMode: false`

The browser path does not mutate the caller's template object and does not
fetch real donor or financial data in Phase 12.

## Phase 14 Variable Resolution

`resolvePdfDocumentVariables` resolves the structured variable usages collected
by `composePdfDocumentHtml` against caller-provided data. It delegates to the
React-free resolver in `@asym/pdf-template-schema` and returns resolved display
values plus diagnostics. It does not mutate generated HTML and does not fetch
real donor, financial, tenant, or asset data.

```ts
import {
  composePdfDocumentHtml,
  resolvePdfDocumentVariables,
} from '@asym/pdf-renderer';

const serialized = composePdfDocumentHtml({ document: template.content });
const variables = resolvePdfDocumentVariables({
  context: sampleData,
  variables: serialized.variables,
});
```

## Phase 16 Conditional Sections

`composePdfDocumentHtml` accepts an optional `dataContext` and can render
structured `conditionalSection` nodes. Matching conditions render nested
content in a deterministic wrapper. False conditions omit nested content and
skip nested variable or asset collection. Missing condition context or invalid
rules render nested content with structured warnings so broken templates do not
silently hide author-authored content. When a context is present but a
condition field is missing, the renderer honors the evaluator's
`matched: false` result and omits the section with a warning so editor preview
and render output stay aligned.

The renderer delegates all rule evaluation to
`@asym/pdf-template-schema`. It does not evaluate arbitrary JavaScript and does
not perform string replacement.

## DocRaptor Test Preview

`createDocRaptorTestPdfPreview` lives in the server-only subpath. It uses the
same template validation, serializer, print shell, and optional preflight hook
as browser preview, then calls `@asym/docraptor-client` in `mode: "test"`.

```ts
import { createDocRaptorTestPdfPreview } from '@asym/pdf-renderer/docraptor-preview';

const preview = await createDocRaptorTestPdfPreview({
  apiKey: process.env.DOCRAPTOR_API_KEY ?? '',
  baseUrl: 'https://assets.example.test/documents/',
  template,
});

const pdf = preview.artifacts.find((artifact) => artifact.kind === 'pdf-bytes');
```

The DocRaptor test preview request sends `prince_options.media: "print"` and
includes `baseurl` when `baseUrl` is provided. Preview results expose sanitized
request metadata only; API keys are constructor input and are never serialized
into preview results.

DocRaptor test preview metadata reports:

- `renderer: "docraptor"`
- `finalPdfFidelity: true`
- `productionRender: false`
- `docraptorTestMode: true`
- `mayContainWatermark: true`

Test renders may be watermarked. Production rendering remains a later package
and platform integration concern.

## Phase 09 Behavior

The serializer walks nodes recursively and includes built-in renderers for
paragraphs, headings, links, images, buttons, columns, table nodes, and explicit
variable nodes. Unknown container nodes render their children with a warning.
Unknown leaf nodes are omitted with a warning.

Variable usage is collected only from structured variable nodes such as
`variable` or `variableReference`. Raw text like `{{ donor.name }}` is treated
as normal text in Phase 09.

## Phase 10 Behavior

The print shell supports Letter, A4, Legal, and custom page sizes; portrait and
landscape orientation; four-sided margins; escaped document titles; and
deterministic print CSS. Page settings are parsed through
`DocumentPageSettingsSchema` from `@asym/pdf-template-schema`.

DocRaptor compatibility notes:

- DocRaptor and Prince support `@page` for page size, orientation, and margins:
  https://docraptor.com/css-paged-media
- DocRaptor applies print media rules by default for PDF output:
  https://docraptor.com/documentation/api/parameters
- Page margins are CSS-driven and can reserve space for page-region content:
  https://docraptor.com/documentation/article/1067969-margins-bleed

## Non-goals

- No React editor UI.
- No product preview panel.
- No full Phase 25 preflight implementation.
- No production DocRaptor render orchestration.
- No real donor, ministry, financial, or tenant data fetching.
- No integrated header/footer system before Phase 21.
- No tenant storage, auth, queue, or core app imports.
- No string-replacement merge engine.
- No arbitrary JavaScript condition execution.

## Maturity

`phase-16-conditional-sections`. The package remains private to prevent accidental
publication while renderer contracts are still being built.

## Development

```sh
pnpm --filter @asym/pdf-renderer build
pnpm --filter @asym/pdf-renderer typecheck
pnpm --filter @asym/pdf-renderer test
```

Later `Asymmetric-al/core` support may add Bun or different task runners, but
this fork follows the current pnpm, Turbo, TypeScript, Vitest, and tsdown
toolchain first.
