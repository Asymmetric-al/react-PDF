# Core PDF package modernization

Status: source recovery and baseline qualification in progress. The original product roadmap remains historical intent; this maintenance change preserves the functionality Core already consumes and does not activate rollout.

The source and artifact baseline are recorded in source-provenance.json and qualification.json. shipped-contracts.json was captured directly from installed Core artifacts, with every loaded entry verified against the committed vendor copy. Eight synthetic document categories produced successful fixed-clock browser previews. Browser output is not DocRaptor production-fidelity proof.

The baseline owner checkpoint passes frozen pnpm 10.33.0 installation without lock drift, all seven consumed build/dependency tasks, and all four existing PDF package test tasks. Dependency upgrades have not started. See the active OpenSpec change at openspec/changes/restore-core-pdf-packages.

## Reconstructed baseline qualification

Before dependency changes, all five consumed packages pass 36 files / 220 cases (zero cache hits), all five package typechecks, and the eight required build tasks. Original implementation files remain byte-identical to their source-map recovery; only erased declarations and export wiring were reconstructed. The original external lock graph and upstream workspace importers are preserved; frozen offline installation succeeds.

The first capture harness used preview-style input for the direct serializer, yielding an empty direct body. Schema-version-2 capture corrects that layer through the unchanged shipped artifact, requires nonempty output, and matches the eight existing browser-preview bodies, print HTML and CSS exactly. Original normalized templates, public exports and full browser previews are unchanged. The superseded capture hash and private temporary evidence location are recorded explicitly; it is not an active acceptance baseline.

The adapter suite preserves disabled native-editor selection, respects host authorization denials before work, blocks failed production preflight, and makes no live provider calls. Core owns authenticated tenant context and tenant-bound template repositories; portable document metadata cannot supply tenant identity. Existing phase tests retain their case counts while reconciling assertions with the already-shipped calculations, pagination and accessibility behavior.

Dependency modernization, formatting/lint, final browser/provider qualification and immutable artifact ingestion remain open. This restoration does not mark the historical 47-phase product roadmap complete.
