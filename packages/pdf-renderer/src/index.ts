import type { PdfTemplateSchemaBoundary } from '@asym/pdf-template-schema';

export type PdfRendererPackageName = '@asym/pdf-renderer';
export type PdfRendererMaturity = 'phase-16-conditional-sections';
export type PdfRendererRuntime = 'browser-safe-root-with-server-subpath';
export type PdfRendererOwnership = 'print-renderer';

export interface PdfRendererBoundary {
  readonly packageName: PdfRendererPackageName;
  readonly maturity: PdfRendererMaturity;
  readonly owns: PdfRendererOwnership;
  readonly runtime: PdfRendererRuntime;
  readonly consumes: readonly [PdfTemplateSchemaBoundary['packageName']];
}

export const pdfRendererBoundary: PdfRendererBoundary = {
  packageName: '@asym/pdf-renderer',
  maturity: 'phase-16-conditional-sections',
  owns: 'print-renderer',
  runtime: 'browser-safe-root-with-server-subpath',
  consumes: ['@asym/pdf-template-schema'],
};

export {
  type ComposePdfDocumentHtmlInput,
  type ComposePdfDocumentHtmlResult,
  composePdfDocumentHtml,
  type PdfDocumentAssetReference,
  type PdfDocumentCssMedia,
  type PdfDocumentCssRequirement,
  type PdfDocumentMark,
  type PdfDocumentMarkRenderer,
  type PdfDocumentMarkRendererContext,
  type PdfDocumentNodeRenderer,
  type PdfDocumentNodeRendererContext,
  type PdfDocumentRenderWarning,
  type PdfDocumentRenderWarningCode,
  type PdfDocumentRenderWarningSeverity,
  type PdfDocumentRenderWarningSource,
  type PdfDocumentVariableUsage,
} from './compose-pdf-document-html';
export {
  type EvaluatePdfDocumentConditionInput,
  evaluatePdfDocumentCondition,
  type PdfDocumentConditionEvaluation,
} from './conditions';
export {
  type BasePdfPreviewRequest,
  type CreateBrowserPdfPreviewRequest,
  createBrowserPdfPreview,
  type PdfPreviewArtifact,
  type PdfPreviewArtifactKind,
  type PdfPreviewDiagnostic,
  type PdfPreviewDiagnosticInput,
  type PdfPreviewDiagnosticSeverity,
  type PdfPreviewDiagnosticSource,
  type PdfPreviewMetadata,
  type PdfPreviewMode,
  type PdfPreviewPreflightHook,
  type PdfPreviewPreflightInput,
  type PdfPreviewRenderer,
  type PdfPreviewRequestMetadata,
  type PdfPreviewResult,
  type PdfPreviewSnapshots,
  type PdfPreviewStatus,
} from './preview';
export {
  type ComposePrintDocumentHtmlInput,
  type ComposePrintDocumentHtmlResult,
  composePrintDocumentHtml,
  type PrintDocumentPageBox,
} from './print-shell';
export {
  type ResolvePdfDocumentVariablesInput,
  type ResolvePdfDocumentVariablesResult,
  resolvePdfDocumentVariables,
} from './variables';
