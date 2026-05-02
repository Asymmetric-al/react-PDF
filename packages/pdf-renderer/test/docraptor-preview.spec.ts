import {
  createDocRaptorTestPdfPreview,
  docraptorPreviewBoundary,
} from '@asym/pdf-renderer/docraptor-preview';
import { describe, expect, it, vi } from 'vitest';
import { donationReceiptTemplate } from './fixtures/templates';

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

const apiKey = 'phase_12_docraptor_api_key';
const pdfBytes = new Uint8Array([37, 80, 68, 70]);

describe('Phase 12 DocRaptor test PDF preview', () => {
  it('exposes a server-only subpath boundary', () => {
    expect(docraptorPreviewBoundary).toEqual({
      packageName: '@asym/pdf-renderer/docraptor-preview',
      maturity: 'phase-21-data-table-preview-fixtures',
      owns: 'docraptor-test-preview',
      runtime: 'server-only',
      consumes: ['@asym/pdf-template-schema', '@asym/docraptor-client'],
    });
  });

  it('uses DocRaptor test mode and returns PDF bytes as an artifact', async () => {
    const fetch = createMockFetch([pdfResponse()]);

    const result = await createDocRaptorTestPdfPreview({
      apiKey,
      baseUrl: 'https://assets.example.test/documents/',
      fetch,
      now: createStepClock(),
      template: donationReceiptTemplate,
    });

    expect(result).toMatchObject({
      mode: 'docraptor-test',
      previewId: 'docraptor-test-template-donation-receipt',
      status: 'success',
    });
    expect(result.durationMs).toBe(5);
    expect(fetch.calls).toHaveLength(1);
    expect(fetch.calls[0]?.payload).toMatchObject({
      document_content: result.snapshots?.html,
      name: 'Donation Receipt',
      prince_options: {
        baseurl: 'https://assets.example.test/documents/',
        media: 'print',
      },
      tag: 'docraptor-test-template-donation-receipt',
      test: true,
      type: 'pdf',
    });
    expect(result.artifacts).toEqual([
      {
        bytes: pdfBytes,
        kind: 'pdf-bytes',
        mimeType: 'application/pdf',
        sizeBytes: pdfBytes.byteLength,
      },
    ]);
    expect(result.metadata).toMatchObject({
      docraptorTestMode: true,
      finalPdfFidelity: true,
      mayContainWatermark: true,
      productionRender: false,
      renderer: 'docraptor',
      request: {
        media: 'print',
        mode: 'test',
        test: true,
      },
    });
  });

  it('includes baseurl only when a base URL is provided', async () => {
    const fetch = createMockFetch([pdfResponse()]);

    await createDocRaptorTestPdfPreview({
      apiKey,
      fetch,
      template: donationReceiptTemplate,
    });

    const princeOptions = fetch.calls[0]?.payload.prince_options as
      | Record<string, unknown>
      | undefined;

    expect(princeOptions).toEqual({
      media: 'print',
    });
  });

  it('normalizes DocRaptor errors into structured preview errors', async () => {
    const fetch = createMockFetch([
      jsonResponse({ error: `Invalid credentials for ${apiKey}` }, 401),
    ]);

    const result = await createDocRaptorTestPdfPreview({
      apiKey,
      fetch,
      template: donationReceiptTemplate,
    });

    expect(result.status).toBe('error');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'docraptor_docraptor_error',
        severity: 'error',
        source: 'docraptor',
      }),
    );
    expect(JSON.stringify(result)).not.toContain(apiKey);
  });

  it('does not include the API key in successful serialized preview results', async () => {
    const fetch = createMockFetch([pdfResponse()]);

    const result = await createDocRaptorTestPdfPreview({
      apiKey,
      fetch,
      template: donationReceiptTemplate,
    });

    expect(JSON.stringify(result)).not.toContain(apiKey);
  });

  it('prevents DocRaptor calls when schema validation fails', async () => {
    const fetch = createMockFetch([pdfResponse()]);

    const result = await createDocRaptorTestPdfPreview({
      apiKey,
      fetch,
      template: { id: 'not-a-template' },
    });

    expect(result.status).toBe('error');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'invalid_template',
        source: 'schema',
      }),
    );
    expect(fetch.calls).toHaveLength(0);
  });

  it('prevents DocRaptor calls when preview preflight returns errors', async () => {
    const fetch = createMockFetch([pdfResponse()]);

    const result = await createDocRaptorTestPdfPreview({
      apiKey,
      fetch,
      preflight: () => [
        {
          code: 'phase_12_preflight_error',
          message: 'Preview preflight blocked DocRaptor test rendering.',
          severity: 'error',
        },
      ],
      template: donationReceiptTemplate,
    });

    expect(result.status).toBe('error');
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'phase_12_preflight_error',
        source: 'preflight',
      }),
    );
    expect(fetch.calls).toHaveLength(0);
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
      throw new Error('No mock response queued');
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

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
    },
    status,
  });
}

function createStepClock(): () => number {
  let now = 20;

  return () => {
    const current = now;
    now += 5;

    return current;
  };
}
