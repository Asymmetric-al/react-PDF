# @asym/pdf-editor

Phase 16 editor package for the Asym PDF Document Builder React editor.

## Purpose

This package will own the PDF-first editor shell, TipTap/ProseMirror
extensions, document blocks, slash commands, inspector controls, preview
surfaces, and compatibility shims while the fork moves from email-first to
PDF-first.

## Public API Promise

The current public API is intentionally small:

- `pdfEditorBoundary`
- `PdfEditorBoundary`
- `PdfEditor`, `PdfEditorProps`, `PdfEditorRef`
- `DocumentEditor`, `DocumentEditorProps`, `DocumentEditorRef`
- `DocumentNode`
- `DocumentMark`
- `@asym/pdf-editor/extensions`
- `@asym/pdf-editor/react-email-compat`

The `extensions` subpath exports the Phase 15 variable chip extension and the
Phase 16 conditional section extension:

- `VariableChip`
- `createVariableChipExtension`
- `insertVariableChip` command types
- `getVariableChipPreview`
- `isKnownVariableChipKey`
- `ConditionalSection`
- `createConditionalSectionExtension`
- `insertConditionalSection` command types
- `getConditionalSectionPreview`
- `isValidConditionalRule`

Variable chips are structured inline atom nodes named `variable`. They store a
registry key plus optional formatter, fallback, and label attrs. The editor
renders them visibly as non-editable chips and preview display uses the shared
Phase 13 registry and Phase 14 resolver.

Conditional sections are structured block nodes named `conditionalSection`.
They store a `ConditionalRule` attr, preserve nested editor content, and render
deterministic `data-asym-conditional-section` attributes. Preview display uses
the shared Phase 16 condition evaluator; false conditions mark visibility but
do not delete nested editor JSON.

The `react-email-compat` subpath re-exports public `@react-email/editor`
primitives under explicit `Reference` names. These adapters are temporary and
exist so future PDF work can depend on a package boundary without duplicating
the upstream editor.

The Phase 08 document/PDF names are exact aliases for the current React Email
editor primitives. They are the future-facing import path, but they do not yet
change editor behavior or rendering output.

## Non-goals

- No PDF-native editor shell implementation in Phase 16.
- No source import rewrites inside `@react-email/editor`.
- No variable browser UI picker, condition builder UI, or inspector wiring.
- No default slash command wiring. The current slash command UI accepts
  caller-provided items, and a later editor shell can compose variable commands
  into that UI.
- No PDF renderer implementation in this package.
- No `DocumentTheming`; the branding/theme phase owns PDF-specific theme
  semantics.
- No DocRaptor credentials or server-side API calls.
- No tenant storage, auth, queue, or core app imports.

## Maturity

The package now has Phase 15 variable chip and Phase 16 conditional section
extension surfaces. The package is private to prevent accidental publication
while the editor API is still being designed, and Phase 16 does not change
`@react-email/editor` exports.

## Development

```sh
pnpm --filter @asym/pdf-editor build
pnpm --filter @asym/pdf-editor typecheck
pnpm --filter @asym/pdf-editor test
```

Later `Asymmetric-al/core` support may add Bun or different task runners, but
this fork follows the current pnpm, Turbo, TypeScript, Vitest, React Testing
Library, and tsdown toolchain first.
