import {
  composePdfDocumentHtml,
  composePrintDocumentHtml,
  createBrowserPdfPreview,
  evaluatePdfDocumentCondition,
  type PdfRendererBoundary,
  pdfRendererBoundary,
  resolvePdfDocumentRepeaterItems,
  resolvePdfDocumentTableRows,
  resolvePdfDocumentVariables,
} from '@asym/pdf-renderer';
import { describe, expect, it } from 'vitest';

describe('@asym/pdf-renderer public entry', () => {
  it('exposes the Phase 3 package boundary', () => {
    const boundary: PdfRendererBoundary = pdfRendererBoundary;

    expect(boundary).toEqual({
      packageName: '@asym/pdf-renderer',
      maturity: 'phase-18-financial-data-table',
      owns: 'print-renderer',
      runtime: 'browser-safe-root-with-server-subpath',
      consumes: ['@asym/pdf-template-schema'],
    });
  });

  it('exposes the Phase 09 document serializer foundation', () => {
    expect(composePdfDocumentHtml).toBeDefined();
  });

  it('exposes the Phase 10 print shell foundation', () => {
    expect(composePrintDocumentHtml).toBeDefined();
  });

  it('exposes the Phase 12 browser-safe preview foundation', () => {
    expect(createBrowserPdfPreview).toBeDefined();
  });

  it('exposes the Phase 14 variable resolution adapter', () => {
    expect(resolvePdfDocumentVariables).toBeDefined();
  });

  it('exposes the Phase 16 conditional section adapter', () => {
    expect(evaluatePdfDocumentCondition).toBeDefined();
  });

  it('exposes the Phase 17 repeater adapter', () => {
    expect(resolvePdfDocumentRepeaterItems).toBeDefined();
  });

  it('exposes the Phase 18 data table adapter', () => {
    expect(resolvePdfDocumentTableRows).toBeDefined();
  });

  it('exposes Phase 17 scoped variable metadata through the serializer result', () => {
    const result = composePdfDocumentHtml({
      dataContext: {
        donations: [{ amount: 25 }],
      },
      document: {
        content: [
          {
            attrs: {
              binding: {
                id: 'donation-rows',
                itemAlias: 'donation',
                sourcePath: 'donations',
              },
            },
            content: [
              {
                content: [
                  {
                    attrs: { key: 'donation.amount' },
                    type: 'variable',
                  },
                ],
                type: 'paragraph',
              },
            ],
            type: 'repeater',
          },
        ],
        type: 'doc',
      },
    });

    expect(result.variables[0]?.scopes).toMatchObject([
      {
        itemAlias: 'donation',
        sourcePath: 'donations',
      },
    ]);
  });
});
