import * as renderer from '@asym/pdf-renderer';
import {
  createBrowserPdfPreview,
  type PdfPreviewPreflightHook,
} from '@asym/pdf-renderer';
import { describe, expect, it, vi } from 'vitest';
import { donationReceiptTemplate } from './fixtures/templates';

describe('Phase 12 browser PDF preview', () => {
  it('creates a browser preview from a valid template fixture', async () => {
    const result = await createBrowserPdfPreview({
      now: createStepClock(),
      template: donationReceiptTemplate,
    });

    expect(result).toMatchObject({
      mode: 'browser',
      previewId: 'browser-template-donation-receipt',
      status: 'success',
    });
    expect(result.durationMs).toBe(5);
    expect(result.snapshots?.html).toContain('<!doctype html>');
    expect(result.snapshots?.html).toContain('Donation Receipt');
    expect(result.snapshots?.css).toContain('@page');
    expect(result.artifacts).toEqual([]);
  });

  it('marks browser preview metadata as non-final PDF fidelity', async () => {
    const result = await createBrowserPdfPreview({
      template: donationReceiptTemplate,
    });

    expect(result.metadata).toMatchObject({
      docraptorTestMode: false,
      finalPdfFidelity: false,
      mayContainWatermark: false,
      productionRender: false,
      renderer: 'browser',
    });
    expect(result.metadata.message).toContain('not final PDF fidelity');
  });

  it('includes generated HTML and CSS snapshots', async () => {
    const result = await createBrowserPdfPreview({
      template: donationReceiptTemplate,
    });

    expect(result.snapshots?.bodyHtml).toContain('Donation Receipt');
    expect(result.snapshots?.cssRequirements.map((item) => item.id)).toEqual([
      'phase-09-document-serializer',
      'phase-10-print-shell',
    ]);
    expect(result.snapshots?.html).toContain('<style>');
  });

  it('carries serializer warnings into preview diagnostics', async () => {
    const templateWithUnknownNode = {
      ...donationReceiptTemplate,
      content: {
        type: 'doc',
        content: [
          ...donationReceiptTemplate.content.content,
          {
            type: 'unknownPreviewLeaf',
          },
        ],
      },
    };

    const result = await createBrowserPdfPreview({
      template: templateWithUnknownNode,
    });

    expect(result.status).toBe('warning');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'unsupported_node',
        severity: 'warning',
        source: 'serializer',
      }),
    );
  });

  it('carries optional preflight warnings without implementing full preflight', async () => {
    const preflight: PdfPreviewPreflightHook = vi.fn((input) => {
      expect(input.mode).toBe('browser');
      expect(input.snapshots.html).toContain('<!doctype html>');

      return [
        {
          code: 'phase_12_preview_preflight_warning',
          message: 'Optional Phase 12 preview preflight warning.',
        },
      ];
    });

    const result = await createBrowserPdfPreview({
      preflight,
      template: donationReceiptTemplate,
    });

    expect(result.status).toBe('warning');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'phase_12_preview_preflight_warning',
        severity: 'warning',
        source: 'preflight',
      }),
    );
    expect(preflight).toHaveBeenCalledTimes(1);
  });

  it('returns structured schema errors for invalid templates', async () => {
    const result = await createBrowserPdfPreview({
      template: { id: 'not-a-template' },
    });

    expect(result.status).toBe('error');
    expect(result.snapshots).toBeUndefined();
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_template',
          severity: 'error',
          source: 'schema',
        }),
      ]),
    );
  });

  it('does not mutate the caller template object', async () => {
    const before = JSON.stringify(donationReceiptTemplate);

    await createBrowserPdfPreview({
      template: donationReceiptTemplate,
    });

    expect(JSON.stringify(donationReceiptTemplate)).toBe(before);
  });

  it('keeps the root renderer entry free of DocRaptor preview helpers', () => {
    expect(renderer).not.toHaveProperty('createDocRaptorTestPdfPreview');
  });

  it('can import the root renderer entry in a browser-like runtime', async () => {
    vi.resetModules();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {},
    });

    try {
      const browserLikeRenderer = await import('@asym/pdf-renderer');

      expect(browserLikeRenderer.createBrowserPdfPreview).toBeDefined();
      expect(browserLikeRenderer).not.toHaveProperty(
        'createDocRaptorTestPdfPreview',
      );
    } finally {
      Reflect.deleteProperty(globalThis, 'window');
      Reflect.deleteProperty(globalThis, 'document');
      vi.resetModules();
    }
  });
});

function createStepClock(): () => number {
  let now = 10;

  return () => {
    const current = now;
    now += 5;

    return current;
  };
}
