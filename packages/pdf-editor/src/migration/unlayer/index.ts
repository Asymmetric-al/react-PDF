import type { PdfEditorPackageName } from '../../index';

export interface UnlayerMigrationBoundary {
  readonly packageName: PdfEditorPackageName;
  readonly sourceEngine: 'unlayer';
  readonly strategy: 'manual_rebuild_with_report';
  readonly targetEngine: 'asym_pdf_document_builder';
}

export const unlayerMigrationBoundary: UnlayerMigrationBoundary = {
  packageName: '@asym/pdf-editor',
  sourceEngine: 'unlayer',
  strategy: 'manual_rebuild_with_report',
  targetEngine: 'asym_pdf_document_builder',
};

export {
  type CreateUnlayerMigrationReportInput,
  createUnlayerMigrationReport,
  type LegacyPdfTemplateArtifact,
  LegacyPdfTemplateArtifactSchema,
  type LegacyPdfTemplateReference,
  LegacyPdfTemplateReferenceSchema,
  type PdfBuilderFeatureFlagContract,
  PdfBuilderFeatureFlagContractSchema,
  type PdfTemplateEngineSelectionResult,
  PdfTemplateEngineSelectionResultSchema,
  selectPdfTemplateEngine,
  type UnlayerComparisonDifference,
  UnlayerComparisonDifferenceSchema,
  type UnlayerHtmlImportRequest,
  UnlayerHtmlImportRequestSchema,
  type UnlayerMigrationReportV1,
  UnlayerMigrationReportV1Schema,
  type UnlayerSideBySideComparisonAdapter,
  type UnlayerSideBySideComparisonRequest,
  UnlayerSideBySideComparisonRequestSchema,
  type UnlayerSideBySideComparisonResult,
  UnlayerSideBySideComparisonResultSchema,
  type UnlayerUnsupportedFeature,
  UnlayerUnsupportedFeatureSchema,
} from '@asym/pdf-template-schema';
