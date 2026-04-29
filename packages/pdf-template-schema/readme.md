# @asym/pdf-template-schema

Phase 14 schema, typed variable registry, and variable resolution foundation
for the Asym PDF Document Builder.

## Purpose

This package owns shared document template types, runtime schema, versioning
primitives, variable domains, variable resolution and formatting, page
settings, asset references, render metadata, batch metadata, and
audit-oriented model types.

Phase 14 adds React-free variable resolution, formatter, and fallback behavior
on top of the typed nonprofit document variable registry. The registry and
resolver can be imported by the schema package, renderer, preview, future
preflight, and future `Asymmetric-al/core` adapter code without pulling editor
UI or DocRaptor behavior into browser bundles.

## Public API Promise

The public API is the shared schema contract for later editor, renderer,
DocRaptor, batch, and core-adapter phases. Runtime schemas and inferred
TypeScript types are exported together:

- `pdfTemplateSchemaBoundary`
- `PdfTemplateSchemaBoundary`
- `DocumentTemplateV1Schema` / `DocumentTemplateV1`
- `DocumentPageSettingsSchema` / `DocumentPageSettings`
- `DocumentThemeSchema` / `DocumentTheme`
- `VariableDefinitionSchema` / `VariableDefinition`
- `RegistryVariableDefinitionSchema` / `RegistryVariableDefinition`
- `createVariableRegistry`
- `coreVariableDefinitions`
- `coreVariableRegistry`
- `VariableRegistry`
- `VariableRegistryError`
- `createVariableResolver`
- `resolveVariableValue`
- `resolveVariableValues`
- `formatVariableValue`
- `getValueAtDataPath`
- `defaultVariableFormatters`
- `VariableResolver`
- `ResolvedVariableValue`
- `VariableResolutionDiagnostic`
- `VariableReferenceSchema` / `VariableReference`
- `DataBindingSchema` / `DataBinding`
- `ConditionalRuleSchema` / `ConditionalRule`
- `RepeaterBindingSchema` / `RepeaterBinding`
- `TableBindingSchema` / `TableBinding`
- `AssetReferenceSchema` / `AssetReference`
- `RenderRequestSchema` / `RenderRequest`
- `RenderResultSchema` / `RenderResult`
- `RenderWarningSchema` / `RenderWarning`
- `RenderErrorSchema` / `RenderError`
- `RenderJobV1Schema` / `RenderJobV1`
- `BatchRunV1Schema` / `BatchRunV1`
- `DocumentArtifactSchema` / `DocumentArtifact`
- `AuditEventSchema` / `AuditEvent`

Zod is the runtime validation library for Phase 6 because it is already in the
workspace catalog and supports TypeScript inference plus future JSON Schema
conversion.

The Phase 13 registry covers `organization`, `recipient`, `donation`,
`document`, `missionary`, `tax_receipt`, `financial_report`, `statement`,
`invoice`, `asset`, and `computed` groups. Registry definitions include stable
keys, labels, descriptions, value types, sample values, required flags,
fallback behavior, formatter hints, privacy classification, source paths, and
document categories.

Sample data is deterministic and uses fictional values only:

```ts
import {
  coreVariableRegistry,
  resolveVariableValue,
} from '@asym/pdf-template-schema';

const sampleData = coreVariableRegistry.createSampleData('donation_receipt');
const requiredVariables = coreVariableRegistry.listRequired('donation_receipt');
const unknownKeys = coreVariableRegistry.detectUnknownKeys([
  'recipient.full_name',
  'unknown.merge_tag',
]);
const recipientName = resolveVariableValue({
  context: sampleData,
  key: 'recipient.full_name',
});
```

The Phase 14 resolver uses deterministic defaults: `en-US`, `USD`, and `UTC`.
It supports nested source paths, required and optional diagnostics, fallback
values, formatter overrides, type validation, and display formatting for
currency, dates, date ranges, numbers, percentages, addresses, receipt and
invoice numbers, fiscal periods, booleans, URLs, and image URLs.

Missing values are paths that are not found or values that are `null` or
`undefined`. Missing required variables produce errors. Missing optional
variables produce warnings and may use fallback values when the registry
definition allows it.

## Non-goals

- No PDF editor UI.
- No DocRaptor API calls.
- No browser-only APIs.
- No tenant storage, auth, or queue integration.
- No print HTML serialization.
- No starter template exports; Phase 24 owns starter templates and golden
  fixtures.
- No editor variable chip extension; Phase 15 owns editor insertion and chip
  behavior.
- No arbitrary JavaScript template logic.
- No substitution of variable nodes into rendered HTML; later renderer,
  preview, and preflight phases decide where resolved values are applied.

## Maturity

`phase-14-variable-resolution`. The package is private to prevent accidental
publication while the shared model is still evolving.

## Development

```sh
pnpm --filter @asym/pdf-template-schema build
pnpm --filter @asym/pdf-template-schema typecheck
pnpm --filter @asym/pdf-template-schema test
```

Later `Asymmetric-al/core` support may add Bun or different task runners, but
this fork follows the current pnpm, Turbo, TypeScript, Vitest, and tsdown
toolchain first.
