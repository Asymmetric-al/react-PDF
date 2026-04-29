import {
  coreVariableDefinitions,
  coreVariableRegistry,
  DocumentPageSettingsSchema,
  DocumentTemplateV1Schema,
  type PdfTemplateSchemaBoundary,
  pdfTemplateSchemaBoundary,
  RegistryVariableDefinitionSchema,
  RenderRequestSchema,
} from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

describe('@asym/pdf-template-schema public entry', () => {
  it('exposes the Phase 13 package boundary', () => {
    const boundary: PdfTemplateSchemaBoundary = pdfTemplateSchemaBoundary;

    expect(boundary).toEqual({
      packageName: '@asym/pdf-template-schema',
      maturity: 'phase-13-variable-registry',
      owns: 'template-schema',
      runtime: 'shared',
    });
  });

  it('exposes runtime schemas from the root entry point', () => {
    expect(DocumentTemplateV1Schema).toBeDefined();
    expect(DocumentPageSettingsSchema).toBeDefined();
    expect(RenderRequestSchema).toBeDefined();
    expect(RegistryVariableDefinitionSchema).toBeDefined();
    expect(coreVariableDefinitions.length).toBeGreaterThan(0);
    expect(coreVariableRegistry.get('organization.name')).toBeDefined();
  });
});
