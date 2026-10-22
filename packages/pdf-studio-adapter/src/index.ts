import type { DocRaptorClient } from '@asym/docraptor-client';
import type { PdfEditorPackageName } from '@asym/pdf-editor';
import type {
  PdfPreviewResult,
  PreflightPdfTemplateInput,
  PreflightPdfTemplateResult,
} from '@asym/pdf-renderer';
import {
  type BatchDocumentJobV1,
  type BatchGenerationRunV1,
  type BatchQueueEnqueueResult,
  type DocumentTemplateV1,
  DocumentTemplateV1Schema,
  type LegacyPdfTemplateReference,
  LegacyPdfTemplateReferenceSchema,
  type PdfAssetAccessAdapter,
  type PdfAssetAccessRequestInput,
  type PdfAuthorizationDecision,
  type PdfBuilderFeatureFlagContract,
  PdfBuilderFeatureFlagContractSchema,
  type PdfPermissionAdapter,
  type PdfSecurityContextInput,
  type PdfSecurityResourceInput,
  type PdfSignedRenderUrlRequestInput,
  type PdfSignedRenderUrlResult,
  PdfSignedRenderUrlResultSchema,
  type PublishedTemplateSnapshotV1,
  type RenderResult,
  selectPdfTemplateEngine,
  type TemplateLifecycleRecordV1,
  type VariableDataContext,
  type VariableRegistry,
} from '@asym/pdf-template-schema';

export {
  createFakePdfPermissionAdapter,
  starterPdfTemplateFixtureByCategory,
} from '@asym/pdf-template-schema';

export type PdfStudioAdapterPackageName = '@asym/pdf-studio-adapter';
export type PdfStudioAdapterMaturity = 'phase-39-core-adapter-contract';
export type PdfStudioAdapterRuntime = 'shared-adapter-contract';
export type PdfStudioAdapterOwnership = 'core-integration-adapter';

export interface PdfStudioAdapterBoundary {
  readonly packageName: PdfStudioAdapterPackageName;
  readonly maturity: PdfStudioAdapterMaturity;
  readonly owns: PdfStudioAdapterOwnership;
  readonly runtime: PdfStudioAdapterRuntime;
  readonly consumes: readonly [
    '@asym/pdf-template-schema',
    PdfEditorPackageName,
    '@asym/pdf-renderer',
    '@asym/docraptor-client',
  ];
}

export const pdfStudioAdapterBoundary: PdfStudioAdapterBoundary = {
  consumes: [
    '@asym/pdf-template-schema',
    '@asym/pdf-editor',
    '@asym/pdf-renderer',
    '@asym/docraptor-client',
  ],
  maturity: 'phase-39-core-adapter-contract',
  owns: 'core-integration-adapter',
  packageName: '@asym/pdf-studio-adapter',
  runtime: 'shared-adapter-contract',
};

export type PdfStudioTemplateEngine = 'asym_pdf_document_builder' | 'unlayer';

export interface PdfStudioNativeTemplateRecord {
  readonly engine: 'asym_pdf_document_builder';
  readonly template: DocumentTemplateV1;
  readonly lifecycle?: TemplateLifecycleRecordV1;
  readonly publishedSnapshot?: PublishedTemplateSnapshotV1;
}

export interface PdfStudioLegacyTemplateRecord {
  readonly engine: 'unlayer';
  readonly legacyTemplate: LegacyPdfTemplateReference;
}

export type PdfStudioTemplateRecord =
  | PdfStudioNativeTemplateRecord
  | PdfStudioLegacyTemplateRecord;

export interface PdfStudioLoadTemplateInput {
  readonly templateId: string;
  readonly tenantId: string;
}

export interface PdfStudioLoadedTemplate {
  readonly record: PdfStudioTemplateRecord;
  readonly featureFlag: PdfBuilderFeatureFlagContract;
  readonly engineSelection: ReturnType<typeof selectPdfTemplateEngine>;
}

export interface PdfStudioSaveTemplateInput {
  readonly template: DocumentTemplateV1;
  readonly lifecycle?: TemplateLifecycleRecordV1;
}

export interface PdfStudioTemplateRepository {
  loadTemplate(
    input: PdfStudioLoadTemplateInput,
  ): PdfStudioTemplateRecord | Promise<PdfStudioTemplateRecord>;
  saveTemplate(
    input: PdfStudioSaveTemplateInput,
  ): PdfStudioTemplateRecord | Promise<PdfStudioTemplateRecord>;
  loadPublishedSnapshot?(
    input: PdfStudioLoadTemplateInput,
  ):
    | PublishedTemplateSnapshotV1
    | undefined
    | Promise<PublishedTemplateSnapshotV1 | undefined>;
  savePublishedSnapshot?(
    input: PdfStudioSavePublishedSnapshotInput,
  ): PublishedTemplateSnapshotV1 | Promise<PublishedTemplateSnapshotV1>;
}

export interface PdfStudioSavePublishedSnapshotInput {
  readonly snapshot: PublishedTemplateSnapshotV1;
}

export interface PdfStudioLifecycleLoadInput {
  readonly templateId: string;
  readonly tenantId: string;
}

export interface PdfStudioLifecycleSaveInput {
  readonly lifecycle: TemplateLifecycleRecordV1;
}

export interface PdfStudioLifecycleAdapter {
  loadLifecycle(
    input: PdfStudioLifecycleLoadInput,
  ):
    | TemplateLifecycleRecordV1
    | undefined
    | Promise<TemplateLifecycleRecordV1 | undefined>;
  saveLifecycle(
    input: PdfStudioLifecycleSaveInput,
  ): TemplateLifecycleRecordV1 | Promise<TemplateLifecycleRecordV1>;
}

export interface PdfStudioFeatureFlagInput {
  readonly tenantId: string;
  readonly templateId?: string;
  readonly engine?: PdfStudioTemplateEngine;
}

export interface PdfStudioFeatureFlagAdapter {
  resolveNativeBuilderFlag(
    input: PdfStudioFeatureFlagInput,
  ): PdfBuilderFeatureFlagContract | Promise<PdfBuilderFeatureFlagContract>;
}

export interface PdfStudioEditorInput {
  readonly engine: PdfStudioTemplateEngine;
  readonly mountId?: string;
  readonly template?: DocumentTemplateV1;
  readonly legacyTemplate?: LegacyPdfTemplateReference;
  readonly variableRegistry?: VariableRegistry;
}

export interface PdfStudioEditorHandle {
  readonly engine: PdfStudioTemplateEngine;
  readonly mountId?: string;
}

export interface PdfStudioEditorAdapter {
  createEditor(input: PdfStudioEditorInput): PdfStudioEditorHandle;
}

export interface PdfStudioPreflightAdapter {
  run(
    input: PreflightPdfTemplateInput,
  ): PreflightPdfTemplateResult | Promise<PreflightPdfTemplateResult>;
}

export interface PdfStudioPreviewInput {
  readonly template: DocumentTemplateV1;
  readonly dataContext?: VariableDataContext;
  readonly previewId?: string;
}

export interface PdfStudioPreviewAdapter {
  createPreview(
    input: PdfStudioPreviewInput,
  ): PdfPreviewResult | Promise<PdfPreviewResult>;
}

export type PdfStudioRenderResult = RenderResult;

export interface PdfStudioRenderInput {
  readonly template: DocumentTemplateV1;
  readonly dataContext?: VariableDataContext;
  readonly renderId: string;
  readonly renderer: 'docraptor';
  readonly docraptorClient?: DocRaptorClient;
}

export interface PdfStudioRenderAdapter {
  render(
    input: PdfStudioRenderInput,
  ): PdfStudioRenderResult | Promise<PdfStudioRenderResult>;
}

export interface PdfStudioBatchStartInput {
  readonly run: BatchGenerationRunV1;
  readonly jobs: readonly BatchDocumentJobV1[];
}

export interface PdfStudioBatchStartResult extends BatchQueueEnqueueResult {
  readonly run: BatchGenerationRunV1;
}

export interface PdfStudioBatchAdapter {
  startBatch(
    input: PdfStudioBatchStartInput,
  ): PdfStudioBatchStartResult | Promise<PdfStudioBatchStartResult>;
}

export interface PdfStudioAssetAdapter extends PdfAssetAccessAdapter {}

export interface PdfStudioPreviewTemplateInput {
  readonly context: PdfSecurityContextInput;
  readonly template: DocumentTemplateV1;
  readonly dataContext?: VariableDataContext;
  readonly previewId?: string;
}

export interface PdfStudioPreviewTemplateResult {
  readonly authorization: PdfAuthorizationDecision;
  readonly preflight: PreflightPdfTemplateResult;
  readonly preview: PdfPreviewResult;
}

export interface PdfStudioRenderTemplateInput {
  readonly context: PdfSecurityContextInput;
  readonly template: DocumentTemplateV1;
  readonly dataContext?: VariableDataContext;
  readonly renderId: string;
}

export interface PdfStudioRenderTemplateResult {
  readonly authorization: PdfAuthorizationDecision;
  readonly preflight: PreflightPdfTemplateResult;
  readonly render: PdfStudioRenderResult;
}

export interface PdfStudioCreateSignedAssetUrlInput {
  readonly request: PdfSignedRenderUrlRequestInput;
}

export interface PdfStudioStartBatchInput {
  readonly context: PdfSecurityContextInput;
  readonly run: BatchGenerationRunV1;
  readonly jobs: readonly BatchDocumentJobV1[];
}

export interface PdfStudioStartBatchResult {
  readonly authorization: PdfAuthorizationDecision;
  readonly result: PdfStudioBatchStartResult;
}

export interface PdfStudioAdapterDependencies {
  readonly editor: PdfStudioEditorAdapter;
  readonly templates: PdfStudioTemplateRepository;
  readonly lifecycle: PdfStudioLifecycleAdapter;
  readonly preview: PdfStudioPreviewAdapter;
  readonly render: PdfStudioRenderAdapter;
  readonly preflight: PdfStudioPreflightAdapter;
  readonly batch?: PdfStudioBatchAdapter;
  readonly featureFlags: PdfStudioFeatureFlagAdapter;
  readonly auth: PdfPermissionAdapter;
  readonly assets?: PdfStudioAssetAdapter;
  readonly variableRegistry?: VariableRegistry;
  readonly docraptorClient?: DocRaptorClient;
}

export interface PdfStudioAdapter {
  readonly boundary: PdfStudioAdapterBoundary;
  createEditor(
    input: Omit<PdfStudioEditorInput, 'variableRegistry'>,
  ): PdfStudioEditorHandle;
  loadTemplate(
    input: PdfStudioLoadTemplateInput,
  ): Promise<PdfStudioLoadedTemplate>;
  saveTemplate(
    input: PdfStudioSaveTemplateInput,
  ): Promise<PdfStudioTemplateRecord>;
  loadLifecycle(
    input: PdfStudioLifecycleLoadInput,
  ): Promise<TemplateLifecycleRecordV1 | undefined>;
  saveLifecycle(
    input: PdfStudioLifecycleSaveInput,
  ): Promise<TemplateLifecycleRecordV1>;
  previewTemplate(
    input: PdfStudioPreviewTemplateInput,
  ): Promise<PdfStudioPreviewTemplateResult>;
  renderTemplate(
    input: PdfStudioRenderTemplateInput,
  ): Promise<PdfStudioRenderTemplateResult>;
  createSignedAssetUrl(
    input: PdfStudioCreateSignedAssetUrlInput,
  ): Promise<PdfSignedRenderUrlResult | undefined>;
  startBatch(
    input: PdfStudioStartBatchInput,
  ): Promise<PdfStudioStartBatchResult>;
  selectTemplateEngine(input: {
    readonly templateEngine: PdfStudioTemplateEngine;
    readonly featureFlag: PdfBuilderFeatureFlagContract;
  }): ReturnType<typeof selectPdfTemplateEngine>;
}

export type PdfStudioAdapterErrorCode =
  | 'missing_adapter'
  | 'preflight_failed'
  | 'unauthorized';

export class PdfStudioAdapterError extends Error {
  readonly code: PdfStudioAdapterErrorCode;
  readonly decision?: PdfAuthorizationDecision;

  constructor(input: {
    readonly code: PdfStudioAdapterErrorCode;
    readonly message: string;
    readonly decision?: PdfAuthorizationDecision;
  }) {
    super(input.message);
    this.name = 'PdfStudioAdapterError';
    this.code = input.code;
    this.decision = input.decision;
  }
}

export function createPdfStudioAdapter(
  dependencies: PdfStudioAdapterDependencies,
): PdfStudioAdapter {
  return {
    boundary: pdfStudioAdapterBoundary,
    createEditor(input) {
      return dependencies.editor.createEditor({
        ...input,
        variableRegistry: dependencies.variableRegistry,
      });
    },
    async createSignedAssetUrl(input) {
      if (dependencies.assets === undefined) {
        throwMissingAdapter('assets');
      }

      const request = input.request;
      const purpose =
        request.purpose === 'browser_preview' ? 'preview' : request.purpose;
      const assetRequest: PdfAssetAccessRequestInput = {
        assetId: request.assetId,
        purpose,
        tenantId: request.tenantId,
      };
      const authorization =
        await dependencies.assets.authorizeAssetAccess(assetRequest);

      if (!authorization.ok) {
        throw new PdfStudioAdapterError({
          code: 'unauthorized',
          decision: authorization,
          message: authorization.message ?? 'Asset access denied by adapter.',
        });
      }

      if (dependencies.assets.createSignedRenderUrl === undefined) {
        throwMissingAdapter('assets.createSignedRenderUrl');
      }

      const signedUrl =
        await dependencies.assets.createSignedRenderUrl(request);

      if (signedUrl === undefined) {
        return undefined;
      }

      return PdfSignedRenderUrlResultSchema.parse(signedUrl);
    },
    async loadLifecycle(input) {
      return dependencies.lifecycle.loadLifecycle(input);
    },
    async loadTemplate(input) {
      const record = await dependencies.templates.loadTemplate(input);
      const normalizedRecord = normalizeTemplateRecord(record);
      const featureFlag = PdfBuilderFeatureFlagContractSchema.parse(
        await dependencies.featureFlags.resolveNativeBuilderFlag({
          engine: normalizedRecord.engine,
          templateId: input.templateId,
          tenantId: input.tenantId,
        }),
      );
      const engineSelection = selectPdfTemplateEngine({
        featureFlag,
        templateEngine: normalizedRecord.engine,
      });

      return {
        engineSelection,
        featureFlag,
        record: normalizedRecord,
      };
    },
    async previewTemplate(input) {
      const template = DocumentTemplateV1Schema.parse(input.template);
      const authorization = await authorizeOrThrow({
        action: 'preview_render',
        auth: dependencies.auth,
        context: input.context,
        resource: createTemplateResource(template, input.context.tenantId),
      });
      const preflight = await dependencies.preflight.run({
        dataContext: input.dataContext,
        mode: 'authoring',
        template,
      });
      const preview = await dependencies.preview.createPreview({
        dataContext: input.dataContext,
        previewId: input.previewId,
        template,
      });

      return {
        authorization,
        preflight,
        preview,
      };
    },
    async renderTemplate(input) {
      const template = DocumentTemplateV1Schema.parse(input.template);
      const authorization = await authorizeOrThrow({
        action: 'production_render',
        auth: dependencies.auth,
        context: input.context,
        resource: createTemplateResource(template, input.context.tenantId),
      });
      const preflight = await dependencies.preflight.run({
        dataContext: input.dataContext,
        mode: 'production_render',
        template,
      });

      if (!preflight.ok) {
        throw new PdfStudioAdapterError({
          code: 'preflight_failed',
          message: 'Production render requires passing preflight.',
        });
      }

      const render = await dependencies.render.render({
        dataContext: input.dataContext,
        docraptorClient: dependencies.docraptorClient,
        renderId: input.renderId,
        renderer: 'docraptor',
        template,
      });

      return {
        authorization,
        preflight,
        render,
      };
    },
    async saveLifecycle(input) {
      return dependencies.lifecycle.saveLifecycle(input);
    },
    async saveTemplate(input) {
      const template = DocumentTemplateV1Schema.parse(input.template);
      return normalizeTemplateRecord(
        await dependencies.templates.saveTemplate({
          ...input,
          template,
        }),
      );
    },
    selectTemplateEngine(input) {
      return selectPdfTemplateEngine(input);
    },
    async startBatch(input) {
      if (dependencies.batch === undefined) {
        throwMissingAdapter('batch');
      }

      const authorization = await authorizeOrThrow({
        action: 'start_batch',
        auth: dependencies.auth,
        context: input.context,
        resource: {
          id: input.run.id,
          tenantId: input.run.tenantId ?? input.context.tenantId,
          type: 'batch',
        },
      });
      const result = await dependencies.batch.startBatch({
        jobs: input.jobs,
        run: input.run,
      });

      return {
        authorization,
        result,
      };
    },
  };
}

function normalizeTemplateRecord(
  record: PdfStudioTemplateRecord,
): PdfStudioTemplateRecord {
  if (record.engine === 'unlayer') {
    return {
      engine: 'unlayer',
      legacyTemplate: LegacyPdfTemplateReferenceSchema.parse(
        record.legacyTemplate,
      ),
    };
  }

  return {
    engine: 'asym_pdf_document_builder',
    lifecycle: record.lifecycle,
    publishedSnapshot: record.publishedSnapshot,
    template: DocumentTemplateV1Schema.parse(record.template),
  };
}

async function authorizeOrThrow(input: {
  readonly auth: PdfPermissionAdapter;
  readonly action: 'preview_render' | 'production_render' | 'start_batch';
  readonly context: PdfSecurityContextInput;
  readonly resource: PdfSecurityResourceInput;
}): Promise<PdfAuthorizationDecision> {
  const decision = await input.auth.authorize({
    action: input.action,
    context: input.context,
    resource: input.resource,
  });

  if (!decision.ok) {
    throw new PdfStudioAdapterError({
      code: 'unauthorized',
      decision,
      message: decision.message ?? 'PDF Studio adapter authorization denied.',
    });
  }

  return decision;
}

function createTemplateResource(
  template: DocumentTemplateV1,
  fallbackTenantId: string,
): PdfSecurityResourceInput {
  const tenantId =
    typeof template.metadata === 'object' &&
    template.metadata !== null &&
    'tenantId' in template.metadata &&
    typeof template.metadata.tenantId === 'string'
      ? template.metadata.tenantId
      : fallbackTenantId;

  return {
    id: template.id,
    tenantId,
    type: 'template',
  };
}

function throwMissingAdapter(adapterName: string): never {
  throw new PdfStudioAdapterError({
    code: 'missing_adapter',
    message: `PDF Studio adapter dependency is missing: ${adapterName}.`,
  });
}
