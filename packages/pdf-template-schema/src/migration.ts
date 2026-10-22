import { z } from 'zod';
import { TemplateCategorySchema } from './categories';
import {
  IdentifierSchema,
  IsoDateTimeSchema,
  JsonObjectSchema,
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
} from './primitives';
import { DocumentArtifactLocationSchema } from './rendering';
import { DocumentEngineSchema } from './template';

export const LegacyPdfTemplateArtifactSchema = z
  .object({
    artifactId: IdentifierSchema,
    location: DocumentArtifactLocationSchema.optional(),
    createdAt: IsoDateTimeSchema.optional(),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type LegacyPdfTemplateArtifact = z.infer<
  typeof LegacyPdfTemplateArtifactSchema
>;
export type LegacyPdfTemplateArtifactInput = z.input<
  typeof LegacyPdfTemplateArtifactSchema
>;

export const LegacyPdfTemplateReferenceSchema = z
  .object({
    engine: z.literal('unlayer'),
    legacyTemplateId: IdentifierSchema,
    tenantId: IdentifierSchema.optional(),
    name: NonEmptyStringSchema,
    category: TemplateCategorySchema.optional(),
    sourceSystem: NonEmptyStringSchema.default('unlayer'),
    designJsonRef: NonEmptyStringSchema.optional(),
    htmlArtifactRef: NonEmptyStringSchema.optional(),
    pdfArtifacts: z.array(LegacyPdfTemplateArtifactSchema).default([]),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type LegacyPdfTemplateReference = z.infer<
  typeof LegacyPdfTemplateReferenceSchema
>;
export type LegacyPdfTemplateReferenceInput = z.input<
  typeof LegacyPdfTemplateReferenceSchema
>;

export const UnlayerUnsupportedFeatureCodeSchema = z.enum([
  'custom_javascript',
  'custom_css',
  'dynamic_data_source',
  'ecommerce_block',
  'external_font',
  'form_submission',
  'provider_specific_asset',
  'raw_html_block',
  'unsupported_merge_tag',
  'unknown_block',
  'video_block',
]);

export type UnlayerUnsupportedFeatureCode = z.infer<
  typeof UnlayerUnsupportedFeatureCodeSchema
>;

export const UnlayerMigrationSeveritySchema = z.enum([
  'info',
  'warning',
  'error',
]);

export type UnlayerMigrationSeverity = z.infer<
  typeof UnlayerMigrationSeveritySchema
>;

export const UnlayerUnsupportedFeatureSchema = z
  .object({
    code: UnlayerUnsupportedFeatureCodeSchema,
    severity: UnlayerMigrationSeveritySchema.default('warning'),
    message: NonEmptyStringSchema,
    path: z.array(NonEmptyStringSchema).default([]),
    suggestedManualAction: NonEmptyStringSchema.optional(),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type UnlayerUnsupportedFeature = z.infer<
  typeof UnlayerUnsupportedFeatureSchema
>;
export type UnlayerUnsupportedFeatureInput = z.input<
  typeof UnlayerUnsupportedFeatureSchema
>;

export const UnlayerMigrationStrategySchema = z.enum([
  'manual_rebuild_with_report',
  'html_import_report_only',
  'side_by_side_review',
]);

export type UnlayerMigrationStrategy = z.infer<
  typeof UnlayerMigrationStrategySchema
>;

export const UnlayerMigrationStatusSchema = z.enum([
  'ready_for_manual_rebuild',
  'needs_manual_rebuild',
  'blocked',
  'completed',
]);

export type UnlayerMigrationStatus = z.infer<
  typeof UnlayerMigrationStatusSchema
>;

export const UnlayerMigrationReportV1Schema = z
  .object({
    version: z.literal(1).default(1),
    id: IdentifierSchema,
    legacyTemplate: LegacyPdfTemplateReferenceSchema,
    targetEngine: z
      .literal('asym_pdf_document_builder')
      .default('asym_pdf_document_builder'),
    strategy: UnlayerMigrationStrategySchema.default(
      'manual_rebuild_with_report',
    ),
    status: UnlayerMigrationStatusSchema,
    unsupportedFeatures: z.array(UnlayerUnsupportedFeatureSchema).default([]),
    unsupportedFeatureCount: NonNegativeIntegerSchema,
    createdAt: IsoDateTimeSchema.optional(),
    createdByActorId: IdentifierSchema.optional(),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type UnlayerMigrationReportV1 = z.infer<
  typeof UnlayerMigrationReportV1Schema
>;
export type UnlayerMigrationReportV1Input = z.input<
  typeof UnlayerMigrationReportV1Schema
>;

export interface CreateUnlayerMigrationReportInput {
  readonly id: string;
  readonly legacyTemplate: LegacyPdfTemplateReferenceInput;
  readonly unsupportedFeatures?: readonly UnlayerUnsupportedFeatureInput[];
  readonly strategy?: UnlayerMigrationStrategy;
  readonly status?: UnlayerMigrationStatus;
  readonly createdAt?: string;
  readonly createdByActorId?: string;
  readonly metadata?: Record<string, unknown>;
}

export function createUnlayerMigrationReport(
  input: CreateUnlayerMigrationReportInput,
): UnlayerMigrationReportV1 {
  const legacyTemplate = LegacyPdfTemplateReferenceSchema.parse(
    input.legacyTemplate,
  );
  const unsupportedFeatures = z
    .array(UnlayerUnsupportedFeatureSchema)
    .parse(input.unsupportedFeatures ?? []);
  const status = input.status ?? inferMigrationStatus(unsupportedFeatures);

  return UnlayerMigrationReportV1Schema.parse({
    version: 1,
    id: input.id,
    legacyTemplate,
    targetEngine: 'asym_pdf_document_builder',
    strategy: input.strategy ?? 'manual_rebuild_with_report',
    status,
    unsupportedFeatures,
    unsupportedFeatureCount: unsupportedFeatures.length,
    createdAt: input.createdAt,
    createdByActorId: input.createdByActorId,
    metadata: input.metadata ?? {},
  });
}

function inferMigrationStatus(
  unsupportedFeatures: readonly UnlayerUnsupportedFeature[],
): UnlayerMigrationStatus {
  if (unsupportedFeatures.length === 0) {
    return 'ready_for_manual_rebuild';
  }

  if (
    unsupportedFeatures.some((feature) => feature.severity === 'error') ||
    unsupportedFeatures.some((feature) => feature.severity === 'warning')
  ) {
    return 'needs_manual_rebuild';
  }

  return 'ready_for_manual_rebuild';
}

export const UnlayerHtmlImportRequestSchema = z
  .object({
    legacyTemplate: LegacyPdfTemplateReferenceSchema,
    html: NonEmptyStringSchema,
    mode: z.literal('report_only').default('report_only'),
    claimsLosslessConversion: z.literal(false).default(false),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type UnlayerHtmlImportRequest = z.infer<
  typeof UnlayerHtmlImportRequestSchema
>;
export type UnlayerHtmlImportRequestInput = z.input<
  typeof UnlayerHtmlImportRequestSchema
>;

export const PdfBuilderFeatureFlagRolloutModeSchema = z.enum([
  'legacy_only',
  'native_preview',
  'native_new_templates',
  'native_publish',
  'native_batch',
]);

export type PdfBuilderFeatureFlagRolloutMode = z.infer<
  typeof PdfBuilderFeatureFlagRolloutModeSchema
>;

export const PdfBuilderFeatureFlagContractSchema = z
  .object({
    flagName: NonEmptyStringSchema,
    enabled: z.boolean(),
    tenantId: IdentifierSchema.optional(),
    rolloutMode: PdfBuilderFeatureFlagRolloutModeSchema.default('legacy_only'),
    fallbackEngine: z.literal('unlayer').default('unlayer'),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type PdfBuilderFeatureFlagContract = z.infer<
  typeof PdfBuilderFeatureFlagContractSchema
>;
export type PdfBuilderFeatureFlagContractInput = z.input<
  typeof PdfBuilderFeatureFlagContractSchema
>;

export const PdfTemplateEngineSelectionReasonSchema = z.enum([
  'feature_flag_disabled',
  'legacy_template_pass_through',
  'native_feature_enabled',
]);

export type PdfTemplateEngineSelectionReason = z.infer<
  typeof PdfTemplateEngineSelectionReasonSchema
>;

export const PdfTemplateEditorSelectionSchema = z.enum([
  'legacy_unlayer',
  'native_pdf_builder',
]);

export type PdfTemplateEditorSelection = z.infer<
  typeof PdfTemplateEditorSelectionSchema
>;

export const PdfTemplateEngineSelectionResultSchema = z
  .object({
    selectedEngine: DocumentEngineSchema,
    editor: PdfTemplateEditorSelectionSchema,
    reason: PdfTemplateEngineSelectionReasonSchema,
  })
  .strict();

export type PdfTemplateEngineSelectionResult = z.infer<
  typeof PdfTemplateEngineSelectionResultSchema
>;

export interface SelectPdfTemplateEngineInput {
  readonly templateEngine: z.input<typeof DocumentEngineSchema>;
  readonly featureFlag: PdfBuilderFeatureFlagContractInput;
}

export function selectPdfTemplateEngine(
  input: SelectPdfTemplateEngineInput,
): PdfTemplateEngineSelectionResult {
  const templateEngine = DocumentEngineSchema.parse(input.templateEngine);
  const featureFlag = PdfBuilderFeatureFlagContractSchema.parse(
    input.featureFlag,
  );

  if (templateEngine === 'unlayer') {
    return PdfTemplateEngineSelectionResultSchema.parse({
      selectedEngine: 'unlayer',
      editor: 'legacy_unlayer',
      reason: 'legacy_template_pass_through',
    });
  }

  if (!featureFlag.enabled) {
    return PdfTemplateEngineSelectionResultSchema.parse({
      selectedEngine: featureFlag.fallbackEngine,
      editor: 'legacy_unlayer',
      reason: 'feature_flag_disabled',
    });
  }

  return PdfTemplateEngineSelectionResultSchema.parse({
    selectedEngine: 'asym_pdf_document_builder',
    editor: 'native_pdf_builder',
    reason: 'native_feature_enabled',
  });
}

export const UnlayerComparisonDifferenceCodeSchema = z.enum([
  'asset_mismatch',
  'content_mismatch',
  'layout_mismatch',
  'metadata_mismatch',
  'missing_native_section',
  'unsupported_legacy_feature',
]);

export type UnlayerComparisonDifferenceCode = z.infer<
  typeof UnlayerComparisonDifferenceCodeSchema
>;

export const UnlayerComparisonDifferenceSchema = z
  .object({
    code: UnlayerComparisonDifferenceCodeSchema,
    severity: UnlayerMigrationSeveritySchema.default('warning'),
    message: NonEmptyStringSchema,
    path: z.array(NonEmptyStringSchema).default([]),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type UnlayerComparisonDifference = z.infer<
  typeof UnlayerComparisonDifferenceSchema
>;
export type UnlayerComparisonDifferenceInput = z.input<
  typeof UnlayerComparisonDifferenceSchema
>;

export const UnlayerSideBySideComparisonStatusSchema = z.enum([
  'matches',
  'differences_found',
  'blocked',
]);

export type UnlayerSideBySideComparisonStatus = z.infer<
  typeof UnlayerSideBySideComparisonStatusSchema
>;

export const UnlayerSideBySideComparisonRequestSchema = z
  .object({
    legacyTemplate: LegacyPdfTemplateReferenceSchema,
    nativeTemplateId: IdentifierSchema,
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type UnlayerSideBySideComparisonRequest = z.infer<
  typeof UnlayerSideBySideComparisonRequestSchema
>;
export type UnlayerSideBySideComparisonRequestInput = z.input<
  typeof UnlayerSideBySideComparisonRequestSchema
>;

export const UnlayerSideBySideComparisonResultSchema = z
  .object({
    legacyTemplateId: IdentifierSchema,
    nativeTemplateId: IdentifierSchema,
    status: UnlayerSideBySideComparisonStatusSchema,
    differences: z.array(UnlayerComparisonDifferenceSchema).default([]),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type UnlayerSideBySideComparisonResult = z.infer<
  typeof UnlayerSideBySideComparisonResultSchema
>;
export type UnlayerSideBySideComparisonResultInput = z.input<
  typeof UnlayerSideBySideComparisonResultSchema
>;

export interface UnlayerSideBySideComparisonAdapter {
  compare(
    request: UnlayerSideBySideComparisonRequest,
  ): Promise<UnlayerSideBySideComparisonResult>;
}
