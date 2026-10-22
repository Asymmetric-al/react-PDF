# Restore and modernize Core's consumed PDF packages

## Why

Core consumes five 0.0.0 artifact packages whose shipped behavior extends beyond this repository's Phase 22 source. Updating that older source would remove shipped features. The approved Core modernization requires reproducible maintained source before changing dependencies.

## Changes

Recover the shipped implementation from Core's committed source maps, reconstruct erased type and re-export declarations with explicit provenance, and preserve the five existing package boundaries. Freeze current shipped exports, schemas and eight document-category outputs as the regression baseline. Upgrade the consumed dependency/build cohort only after restored-source baseline qualification, then rebuild versioned artifacts for Core.

This maintenance change supersedes the old source checkpoint only for restoration and qualification of functionality already consumed by Core. It does not mark the original 47 product phases complete, activate the native builder, implement new product features, or authorize production/provider execution.

## Acceptance

Every consumed export and supported document version remains usable. Structured variables, conditionals, repeaters, calculations, tables, page controls, migration reports and server-only DocRaptor boundaries survive. pnpm installation, builds, typechecks, unit/browser/render regressions and source/artifact provenance pass with exact tested versions. Core imports only artifacts built from committed reviewed source.
