# Source restoration and qualification

The pre-restoration owner head is 5ce8e68b96e5316a410ca1bd81a500cf511e7894. The immutable artifact reference is Core 11d7f936a9b8bda796680027941a4e457ac15c9f, under vendor/react-pdf-packages. No Core artifact or rollout flag changes during source recovery.

Implementation recovery validates each source map and records artifact SHA-256, map path/index, source path and recovered-source SHA-256. Duplicate source entries must agree; paths cannot escape their package. Fifty-three implementation files are recovered verbatim. Erased DocRaptor types come from the shipped declaration region, with an explicitly reconstructed internal request interface based on the existing source and shipped assignments. Export-only editor entries are reconciled against shipped declarations; the existing React Email compatibility entry is retained.

Before restoration, the existing four-package source cohort builds and tests successfully. Independently captured shipped contracts record 208 schema exports, 11 renderer exports, eight DocRaptor exports and five adapter exports. Eight synthetic starter categories retain normalized templates, serializer results, complete print output and fixed-clock browser previews. These are local package contracts, not DocRaptor production-fidelity claims.

The five private packages remain in this pnpm monorepo. Upstream React Email workspaces and existing tests stay available. Public wrapper aliases remain where consumed. Core's installation-repair aliases may be removed only after rebuilt package manifests and clean Core installation prove they are unnecessary. Browser-safe exports must not import server renderer or credential-bearing modules.

Dependency qualification refreshes official registry metadata, pins exact tested versions, tests compatibility through public APIs and freezes artifact provenance. Current research targets include React Email editor 1.7.14, Tiptap 3.32.0, Zod 4.6.7 and current renderer/build/browser tooling. Those values remain research targets until tested. Package-manager/tooling changes remain scoped to reproducible maintenance of the consumed packages.
