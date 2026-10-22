import { z } from 'zod';
import {
  PdfDocumentMetadataSchema,
  PdfDocumentOutputSettingsSchema,
  PdfDocumentProfileOptionsSchema,
} from './pdf-metadata';
import {
  IdentifierSchema,
  IsoDateTimeSchema,
  JsonObjectSchema,
  type JsonValue,
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  UrlSchema,
} from './primitives';
import {
  DocumentPageSettingsSchema,
  DocumentTemplateV1Schema,
} from './template';

export const RenderModeSchema = z.enum(['preview', 'production', 'batch']);

export const RendererSchema = z.enum(['docraptor', 'browser', 'local']);

export const RenderWarningSchema = z
  .object({
    code: NonEmptyStringSchema,
    message: NonEmptyStringSchema,
    severity: z.enum(['info', 'warning']).default('warning'),
    nodeId: IdentifierSchema.optional(),
    path: z.array(NonEmptyStringSchema).default([]),
    details: JsonObjectSchema.optional(),
  })
  .strict();

export type RenderWarning = z.infer<typeof RenderWarningSchema>;

export const RenderErrorSchema = z
  .object({
    code: NonEmptyStringSchema,
    message: NonEmptyStringSchema,
    retryable: z.boolean().default(false),
    nodeId: IdentifierSchema.optional(),
    path: z.array(NonEmptyStringSchema).default([]),
    details: JsonObjectSchema.optional(),
  })
  .strict();

export type RenderError = z.infer<typeof RenderErrorSchema>;

export const DocumentArtifactLocationSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('storage'),
      storageKey: NonEmptyStringSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('url'),
      url: UrlSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('adapter_reference'),
      reference: NonEmptyStringSchema,
    })
    .strict(),
]);

export type DocumentArtifactLocation = z.infer<
  typeof DocumentArtifactLocationSchema
>;

export const DocumentArtifactSchema = z
  .object({
    id: IdentifierSchema,
    kind: z.enum(['pdf', 'html', 'preview', 'manifest']),
    mimeType: NonEmptyStringSchema,
    sizeBytes: NonNegativeIntegerSchema,
    location: DocumentArtifactLocationSchema.optional(),
    storageKey: NonEmptyStringSchema.optional(),
    url: UrlSchema.optional(),
    hash: NonEmptyStringSchema.optional(),
    createdAt: IsoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((artifact, context) => {
    if (
      artifact.location === undefined &&
      artifact.storageKey === undefined &&
      artifact.url === undefined
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Artifacts require either location, storageKey, or url.',
        path: ['location'],
      });
    }
  });

export type DocumentArtifact = z.infer<typeof DocumentArtifactSchema>;

export const RenderRequestSchema = z
  .object({
    version: z.literal(1),
    id: IdentifierSchema,
    template: DocumentTemplateV1Schema,
    data: JsonObjectSchema.default({}),
    mode: RenderModeSchema,
    renderer: RendererSchema.default('docraptor'),
    pdfSettings: PdfDocumentOutputSettingsSchema.optional(),
    requestedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export type RenderRequest = z.infer<typeof RenderRequestSchema>;

export const RenderResultSchema = z
  .object({
    status: z.enum(['success', 'warning', 'error']),
    renderer: RendererSchema,
    artifact: DocumentArtifactSchema.optional(),
    warnings: z.array(RenderWarningSchema).default([]),
    errors: z.array(RenderErrorSchema).default([]),
    durationMs: NonNegativeNumberSchema.optional(),
  })
  .strict()
  .superRefine((result, context) => {
    if (result.status === 'error' && result.errors.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Error render results must include at least one error.',
        path: ['errors'],
      });
    }
  });

export type RenderResult = z.infer<typeof RenderResultSchema>;

export const RenderTimingSchema = z
  .object({
    queuedAt: IsoDateTimeSchema.optional(),
    startedAt: IsoDateTimeSchema.optional(),
    completedAt: IsoDateTimeSchema.optional(),
    durationMs: NonNegativeNumberSchema.optional(),
  })
  .strict()
  .default({});

export type RenderTiming = z.infer<typeof RenderTimingSchema>;

export const DocRaptorRenderMetadataSchema = z
  .object({
    mode: z.enum(['test', 'production']),
    media: z.enum(['print', 'screen']).default('print'),
    requestUrl: UrlSchema.optional(),
    requestMethod: z.enum(['POST', 'GET']).optional(),
    tag: NonEmptyStringSchema.optional(),
    test: z.boolean(),
    statusId: NonEmptyStringSchema.optional(),
    statusUrl: UrlSchema.optional(),
    pageCount: NonNegativeIntegerSchema.optional(),
    validationErrors: z.array(NonEmptyStringSchema).default([]),
    idempotencyKey: NonEmptyStringSchema.optional(),
    pdfMetadata: PdfDocumentMetadataSchema.optional(),
    pdfProfile: PdfDocumentProfileOptionsSchema.optional(),
  })
  .strict();

export type DocRaptorRenderMetadata = z.infer<
  typeof DocRaptorRenderMetadataSchema
>;

export const DataSnapshotHashSchema = NonEmptyStringSchema;

export type DataSnapshotHash = z.infer<typeof DataSnapshotHashSchema>;

export const RenderMetadataV1Schema = z
  .object({
    version: z.literal(1),
    id: IdentifierSchema,
    renderId: IdentifierSchema,
    tenantId: IdentifierSchema,
    actorId: IdentifierSchema.optional(),
    templateId: IdentifierSchema,
    templateVersion: z.number().int().positive(),
    dataSnapshotHash: DataSnapshotHashSchema,
    mode: RenderModeSchema,
    renderer: RendererSchema,
    status: z.enum(['queued', 'running', 'succeeded', 'failed', 'canceled']),
    batchId: IdentifierSchema.optional(),
    pageSettings: DocumentPageSettingsSchema.optional(),
    docraptor: DocRaptorRenderMetadataSchema.optional(),
    timings: RenderTimingSchema,
    warnings: z.array(RenderWarningSchema).default([]),
    errors: z.array(RenderErrorSchema).default([]),
    artifacts: z.array(DocumentArtifactSchema).default([]),
    createdAt: IsoDateTimeSchema.optional(),
    updatedAt: IsoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((metadata, context) => {
    if (metadata.status === 'failed' && metadata.errors.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Failed render metadata must include at least one error.',
        path: ['errors'],
      });
    }
  });

export type RenderMetadataV1 = z.infer<typeof RenderMetadataV1Schema>;

export const RenderJobV1Schema = z
  .object({
    version: z.literal(1),
    id: IdentifierSchema,
    tenantId: IdentifierSchema.optional(),
    actorId: IdentifierSchema.optional(),
    templateId: IdentifierSchema,
    templateVersion: z.number().int().positive(),
    status: z.enum(['queued', 'running', 'succeeded', 'failed', 'canceled']),
    mode: RenderModeSchema,
    renderer: RendererSchema.default('docraptor'),
    dataSnapshotHash: DataSnapshotHashSchema,
    batchId: IdentifierSchema.optional(),
    pageSettings: DocumentPageSettingsSchema.optional(),
    docraptor: DocRaptorRenderMetadataSchema.optional(),
    timings: RenderTimingSchema,
    warnings: z.array(RenderWarningSchema).default([]),
    errors: z.array(RenderErrorSchema).default([]),
    artifacts: z.array(DocumentArtifactSchema).default([]),
    createdAt: IsoDateTimeSchema.optional(),
    updatedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export type RenderJobV1 = z.infer<typeof RenderJobV1Schema>;

export const BatchRunV1Schema = z
  .object({
    version: z.literal(1),
    id: IdentifierSchema,
    templateId: IdentifierSchema,
    templateVersion: z.number().int().positive(),
    tenantId: IdentifierSchema.optional(),
    actorId: IdentifierSchema.optional(),
    status: z.enum([
      'draft',
      'queued',
      'running',
      'completed',
      'partial_success',
      'failed',
      'canceled',
    ]),
    dataSnapshotHash: DataSnapshotHashSchema.optional(),
    jobIds: z.array(IdentifierSchema).default([]),
    counts: z
      .object({
        total: NonNegativeIntegerSchema,
        pending: NonNegativeIntegerSchema.default(0),
        running: NonNegativeIntegerSchema.default(0),
        succeeded: NonNegativeIntegerSchema.default(0),
        failed: NonNegativeIntegerSchema.default(0),
        canceled: NonNegativeIntegerSchema.default(0),
      })
      .strict(),
    createdAt: IsoDateTimeSchema.optional(),
    updatedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export type BatchRunV1 = z.infer<typeof BatchRunV1Schema>;

export const AuditEventSchema = z
  .object({
    id: IdentifierSchema,
    eventType: z.enum([
      'template.created',
      'template.updated',
      'template.published',
      'template.archived',
      'template.duplicated',
      'template.restored',
      'render.started',
      'render.succeeded',
      'render.failed',
      'render.canceled',
      'batch.started',
      'batch.completed',
      'batch.failed',
      'batch.canceled',
      'batch.retried',
      'artifact.created',
      'artifact.downloaded',
    ]),
    occurredAt: IsoDateTimeSchema,
    actor: z
      .object({
        type: z.enum(['user', 'system']),
        id: IdentifierSchema.optional(),
      })
      .strict(),
    tenantId: IdentifierSchema.optional(),
    target: z
      .object({
        type: z.enum(['template', 'render_job', 'batch_run', 'artifact']),
        id: IdentifierSchema,
      })
      .strict(),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type AuditEvent = z.infer<typeof AuditEventSchema>;

export function createDataSnapshotHash(data: JsonValue): DataSnapshotHash {
  return `fnv1a32:${hashFnv1a32(stableStringifyJsonValue(data))}`;
}

export function stableStringifyJsonValue(value: JsonValue): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringifyJsonValue(item)).join(',')}]`;
  }

  const objectValue = value as Readonly<Record<string, JsonValue>>;
  const entries = Object.entries(objectValue).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return `{${entries
    .map(
      ([key, item]) =>
        `${JSON.stringify(key)}:${stableStringifyJsonValue(item)}`,
    )
    .join(',')}}`;
}

function hashFnv1a32(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}
