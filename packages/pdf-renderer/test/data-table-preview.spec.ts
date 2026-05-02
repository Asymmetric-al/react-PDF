import {
  composePdfDocumentHtml,
  createBrowserPdfPreview,
} from '@asym/pdf-renderer';
import { createDocRaptorTestPdfPreview } from '@asym/pdf-renderer/docraptor-preview';
import { DocumentTemplateV1Schema } from '@asym/pdf-template-schema';
import { describe, expect, it, vi } from 'vitest';
import {
  annualGivingStatementTablePreviewFixture,
  invoiceTablePreviewFixture,
  tablePreviewFixtures,
} from '../../pdf-template-schema/test/fixtures/table-preview-fixtures';

type FetchCall = {
  readonly url: string;
  readonly init: RequestInit;
  readonly payload: Record<string, unknown>;
};

type MockFetch = ((
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>) & {
  readonly calls: FetchCall[];
};

const mockCredential = 'phase-21-docraptor-mock-value';
const pdfBytes = new Uint8Array([37, 80, 68, 70, 45, 50, 49]);

describe('Phase 21 data table end-to-end preview fixtures', () => {
  it('renders deterministic table fixture body HTML without calculations', () => {
    for (const fixture of tablePreviewFixtures) {
      const template = DocumentTemplateV1Schema.parse(fixture.template);
      const firstResult = composePdfDocumentHtml({
        dataContext: fixture.dataContext,
        document: template.content,
        tableBindings: template.tableBindings,
      });
      const secondResult = composePdfDocumentHtml({
        dataContext: fixture.dataContext,
        document: template.content,
        tableBindings: template.tableBindings,
      });

      expect(firstResult.warnings).toEqual([]);
      expect(secondResult.html).toBe(firstResult.html);
      expect(firstResult.html).toContain('data-asym-data-table="true"');
      expect(firstResult.html).toContain('pdf-data-table-header');
      expect(firstResult.html).toContain(
        `data-table-binding-id="${fixture.tableBindingId}"`,
      );

      for (const expectedText of [
        ...fixture.expectedCellText,
        ...fixture.expectedPlaceholderText,
      ]) {
        expect(firstResult.html).toContain(expectedText);
      }

      for (const calculatedText of fixture.unexpectedCalculatedText) {
        expect(firstResult.html).not.toContain(calculatedText);
      }
    }
  });

  it('creates deterministic browser previews with fixture table rows', async () => {
    for (const fixture of tablePreviewFixtures) {
      const firstResult = await createBrowserPdfPreview({
        dataContext: fixture.dataContext,
        now: createStepClock(),
        template: fixture.template,
      });
      const secondResult = await createBrowserPdfPreview({
        dataContext: fixture.dataContext,
        now: createStepClock(),
        template: fixture.template,
      });

      expect(firstResult).toMatchObject({
        mode: 'browser',
        status: 'success',
      });
      expect(firstResult.diagnostics).toEqual([]);
      expect(firstResult.snapshots).toEqual(secondResult.snapshots);
      expect(firstResult.snapshots?.bodyHtml).toContain(
        `data-table-binding-id="${fixture.tableBindingId}"`,
      );

      for (const expectedText of fixture.expectedCellText) {
        expect(firstResult.snapshots?.bodyHtml).toContain(expectedText);
      }
    }
  });

  it('propagates table source warnings into browser preview diagnostics', async () => {
    const result = await createBrowserPdfPreview({
      dataContext: {
        donations: {
          invalid: true,
        },
      },
      template: annualGivingStatementTablePreviewFixture.template,
    });

    expect(result.status).toBe('warning');
    expect(result.snapshots?.bodyHtml).toContain(
      'No gifts were recorded for this statement period.',
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'non_array_table_source',
        details: expect.objectContaining({
          actualType: 'object',
          bindingId: annualGivingStatementTablePreviewFixture.tableBindingId,
          sourcePath: 'donations',
        }),
        severity: 'warning',
        source: 'serializer',
      }),
    );
  });

  it('does not mutate table fixture templates during preview', async () => {
    for (const fixture of tablePreviewFixtures) {
      const before = JSON.stringify(fixture.template);

      await createBrowserPdfPreview({
        dataContext: fixture.dataContext,
        template: fixture.template,
      });

      expect(JSON.stringify(fixture.template)).toBe(before);
    }
  });

  it('creates a mocked DocRaptor table preview without real network calls or API key leakage', async () => {
    const fetch = createMockFetch([pdfResponse()]);

    const result = await createDocRaptorTestPdfPreview({
      apiKey: mockCredential,
      dataContext: invoiceTablePreviewFixture.dataContext,
      fetch,
      now: createStepClock(),
      previewId: 'phase-21-docraptor-invoice-table',
      template: invoiceTablePreviewFixture.template,
    });

    expect(result).toMatchObject({
      mode: 'docraptor-test',
      previewId: 'phase-21-docraptor-invoice-table',
      status: 'success',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0]?.payload).toMatchObject({
      document_content: result.snapshots?.html,
      tag: 'phase-21-docraptor-invoice-table',
      test: true,
      type: 'pdf',
    });
    expect(String(fetch.calls[0]?.payload.document_content)).toContain(
      'Program design',
    );
    expect(result.artifacts).toEqual([
      {
        bytes: pdfBytes,
        kind: 'pdf-bytes',
        mimeType: 'application/pdf',
        sizeBytes: pdfBytes.byteLength,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain(mockCredential);
  });
});

function createMockFetch(responses: readonly Response[]): MockFetch {
  const queue = [...responses];
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const requestInit = init ?? {};
    const payload =
      typeof requestInit.body === 'string'
        ? (JSON.parse(requestInit.body) as Record<string, unknown>)
        : {};

    calls.push({
      init: requestInit,
      payload,
      url: String(input),
    });

    const response = queue.shift();

    if (!response) {
      throw new Error('No mock response queued.');
    }

    return response;
  }) as unknown as MockFetch;

  Object.defineProperty(fetchMock, 'calls', {
    value: calls,
  });

  return fetchMock;
}

function pdfResponse(): Response {
  return new Response(pdfBytes, {
    headers: {
      'content-type': 'application/pdf',
    },
    status: 200,
  });
}

function createStepClock(): () => number {
  let now = 210;

  return () => {
    const current = now;
    now += 5;

    return current;
  };
}
