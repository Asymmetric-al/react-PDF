import {
  DocumentTemplateV1Schema,
  type DocumentTemplateV1,
} from '@asym/pdf-template-schema';
import {
  composePdfDocumentHtml,
  type PdfDocumentCssRequirement,
  type PdfDocumentRenderWarning,
  type PdfDocumentRenderWarningCode,
} from './compose-pdf-document-html';
import { composePrintDocumentHtml } from './print-shell';

const printShellWarningCodes: ReadonlySet<PdfDocumentRenderWarningCode> =
  new Set(['invalid_page_settings']);

export type PdfPreviewMode = 'browser' | 'docraptor-test';
export type PdfPreviewStatus = 'success' | 'warning' | 'error';
export type PdfPreviewRenderer = 'browser' | 'docraptor';
export type PdfPreviewDiagnosticSource =
  | 'schema'
  | 'serializer'
  | 'print-shell'
  | 'preflight'
  | 'docraptor';
export type PdfPreviewDiagnosticSeverity = 'info' | 'warning' | 'error';
export type PdfPreviewArtifactKind =
  | 'pdf-bytes'
  | 'hosted-url'
  | 'adapter-reference';

export interface PdfPreviewDiagnostic {
  readonly source: PdfPreviewDiagnosticSource;
  readonly code: string;
  readonly severity: PdfPreviewDiagnosticSeverity;
  readonly message: string;
  readonly path: readonly string[];
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface PdfPreviewDiagnosticInput {
  readonly source?: PdfPreviewDiagnosticSource;
  readonly code: string;
  readonly severity?: PdfPreviewDiagnosticSeverity;
  readonly message: string;
  readonly path?: readonly string[];
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface PdfPreviewSnapshots {
  readonly html: string;
  readonly css: string;
  readonly bodyHtml: string;
  readonly cssRequirements: readonly PdfDocumentCssRequirement[];
}

export interface PdfPreviewArtifact {
  readonly kind: PdfPreviewArtifactKind;
  readonly mimeType: string;
  readonly bytes?: Uint8Array;
  readonly url?: string;
  readonly reference?: string;
  readonly sizeBytes?: number;
}

export interface PdfPreviewRequestMetadata {
  readonly url: string;
  readonly method: 'POST' | 'GET';
  readonly mode: string;
  readonly test: boolean;
  readonly media: string;
  readonly tag?: string;
}

export interface PdfPreviewMetadata {
  readonly renderer: PdfPreviewRenderer;
  readonly finalPdfFidelity: boolean;
  readonly productionRender: false;
  readonly docraptorTestMode: boolean;
  readonly mayContainWatermark: boolean;
  readonly message: string;
  readonly request?: PdfPreviewRequestMetadata;
}

export interface PdfPreviewPreflightInput {
  readonly template: DocumentTemplateV1;
  readonly mode: PdfPreviewMode;
  readonly previewId: string;
  readonly snapshots: PdfPreviewSnapshots;
}

export type PdfPreviewPreflightHook = (
  input: PdfPreviewPreflightInput,
) =>
  | readonly PdfPreviewDiagnosticInput[]
  | Promise<readonly PdfPreviewDiagnosticInput[]>;

export interface BasePdfPreviewRequest {
  readonly template: unknown;
  readonly previewId?: string;
  readonly title?: string;
  readonly preflight?: PdfPreviewPreflightHook;
  readonly now?: () => number;
}

export interface CreateBrowserPdfPreviewRequest extends BasePdfPreviewRequest {}

export interface PdfPreviewResult {
  readonly mode: PdfPreviewMode;
  readonly status: PdfPreviewStatus;
  readonly previewId: string;
  readonly durationMs: number;
  readonly snapshots?: PdfPreviewSnapshots;
  readonly artifacts: readonly PdfPreviewArtifact[];
  readonly diagnostics: readonly PdfPreviewDiagnostic[];
  readonly warnings: readonly PdfPreviewDiagnostic[];
  readonly errors: readonly PdfPreviewDiagnostic[];
  readonly metadata: PdfPreviewMetadata;
}

export interface PreparedPdfPreviewDocument {
  readonly ok: true;
  readonly template: DocumentTemplateV1;
  readonly previewId: string;
  readonly startedAt: number;
  readonly now: () => number;
  readonly snapshots: PdfPreviewSnapshots;
  readonly diagnostics: readonly PdfPreviewDiagnostic[];
}

export interface FailedPdfPreviewDocument {
  readonly ok: false;
  readonly result: PdfPreviewResult;
}

export type PdfPreviewDocumentPreparation =
  | PreparedPdfPreviewDocument
  | FailedPdfPreviewDocument;

export async function createBrowserPdfPreview(
  request: CreateBrowserPdfPreviewRequest,
): Promise<PdfPreviewResult> {
  const prepared = await preparePdfPreviewDocument(request, 'browser');

  if (!prepared.ok) {
    return prepared.result;
  }

  return createPdfPreviewResult({
    artifacts: [],
    diagnostics: prepared.diagnostics,
    durationMs: measureDuration(prepared.startedAt, prepared.now),
    metadata: createBrowserPreviewMetadata(),
    mode: 'browser',
    previewId: prepared.previewId,
    snapshots: prepared.snapshots,
  });
}

export async function preparePdfPreviewDocument(
  request: BasePdfPreviewRequest,
  mode: PdfPreviewMode,
): Promise<PdfPreviewDocumentPreparation> {
  const now = request.now ?? defaultNow;
  const startedAt = now();
  const templateParseResult = DocumentTemplateV1Schema.safeParse(
    request.template,
  );
  const previewId =
    request.previewId ??
    createDefaultPreviewId(
      mode,
      templateParseResult.success ? templateParseResult.data.id : undefined,
    );

  if (!templateParseResult.success) {
    const diagnostics = templateParseResult.error.issues.map((issue) => ({
      code: 'invalid_template',
      details: {
        issueCode: issue.code,
      },
      message: issue.message,
      path: issue.path.map(String),
      severity: 'error' as const,
      source: 'schema' as const,
    }));

    return {
      ok: false,
      result: createPdfPreviewResult({
        artifacts: [],
        diagnostics,
        durationMs: measureDuration(startedAt, now),
        metadata: createPreviewMetadata(mode),
        mode,
        previewId,
      }),
    };
  }

  const template = templateParseResult.data;
  const serializedDocument = composePdfDocumentHtml({
    document: template.content,
  });
  const printDocument = composePrintDocumentHtml({
    document: serializedDocument,
    pageSettings: template.pageSettings,
    title: request.title ?? template.name,
  });
  const snapshots: PdfPreviewSnapshots = {
    bodyHtml: serializedDocument.html,
    css: printDocument.css,
    cssRequirements: printDocument.cssRequirements,
    html: printDocument.html,
  };
  const diagnostics = [
    ...printDocument.warnings.map(convertRenderWarningToDiagnostic),
    ...(await runPreflight(request, template, mode, previewId, snapshots)),
  ];

  if (hasErrorDiagnostics(diagnostics)) {
    return {
      ok: false,
      result: createPdfPreviewResult({
        artifacts: [],
        diagnostics,
        durationMs: measureDuration(startedAt, now),
        metadata: createPreviewMetadata(mode),
        mode,
        previewId,
        snapshots,
      }),
    };
  }

  return {
    diagnostics,
    now,
    ok: true,
    previewId,
    snapshots,
    startedAt,
    template,
  };
}

export function createPdfPreviewResult(input: {
  readonly mode: PdfPreviewMode;
  readonly previewId: string;
  readonly durationMs: number;
  readonly diagnostics: readonly PdfPreviewDiagnostic[];
  readonly artifacts: readonly PdfPreviewArtifact[];
  readonly metadata: PdfPreviewMetadata;
  readonly snapshots?: PdfPreviewSnapshots;
}): PdfPreviewResult {
  const errors = input.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
  const warnings = input.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'warning',
  );

  return {
    artifacts: input.artifacts,
    diagnostics: input.diagnostics,
    durationMs: input.durationMs,
    errors,
    metadata: input.metadata,
    mode: input.mode,
    previewId: input.previewId,
    snapshots: input.snapshots,
    status: resolvePreviewStatus(warnings, errors),
    warnings,
  };
}

export function createBrowserPreviewMetadata(): PdfPreviewMetadata {
  return {
    docraptorTestMode: false,
    finalPdfFidelity: false,
    mayContainWatermark: false,
    message:
      'Browser preview is generated from print HTML/CSS for authoring feedback and is not final PDF fidelity.',
    productionRender: false,
    renderer: 'browser',
  };
}

export function createDocRaptorTestPreviewMetadata(
  request?: PdfPreviewRequestMetadata,
): PdfPreviewMetadata {
  return {
    docraptorTestMode: true,
    finalPdfFidelity: true,
    mayContainWatermark: true,
    message:
      'DocRaptor test preview uses the production PDF renderer path in test mode and may include a watermark.',
    productionRender: false,
    renderer: 'docraptor',
    ...(request ? { request } : {}),
  };
}

function createPreviewMetadata(mode: PdfPreviewMode): PdfPreviewMetadata {
  return mode === 'browser'
    ? createBrowserPreviewMetadata()
    : createDocRaptorTestPreviewMetadata();
}

function convertRenderWarningToDiagnostic(
  warning: PdfDocumentRenderWarning,
): PdfPreviewDiagnostic {
  const source = resolveRenderWarningSource(warning);

  return {
    code: warning.code,
    details: warning.details,
    message: warning.message,
    path: warning.path,
    severity: warning.severity,
    source,
  };
}

function resolveRenderWarningSource(
  warning: PdfDocumentRenderWarning,
): PdfPreviewDiagnosticSource {
  if (warning.source === 'print-shell' || warning.source === 'serializer') {
    return warning.source;
  }

  return printShellWarningCodes.has(warning.code)
    ? 'print-shell'
    : 'serializer';
}

async function runPreflight(
  request: BasePdfPreviewRequest,
  template: DocumentTemplateV1,
  mode: PdfPreviewMode,
  previewId: string,
  snapshots: PdfPreviewSnapshots,
): Promise<readonly PdfPreviewDiagnostic[]> {
  if (!request.preflight) {
    return [];
  }

  try {
    const diagnostics = await request.preflight({
      mode,
      previewId,
      snapshots,
      template,
    });

    return diagnostics.map((diagnostic) =>
      normalizeDiagnosticInput(diagnostic, 'preflight'),
    );
  } catch (error) {
    return [
      {
        code: 'preflight_failed',
        details: {
          errorName: error instanceof Error ? error.name : typeof error,
        },
        message:
          error instanceof Error
            ? error.message
            : 'Preview preflight failed before rendering.',
        path: [],
        severity: 'error',
        source: 'preflight',
      },
    ];
  }
}

export function normalizeDiagnosticInput(
  diagnostic: PdfPreviewDiagnosticInput,
  defaultSource: PdfPreviewDiagnosticSource,
): PdfPreviewDiagnostic {
  return {
    code: diagnostic.code,
    details: diagnostic.details,
    message: diagnostic.message,
    path: diagnostic.path ?? [],
    severity: diagnostic.severity ?? 'warning',
    source: diagnostic.source ?? defaultSource,
  };
}

function hasErrorDiagnostics(
  diagnostics: readonly PdfPreviewDiagnostic[],
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

function resolvePreviewStatus(
  warnings: readonly PdfPreviewDiagnostic[],
  errors: readonly PdfPreviewDiagnostic[],
): PdfPreviewStatus {
  if (errors.length > 0) {
    return 'error';
  }

  if (warnings.length > 0) {
    return 'warning';
  }

  return 'success';
}

function measureDuration(startedAt: number, now: () => number): number {
  return Math.max(0, now() - startedAt);
}

function defaultNow(): number {
  return Date.now();
}

function createDefaultPreviewId(
  mode: PdfPreviewMode,
  templateId: string | undefined,
): string {
  return `${mode}-${templateId ?? 'invalid-template'}`;
}
