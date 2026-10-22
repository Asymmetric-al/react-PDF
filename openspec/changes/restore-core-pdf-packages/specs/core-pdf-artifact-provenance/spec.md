# Delta for Core PDF artifact provenance

## ADDED Requirements

### Requirement: Reproducible maintained source

The five Core-consumed packages SHALL be built from committed source in their owner repository. Reconstructed source SHALL record immutable source artifacts, map/declaration provenance and hashes.

#### Scenario: Source is absent from the owner checkpoint

- GIVEN Core ships implementation beyond the available owner source
- WHEN packages are restored for modernization
- THEN shipped implementation is recovered before dependency changes
- AND erased declarations are explicitly distinguished from verbatim source recovery

### Requirement: Consumed behavior preservation

Modernization SHALL preserve consumed exports, document versions, deterministic calculation and rendering behavior, migration reports and server/client boundaries.

#### Scenario: Rebuild an existing financial document

- GIVEN a shipped annual statement, financial report or invoice fixture
- WHEN restored and upgraded packages parse, serialize and preview it
- THEN its normalized content and reviewed output match the shipped contract
- AND discrepancies block artifact import until reconciled through behavior tests

### Requirement: Controlled Core delivery

Core SHALL import versioned artifacts with source/build provenance after clean installation and relevant regression checks. Native-builder activation SHALL remain at its existing rollout setting.

#### Scenario: Compatibility installation repairs are retired

- GIVEN current artifacts have been built and tested from committed source
- WHEN Core installs from a clean checkout
- THEN supported package identities and imports resolve without the retired repair aliases
- AND existing templates and legacy/native engine selection remain functional
