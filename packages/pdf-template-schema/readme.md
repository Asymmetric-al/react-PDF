# @asym/pdf-template-schema

Phase 13 schema and typed variable registry foundation for the Asym PDF
Document Builder.

## Purpose

This package owns shared document template types, runtime schema, versioning
primitives, variable domains, page settings, asset references, render metadata,
batch metadata, and audit-oriented model types.

Phase 13 adds the typed nonprofit document variable registry. The registry is
React-free and can be imported by the schema package, renderer, preview,
future preflight, and future `Asymmetric-al/core` adapter code without pulling
editor UI or DocRaptor behavior into browser bundles.

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
import { coreVariableRegistry } from '@asym/pdf-template-schema';

const sampleData = coreVariableRegistry.createSampleData('donation_receipt');
const requiredVariables = coreVariableRegistry.listRequired('donation_receipt');
const unknownKeys = coreVariableRegistry.detectUnknownKeys([
  'recipient.full_name',
  'unknown.merge_tag',
]);
```

## Non-goals

- No PDF editor UI.
- No DocRaptor API calls.
- No browser-only APIs.
- No tenant storage, auth, or queue integration.
- No print HTML serialization.
- No starter template exports; Phase 24 owns starter templates and golden
  fixtures.
- No variable resolution, formatting, or fallback rendering; Phase 14 owns
  those behaviors.
- No editor variable chip extension; Phase 15 owns editor insertion and chip
  behavior.

## Maturity

`phase-13-variable-registry`. The package is private to prevent accidental
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
