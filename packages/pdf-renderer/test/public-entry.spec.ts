import {
  composePdfDocumentHtml,
  composePrintDocumentHtml,
  createBrowserPdfPreview,
  type PdfRendererBoundary,
  pdfRendererBoundary,
} from '@asym/pdf-renderer';
import { describe, expect, it } from 'vitest';

describe('@asym/pdf-renderer public entry', () => {
  it('exposes the Phase 3 package boundary', () => {
    const boundary: PdfRendererBoundary = pdfRendererBoundary;

    expect(boundary).toEqual({
      packageName: '@asym/pdf-renderer',
      maturity: 'phase-12-preview',
      owns: 'print-renderer',
      runtime: 'browser-safe-root-with-server-subpath',
      consumes: ['@asym/pdf-template-schema', '@asym/docraptor-client'],
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
});
