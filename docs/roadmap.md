# PDF Document Builder Roadmap

The canonical phase list lives in
`openspec/changes/build-pdf-document-builder/tasks.md`. This document mirrors
that list with current phase status for handoff visibility.

| Phase | Name | Status | Primary Output |
|---:|---|---|---|
| 1 | Fork Baseline, Governance, and Product Charter | Complete; validation gaps recorded | `docs/asym-product-charter.md`, `docs/research-basis.md` |
| 2 | Monorepo Inventory and Isolation Map | Complete; validation recorded | `docs/monorepo-inventory.md`, `docs/editor-dependency-graph.md` |
| 3 | Package Boundary for @asym/pdf-editor and Related Packages | Complete; validation recorded | `packages/pdf-editor`, `packages/pdf-renderer` |
| 4 | Editor Boundary Isolation, Baseline Fixtures, and Regression Harness | Complete; validation recorded | `packages/editor/src/boundary`, baseline fixtures |
| 5 | Package Names, Export Strategy, and Compatibility Policy | Complete; validation recorded | `docs/package-strategy.md`, `scripts/asym-package-strategy-smoke.ts` |
| 6 | Create the PDF Template Schema Foundation | Complete; validation recorded | `packages/pdf-template-schema/src`, schema fixtures |
| 7 | Add Compatibility Fixtures and Regression Harness | Complete; validation recorded | Expanded `@react-email/editor` compatibility fixtures |
| 8 | Rename Public Concepts Safely from Email to Document | Complete; validation recorded | Compatibility aliases and migration docs |
| 9 | Build the Document Serializer Foundation | Complete; validation recorded | `packages/pdf-renderer/src/compose-pdf-document-html.ts` |
| 10 | Build the Print HTML Shell and Page Model | Complete; validation recorded | `packages/pdf-renderer/src/print-shell.ts` |
| 11 | Build the DocRaptor Client Package | Complete; validation recorded | `packages/docraptor-client/src` |
| 12 | Build Browser Preview and DocRaptor Preview Strategy | Complete; validation recorded | Preview package APIs |
| 13 | Build the Typed Variable Registry | Complete; validation recorded | `packages/pdf-template-schema/src/variables` |
| 14 | Build Variable Resolution, Formatter, and Fallback System | Complete; validation recorded | Shared resolver, formatter, and fallback modules |
| 15 | Build the Variable Chip Editor Extension | Complete; validation recorded | `packages/pdf-editor/src/extensions/variable` |
| 16 | Build Conditional Section Engine and Editor Extension | Complete; validation recorded | Conditional editor and renderer support |
| 17 | Build Repeater Extension and Scoped Data Resolver | Complete; validation recorded | Repeater editor and renderer support |
| 18 | Build Financial Data Table Block | Complete; validation recorded | Financial table node and renderer support |
| 19 | Build Financial Data Table Editor Extension | Complete; validation recorded | Data table editor extension hardening |
| 20 | Build Financial Data Table Renderer and Print Markup | Complete; validation recorded | Data table renderer hardening |
| 21 | Build Data Table End-to-End Preview Fixtures | Complete; validation recorded | Table fixture preview flow |
| 22 | Build Calculation Engine for Totals, Subtotals, and Grouping | Complete; validation recorded | Calculation contracts and helpers |
| 23 | Build Summary Blocks and Table Total Rendering | Next | Summary blocks and table totals |
| 24 | Build Form Field, Signature, and QR Placeholder Contracts | Not started | Placeholder contracts |
| 25 | Build Page Break and Keep-Together Controls | Not started | Page-flow controls and print CSS |
| 26 | Build Header and Footer System | Not started | Header/footer schema and serializer |
| 27 | Build Image and Asset Pipeline | Not started | PDF image model and asset adapters |
| 28 | Build Branding and Theme System | Not started | Document theme model and print tokens |
| 29 | Build Starter Templates and Golden Fixtures | Not started | Starter templates and golden fixtures |
| 30 | Build Preflight Validation | Not started | Preflight diagnostics |
| 31 | Build Render Logs, Artifact Metadata, and Audit Contracts | Not started | Render metadata and audit schemas |
| 32 | Build Template Lifecycle, Versioning, and Publishing Contracts | Not started | Template lifecycle and publishing contracts |
| 33 | Build Batch Generation Framework | Not started | Queue-agnostic batch framework |
| 34 | Build Async DocRaptor Rendering and Retry System | Not started | Async render and retry helpers |
| 35 | Build Playwright Local Fallback and Test Renderer | Not started | Local development/test renderer |
| 36 | Build Accessibility, Metadata, and PDF Profile Support | Not started | Metadata and PDF profile contracts |
| 37 | Build Security and Tenant Integration Contracts | Not started | Security and tenant adapter contracts |
| 38 | Build Unlayer Migration and Coexistence Path | Not started | Migration/coexistence contracts |
| 39 | Build `Asymmetric-al/core` Adapter Package and Feature Flag Contract | Not started | Core adapter contract |
| 40 | Build Documentation, Playground, and Developer Examples | Not started | PDF-first docs, examples, playground |
| 41 | Build Performance, Load, and Large Document Tests | Not started | Performance smoke and opt-in load tests |
| 42 | Build Release, Versioning, and API Stability Review | Not started | API stability and release readiness review |
| 43 | Run Security, Secret, and Browser Bundle Audit | Not started | Boundary and secret-safety audit |
| 44 | OpenSpec Current-State Reconciliation and Archive Readiness | Not started | OpenSpec alignment and archive-readiness notes |
| 45 | End-to-End Package Validation with Mocked Production Flows | Not started | Mocked package-level production-flow tests |
| 46 | `Asymmetric-al/core` Cutover Playbook and Integration PR Plan | Not started | Core cutover playbook |
| 47 | Production Hardening, Launch Readiness, and Final Package Sign-Off | Not started | Final package readiness report |

## Phase 23 Entry Point

Phase 22 is complete. Phase 17 added structured repeater resolution in
`@asym/pdf-template-schema`, repeater rendering and scoped variable metadata in
`@asym/pdf-renderer`, and a protected repeater section TipTap node in
`@asym/pdf-editor`. The completion handoff is recorded in
`docs/phase-17-completion-notes.md`.

Pre-Phase 18 reconciles the Phase 17 merge state, URL safety, deterministic
date parsing, and invalid external repeater binding diagnostics before
financial table work starts. The reconciliation handoff is recorded in
`docs/pre-phase-18-reconciliation.md`.

Phase 18 added table bindings and row resolution in
`@asym/pdf-template-schema`, a protected `dataTable` TipTap block in
`@asym/pdf-editor`, and deterministic data table rendering in
`@asym/pdf-renderer`. The completion handoff is recorded in
`docs/phase-18-completion-notes.md`.

Phase 20 started from the Phase 19 data table editor handoff, Phase 18
data table renderer artifacts, Phase 17 repeater engine, Phase 16 conditional
section engine, Phase 15 variable chip extension, Phase 14 resolver, Phase 13
registry, Phase 12 preview foundation,
Phase 11 DocRaptor client, Phase 10 print shell and page model, Phase 9
document serializer foundation, Phase 8 naming compatibility aliases, Phase 7
compatibility harness, Phase 6 schema foundation, Phase 5 package strategy, and
Phase 4 editor boundary artifacts:

- `docs/package-strategy.md`
- `docs/package-boundaries.md`
- `docs/editor-package-isolation.md`
- `docs/phase-8-completion-notes.md`
- `docs/phase-9-completion-notes.md`
- `docs/phase-10-completion-notes.md`
- `docs/phase-11-completion-notes.md`
- `docs/phase-12-completion-notes.md`
- `docs/phase-13-completion-notes.md`
- `docs/phase-14-completion-notes.md`
- `docs/phase-15-completion-notes.md`
- `docs/phase-16-completion-notes.md`
- `docs/phase-17-completion-notes.md`
- `docs/phase-18-completion-notes.md`
- `docs/phase-19-completion-notes.md`
- `docs/phase-7-completion-notes.md`
- `docs/phase-6-completion-notes.md`
- `openspec/changes/build-pdf-document-builder/tasks.md`
- `packages/docraptor-client/src/client.ts`
- `packages/docraptor-client/test/docraptor-client.spec.ts`
- `packages/docraptor-client/readme.md`
- `packages/pdf-renderer/src/print-shell.ts`
- `packages/pdf-renderer/src/preview.ts`
- `packages/pdf-renderer/src/docraptor-preview.ts`
- `packages/pdf-renderer/test/preview.spec.ts`
- `packages/pdf-renderer/test/docraptor-preview.spec.ts`
- `packages/pdf-renderer/test/print-shell.spec.ts`
- `packages/pdf-renderer/test/variable-registry-import.spec.ts`
- `packages/pdf-renderer/src/variables.ts`
- `packages/pdf-renderer/src/conditions.ts`
- `packages/pdf-renderer/src/repeaters.ts`
- `packages/pdf-renderer/src/data-table.ts`
- `packages/pdf-renderer/test/conditional-section.spec.ts`
- `packages/pdf-renderer/test/repeater-section.spec.ts`
- `packages/pdf-renderer/test/data-table.spec.ts`
- `packages/pdf-renderer/test/variable-resolution.spec.ts`
- `packages/pdf-renderer/src/compose-pdf-document-html.ts`
- `packages/pdf-renderer/test/compose-pdf-document-html.spec.ts`
- `packages/pdf-editor/src/index.ts`
- `packages/pdf-editor/src/extensions/variable`
- `packages/pdf-editor/src/extensions/conditional-section`
- `packages/pdf-editor/src/extensions/repeater`
- `packages/pdf-editor/src/extensions/data-table`
- `packages/pdf-editor/test/variable-chip-extension.spec.tsx`
- `packages/pdf-editor/test/conditional-section-extension.spec.tsx`
- `packages/pdf-editor/test/repeater-extension.spec.tsx`
- `packages/pdf-editor/test/data-table-extension.spec.tsx`
- `packages/pdf-editor/test/document-naming-compatibility.spec.tsx`
- `packages/editor/src/compatibility`
- `packages/pdf-template-schema`
- `packages/pdf-template-schema/src/conditions.ts`
- `packages/pdf-template-schema/src/repeaters.ts`
- `packages/pdf-template-schema/src/tables.ts`
- `packages/pdf-template-schema/src/formatters.ts`
- `packages/pdf-template-schema/src/variable-resolution.ts`
- `packages/pdf-template-schema/test/variable-resolution.spec.ts`
- `packages/pdf-template-schema/test/repeater-resolution.spec.ts`
- `packages/pdf-template-schema/test/table-resolution.spec.ts`
- `packages/pdf-editor`
- `packages/pdf-renderer`
- `packages/docraptor-client`
- `packages/editor/package.json`

Phase 19 audited, hardened, and formally completed the TipTap-facing data
table editor extension. It preserved the Phase 18 custom atom node approach,
added binding-ID-only coverage, preserved invalid-preview `bindingId`
attribution, updated editor boundary maturity metadata, and kept the editor
surface free of renderer, DocRaptor, calculation, and aggregation imports. The
completion handoff is recorded in `docs/phase-19-completion-notes.md`.

Phase 20 audited, hardened, and formally completed the data table renderer and
print markup surface. It locked semantic table markup, repeated headers, empty
states, row limit warnings, missing/non-array source diagnostics, formatter
diagnostics, deterministic snapshots, and the continued absence of financial
calculations. The completion handoff is recorded in
`docs/phase-20-completion-notes.md`.

Totals, subtotals, grouping calculations, and summary rendering are split
across Phases 22 and 23. Until Phase 23 renders calculated values into
documents, table totals remain declarative placeholders and arbitrary
JavaScript must never be evaluated in template logic.

Phase 21 connected the table schema, editor node, renderer, browser preview,
and mocked DocRaptor preview into deterministic end-to-end fixtures without
adding calculation behavior or real network calls. Its completion handoff is
recorded in `docs/phase-21-completion-notes.md`.

Phase 22 built deterministic calculation primitives for totals, subtotals, and
grouping on top of the Phase 21 fixtures while preserving the same
no-arbitrary-JavaScript and deterministic-output constraints. The completion
handoff is recorded in `docs/phase-22-completion-notes.md`.

Phase 23 should expose summary block declarations and render table total rows
from the Phase 22 calculation contracts without moving calculation logic into
arbitrary template expressions.
