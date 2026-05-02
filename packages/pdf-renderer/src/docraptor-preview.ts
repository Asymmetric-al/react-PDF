import {
  createDocRaptorClient,
  type DocRaptorClientConfig,
  DocRaptorClientError,
  type DocRaptorFetch,
  type DocRaptorRequestMetadata,
} from '@asym/docraptor-client';
import {
  type BasePdfPreviewRequest,
  createDocRaptorTestPreviewMetadata,
  createPdfPreviewResult,
  normalizeDiagnosticInput,
  type PdfPreviewDiagnostic,
  type PdfPreviewRequestMetadata,
  type PdfPreviewResult,
  preparePdfPreviewDocument,
} from './preview';

export type DocRaptorPreviewPackageName =
  '@asym/pdf-renderer/docraptor-preview';
export type DocRaptorPreviewMaturity = 'phase-21-data-table-preview-fixtures';
export type DocRaptorPreviewRuntime = 'server-only';
export type DocRaptorPreviewOwnership = 'docraptor-test-preview';

export interface DocRaptorPreviewBoundary {
  readonly packageName: DocRaptorPreviewPackageName;
  readonly maturity: DocRaptorPreviewMaturity;
  readonly owns: DocRaptorPreviewOwnership;
  readonly runtime: DocRaptorPreviewRuntime;
  readonly consumes: readonly [
    '@asym/pdf-template-schema',
    '@asym/docraptor-client',
  ];
}

export const docraptorPreviewBoundary: DocRaptorPreviewBoundary = {
  packageName: '@asym/pdf-renderer/docraptor-preview',
  maturity: 'phase-21-data-table-preview-fixtures',
  owns: 'docraptor-test-preview',
  runtime: 'server-only',
  consumes: ['@asym/pdf-template-schema', '@asym/docraptor-client'],
};

export interface CreateDocRaptorTestPdfPreviewRequest
  extends BasePdfPreviewRequest {
  readonly apiKey: string;
  readonly fetch?: DocRaptorFetch;
  readonly apiBaseUrl?: string;
  readonly statusBaseUrl?: string;
  readonly defaultTimeoutMs?: number;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly baseUrl?: string;
  readonly name?: string;
  readonly tag?: string;
}

export async function createDocRaptorTestPdfPreview(
  request: CreateDocRaptorTestPdfPreviewRequest,
): Promise<PdfPreviewResult> {
  const prepared = await preparePdfPreviewDocument(request, 'docraptor-test');

  if (!prepared.ok) {
    return prepared.result;
  }

  try {
    const client = createDocRaptorClient(createClientConfig(request));
    const renderResult = await client.renderSync({
      baseUrl: request.baseUrl,
      html: prepared.snapshots.html,
      media: 'print',
      name: request.name ?? prepared.template.name,
      signal: request.signal,
      tag: request.tag ?? prepared.previewId,
      timeoutMs: request.timeoutMs,
    });

    return createPdfPreviewResult({
      artifacts: [
        {
          bytes: renderResult.pdf,
          kind: 'pdf-bytes',
          mimeType: renderResult.contentType,
          sizeBytes: renderResult.pdf.byteLength,
        },
      ],
      diagnostics: prepared.diagnostics,
      durationMs: measureDuration(prepared.startedAt, prepared.now),
      metadata: createDocRaptorTestPreviewMetadata(
        sanitizeRequestMetadata(renderResult.request),
      ),
      mode: 'docraptor-test',
      previewId: prepared.previewId,
      snapshots: prepared.snapshots,
    });
  } catch (error) {
    const diagnostics = [
      ...prepared.diagnostics,
      normalizeDocRaptorError(error),
    ];

    return createPdfPreviewResult({
      artifacts: [],
      diagnostics,
      durationMs: measureDuration(prepared.startedAt, prepared.now),
      metadata: createDocRaptorTestPreviewMetadata(),
      mode: 'docraptor-test',
      previewId: prepared.previewId,
      snapshots: prepared.snapshots,
    });
  }
}

function createClientConfig(
  request: CreateDocRaptorTestPdfPreviewRequest,
): DocRaptorClientConfig {
  return {
    apiKey: request.apiKey,
    apiBaseUrl: request.apiBaseUrl,
    defaultTimeoutMs: request.defaultTimeoutMs,
    fetch: request.fetch,
    mode: 'test',
    statusBaseUrl: request.statusBaseUrl,
  };
}

function sanitizeRequestMetadata(
  request: DocRaptorRequestMetadata,
): PdfPreviewRequestMetadata {
  return {
    media: request.media,
    method: request.method,
    mode: request.mode,
    tag: request.tag,
    test: request.test,
    url: request.url,
  };
}

function normalizeDocRaptorError(error: unknown): PdfPreviewDiagnostic {
  if (error instanceof DocRaptorClientError) {
    return normalizeDiagnosticInput(
      {
        code: `docraptor_${error.code}`,
        details: {
          retryable: error.retryable,
          status: error.status,
        },
        message: error.message,
        severity: 'error',
      },
      'docraptor',
    );
  }

  return normalizeDiagnosticInput(
    {
      code: 'docraptor_unknown_error',
      message:
        error instanceof Error
          ? error.message
          : 'DocRaptor test preview failed.',
      severity: 'error',
    },
    'docraptor',
  );
}

function measureDuration(startedAt: number, now: () => number): number {
  return Math.max(0, now() - startedAt);
}
