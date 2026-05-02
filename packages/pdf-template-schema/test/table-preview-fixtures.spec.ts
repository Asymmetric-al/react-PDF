import {
  DocumentTemplateV1Schema,
  resolveTableRows,
} from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';
import { tablePreviewFixtures } from './fixtures/table-preview-fixtures';

describe('Phase 21 data table preview fixtures', () => {
  it('parses annual giving, invoice, and financial report table templates', () => {
    const parsedTemplates = tablePreviewFixtures.map((fixture) =>
      DocumentTemplateV1Schema.parse(fixture.template),
    );

    expect(parsedTemplates.map((template) => template.category)).toEqual([
      'annual_giving_statement',
      'invoice',
      'financial_report',
    ]);
    expect(
      parsedTemplates.map((template) => template.tableBindings[0]?.id),
    ).toEqual(tablePreviewFixtures.map((fixture) => fixture.tableBindingId));
  });

  it('resolves fixture rows without diagnostics or calculated totals', () => {
    for (const fixture of tablePreviewFixtures) {
      const template = DocumentTemplateV1Schema.parse(fixture.template);
      const binding = template.tableBindings[0];

      expect(binding?.id).toBe(fixture.tableBindingId);

      if (!binding) {
        throw new Error(`Missing table binding for ${fixture.id}.`);
      }

      const result = resolveTableRows({
        binding,
        context: fixture.dataContext,
      });
      const resolvedDisplayText = result.rows
        .flatMap((row) => row.cells.map((cell) => cell.displayValue))
        .join('\n');

      expect(result.diagnostics).toEqual([]);
      expect(result.rows).toHaveLength(fixture.expectedRowCount);
      expect(result.totalPlaceholders).toEqual(binding.totals);

      for (const expectedText of fixture.expectedCellText) {
        expect(resolvedDisplayText).toContain(expectedText);
      }

      for (const calculatedText of fixture.unexpectedCalculatedText) {
        expect(resolvedDisplayText).not.toContain(calculatedText);
      }
    }
  });
});
