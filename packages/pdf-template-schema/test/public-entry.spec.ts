import {
  coreVariableDefinitions,
  coreVariableRegistry,
  createVariableResolver,
  DocumentPageSettingsSchema,
  DocumentTemplateV1Schema,
  defaultVariableFormatters,
  formatVariableValue,
  type PdfTemplateSchemaBoundary,
  pdfTemplateSchemaBoundary,
  RegistryVariableDefinitionSchema,
  RenderRequestSchema,
  resolveVariableValue,
} from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

describe('@asym/pdf-template-schema public entry', () => {
  it('exposes the Phase 13 package boundary', () => {
    const boundary: PdfTemplateSchemaBoundary = pdfTemplateSchemaBoundary;

    expect(boundary).toEqual({
      packageName: '@asym/pdf-template-schema',
      maturity: 'phase-14-variable-resolution',
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
    expect(createVariableResolver).toBeDefined();
    expect(resolveVariableValue).toBeDefined();
    expect(formatVariableValue).toBeDefined();
    expect(defaultVariableFormatters).toHaveProperty('currency.usd');
  });
});
