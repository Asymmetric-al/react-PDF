# Core PDF package modernization

The restored five-package cohort is versioned at `0.1.0`. Local installation,
package builds, native TypeScript checks, unit tests, real Chromium editor and
retained document print contracts pass. Owner PR/CI, final source reproduction,
versioned artifact ingestion and Core deployment qualification remain open.
The existing native-builder rollout setting stays disabled.

Use Node 24.22.1 and the exact pnpm 12.14.0 release recorded with integrity in
`package.json`. Install with `pnpm install --frozen-lockfile`. Run
`pnpm core-pdf:check`, `pnpm core-pdf:reproduce`, `pnpm core-pdf:browser` and
`pnpm core-pdf:render`.
Chromium is installed with `pnpm --filter @asym/pdf-editor exec playwright install chromium`.
These are maintenance checks; they make no live DocRaptor calls.

The current cohort uses React 19.3.1, React Email 6.11.3, its public editor 1.7.14,
Tiptap 3.32.0 and Zod 4.6.7. Product typechecks use TypeScript 7.0.2. The current
declaration builder needs the supported TypeScript 6.0.3 JavaScript AST API;
explicit ownership, physical-identity tests and its recheck condition are in
[dependency-qualification.json](dependency-qualification.json).

## Source and contract provenance

Restoration commit `ca79063bd679599573a2eba563dcfa9a304e8605` reconstructs Core's
shipped implementation from committed source maps and its missing erased types
from shipped declarations. [source-provenance.json](source-provenance.json) and
[qualification.json](qualification.json) preserve that baseline. Existing upstream
source and tests remain. The historical 47-phase roadmap is not marked complete.

[shipped-contracts.json](shipped-contracts.json) is the schema-version-2 capture
from the independently shipped Core renderer. Its eight categories preserve
exports, document schemas, browser bodies, print HTML and CSS. The superseded
first direct-composer harness used the wrong input envelope; baseline evidence
records that correction. Formatting commit
`e5d92073ffdcabbe09178f4e98407700c1a4ceca` preserves parsed JSON values and the
Markdown structure, YAML metadata and executable example structure; original
bytes remain in Git. See [formatting-preservation.json](formatting-preservation.json).

## Qualified behavior and limits

The actual editor accepts keyboard formatting, respects read-only mode and
round-trips custom nodes. A browser regression exposed page-break HTML being
parsed as a generic horizontal rule; the specific rule now precedes it while
ordinary rules retain their behavior. One physical Tiptap/ProseMirror runtime
is verified through real document and mutation-step operations.

All eight retained synthetic document categories render locally. All nine
printed pages were visually inspected and have zero out-of-page characters.
The serializer deliberately retains placeholders; the public variable resolver
is checked separately. Three labelled local assets stand in for fixture URLs;
other network requests fail the check. Chromium is not Prince/DocRaptor page
counter or production-fidelity qualification. Live provider boundaries remain
mocked, and Core still owns authentication, tenant context and authorization.

The fresh audit has zero production advisories on consumed package paths.
The full owner workspace still has advisories in untouched legacy applications;
this maintenance result does not qualify that separate graph or downstream Core.
The [active maintenance change](../../../openspec/changes/restore-core-pdf-packages/proposal.md)
limits work to Core's consumed functionality. Final committed-source artifact
reproduction, owner review/CI, Core ingestion, clean installation and deployed
checks remain required.

## Reproducible declaration builds

The schema declaration builder uses its source-only `tsconfig.build.json` and
the supported whole-project `build: true, incremental: false` mode. This avoids
per-module declaration generation producing different Zod property/union order
across processes. Runtime schemas and JavaScript stay unchanged. Product checks
still include tests under the regular TypeScript 7 configuration.

`core-pdf:reproduce` forces three complete build/pack rounds and compares each
of the five tarballs byte for byte. It also rejects source-tree changes from
declaration emission. Independent clean-checkout reproduction remains part of
release qualification; three runs in one checkout alone do not prove that.
