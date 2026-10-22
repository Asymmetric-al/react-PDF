import { readFileSync } from 'node:fs';
import * as renderer from '@asym/pdf-renderer';
import type { VariableDataContext } from '@asym/pdf-template-schema';
import * as schema from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

interface CapturedFixture {
  readonly category: string;
  readonly input: {
    readonly template: unknown;
    readonly dataContext: VariableDataContext;
  };
  readonly normalized: unknown;
  readonly document: unknown;
  readonly printed: unknown;
  readonly preview: unknown;
}

const captured: {
  readonly exports: {
    readonly schema: readonly string[];
    readonly renderer: readonly string[];
  };
  readonly fixtures: readonly CapturedFixture[];
} = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/maintenance/core-pdf-modernization/shipped-contracts.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

function jsonContract(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe('independently shipped Core PDF contracts', () => {
  it('retains every consumed schema and browser-renderer export', () => {
    expect(Object.keys(schema)).toEqual(
      expect.arrayContaining([...captured.exports.schema]),
    );
    expect(Object.keys(renderer)).toEqual(
      expect.arrayContaining([...captured.exports.renderer]),
    );
  });

  for (const fixture of captured.fixtures) {
    it(`round-trips the shipped ${fixture.category} document`, async () => {
      const template = schema.DocumentTemplateV1Schema.parse(
        fixture.input.template,
      );
      expect(jsonContract(template)).toEqual(fixture.normalized);
      const input = { template, dataContext: fixture.input.dataContext };
      const document = renderer.composePdfDocumentHtml({
        document: template.content,
        assetReferences: template.assets,
        assetRenderMode: 'browser_preview',
        dataContext: fixture.input.dataContext,
        placeholderBindings: template.placeholderBindings,
        repeaterBindings: template.repeaterBindings,
        summaryBlockBindings: template.summaryBlockBindings,
        tableBindings: template.tableBindings,
      });
      expect(document.html.length).toBeGreaterThan(100);
      expect(document.warnings).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'invalid_document' }),
        ]),
      );
      expect(jsonContract(document)).toEqual(fixture.document);
      const printed = renderer.composePrintDocumentHtml({
        title: template.name,
        document,
        pageSettings: template.pageSettings,
        theme: template.theme,
        metadata: template.pdfSettings?.metadata,
      });
      expect(jsonContract(printed)).toEqual(fixture.printed);
      const preview = await renderer.createBrowserPdfPreview({
        ...input,
        previewId: `core-shipped-${fixture.category}`,
        now: () => 0,
      });
      expect(jsonContract(preview)).toEqual(fixture.preview);
      expect(preview.status).toBe('success');
    });
  }
});
