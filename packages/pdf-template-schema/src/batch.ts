import { z } from 'zod';
import {
  assertProductionRenderableTemplateSnapshot,
  type PublishedTemplateSnapshotV1,
  PublishedTemplateSnapshotV1Schema,
} from './lifecycle';
import {
  IdentifierSchema,
  IsoDateTimeSchema,
  JsonObjectSchema,
  type JsonValue,
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  PositiveIntegerSchema,
} from './primitives';
import {
  createDataSnapshotHash,
  type DataSnapshotHash,
  DataSnapshotHashSchema,
  type DocumentArtifact,
  DocumentArtifactSchema,
  RendererSchema,
} from './rendering';

export const BatchGenerationStatusSchema = z.enum([
  'draft',
  'queued',
  'running',
  'completed',
  'partial_success',
  'failed',
  'canceled',
]);

export type BatchGenerationStatus = z.infer<typeof BatchGenerationStatusSchema>;

export const BatchDocumentJobStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled',
  'retry_queued',
]);

export type BatchDocumentJobStatus = z.infer<
  typeof BatchDocumentJobStatusSchema
>;

export const BatchDatasetReferenceSchema = z
  .object({
    type: z.enum([
      'sample_fixture',
      'query',
      'static_records',
      'adapter_reference',
    ]),
    id: IdentifierSchema,
    label: NonEmptyStringSchema.optional(),
    recordCount: NonNegativeIntegerSchema.optional(),
    dataSnapshotHash: DataSnapshotHashSchema.optional(),
    criteria: JsonObjectSchema.optional(),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type BatchDatasetReference = z.infer<typeof BatchDatasetReferenceSchema>;
export type BatchDatasetReferenceInput = z.input<
  typeof BatchDatasetReferenceSchema
>;

export const BatchRecipientReferenceSchema = z
  .object({
    id: IdentifierSchema,
    label: NonEmptyStringSchema.optional(),
    dataSnapshotHash: DataSnapshotHashSchema.optional(),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type BatchRecipientReference = z.infer<
  typeof BatchRecipientReferenceSchema
>;
export type BatchRecipientReferenceInput = z.input<
  typeof BatchRecipientReferenceSchema
>;

export const BatchFailureReasonSchema = z
  .object({
    code: NonEmptyStringSchema,
    message: NonEmptyStringSchema,
    retryable: z.boolean().default(false),
    path: z.array(NonEmptyStringSchema).default([]),
    details: JsonObjectSchema.optional(),
  })
  .strict();

export type BatchFailureReason = z.infer<typeof BatchFailureReasonSchema>;
export type BatchFailureReasonInput = z.input<typeof BatchFailureReasonSchema>;

export const BatchSafetyPreflightDiagnosticSchema = z
  .object({
    code: NonEmptyStringSchema,
    severity: z.enum(['info', 'warning', 'error']),
    message: NonEmptyStringSchema,
    path: z.array(NonEmptyStringSchema).default([]),
    nodeId: IdentifierSchema.optional(),
    suggestedFix: NonEmptyStringSchema.optional(),
    details: JsonObjectSchema.optional(),
  })
  .strict();

export type BatchSafetyPreflightDiagnostic = z.infer<
  typeof BatchSafetyPreflightDiagnosticSchema
>;
export type BatchSafetyPreflightDiagnosticInput = z.input<
  typeof BatchSafetyPreflightDiagnosticSchema
>;

export const BatchSafetyPreflightResultSchema = z
  .object({
    ok: z.boolean(),
    diagnostics: z.array(BatchSafetyPreflightDiagnosticSchema).default([]),
  })
  .strict()
  .superRefine((result, context) => {
    const hasBlockingError = result.diagnostics.some(
      (diagnostic) => diagnostic.severity === 'error',
    );

    if (result.ok && hasBlockingError) {
      context.addIssue({
        code: 'custom',
        message: 'Passing batch preflight cannot include blocking errors.',
        path: ['diagnostics'],
      });
    }
  });

export type BatchSafetyPreflightResult = z.infer<
  typeof BatchSafetyPreflightResultSchema
>;

export interface BatchSafetyPreflightResultInput {
  readonly ok: boolean;
  readonly diagnostics?: readonly BatchSafetyPreflightDiagnosticInput[];
}

export const BatchGenerationDefinitionV1Schema = z
  .object({
    version: z.literal(1),
    id: IdentifierSchema,
    status: z.literal('draft').default('draft'),
    tenantId: IdentifierSchema.optional(),
    actorId: IdentifierSchema.optional(),
    templateSnapshotId: IdentifierSchema,
    templateId: IdentifierSchema,
    templateVersion: PositiveIntegerSchema,
    templateSnapshot: PublishedTemplateSnapshotV1Schema,
    dataset: BatchDatasetReferenceSchema,
    recipients: z.array(BatchRecipientReferenceSchema).min(1),
    dataSnapshotHash: DataSnapshotHashSchema,
    mode: z.literal('batch').default('batch'),
    renderer: RendererSchema.default('docraptor'),
    preflight: BatchSafetyPreflightResultSchema.default({
      ok: true,
      diagnostics: [],
    }),
    createdAt: IsoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((definition, context) => {
    if (definition.templateSnapshotId !== definition.templateSnapshot.id) {
      context.addIssue({
        code: 'custom',
        message: 'Batch template snapshot id must match the snapshot.',
        path: ['templateSnapshotId'],
      });
    }

    if (definition.templateId !== definition.templateSnapshot.templateId) {
      context.addIssue({
        code: 'custom',
        message: 'Batch template id must match the published snapshot.',
        path: ['templateId'],
      });
    }

    if (
      definition.templateVersion !== definition.templateSnapshot.templateVersion
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Batch template version must match the published snapshot.',
        path: ['templateVersion'],
      });
    }

    if (!definition.preflight.ok) {
      context.addIssue({
        code: 'custom',
        message: 'Batch preflight must pass before jobs are created.',
        path: ['preflight', 'ok'],
      });
    }
  });

export type BatchGenerationDefinitionV1 = z.infer<
  typeof BatchGenerationDefinitionV1Schema
>;

export const BatchDocumentJobV1Schema = z
  .object({
    version: z.literal(1),
    id: IdentifierSchema,
    batchId: IdentifierSchema,
    recipient: BatchRecipientReferenceSchema,
    templateId: IdentifierSchema,
    templateVersion: PositiveIntegerSchema,
    templateSnapshotId: IdentifierSchema,
    status: BatchDocumentJobStatusSchema,
    attempt: PositiveIntegerSchema.default(1),
    maxAttempts: PositiveIntegerSchema.default(3),
    renderer: RendererSchema.default('docraptor'),
    dataSnapshotHash: DataSnapshotHashSchema,
    renderJobId: IdentifierSchema.optional(),
    failureReason: BatchFailureReasonSchema.optional(),
    artifacts: z.array(DocumentArtifactSchema).default([]),
    createdAt: IsoDateTimeSchema.optional(),
    updatedAt: IsoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((job, context) => {
    if (job.status === 'failed' && job.failureReason === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Failed batch document jobs require a failure reason.',
        path: ['failureReason'],
      });
    }

    if (job.status !== 'failed' && job.failureReason !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Only failed batch document jobs may carry a failure reason.',
        path: ['failureReason'],
      });
    }
  });

export type BatchDocumentJobV1 = z.infer<typeof BatchDocumentJobV1Schema>;

export const BatchProgressSummarySchema = z
  .object({
    total: NonNegativeIntegerSchema,
    pending: NonNegativeIntegerSchema,
    running: NonNegativeIntegerSchema,
    succeeded: NonNegativeIntegerSchema,
    failed: NonNegativeIntegerSchema,
    canceled: NonNegativeIntegerSchema,
    retryQueued: NonNegativeIntegerSchema,
    completionRatio: NonNegativeNumberSchema.max(1),
  })
  .strict();

export type BatchProgressSummary = z.infer<typeof BatchProgressSummarySchema>;

export const BatchGenerationRunV1Schema = z
  .object({
    version: z.literal(1),
    id: IdentifierSchema,
    templateId: IdentifierSchema,
    templateVersion: PositiveIntegerSchema,
    templateSnapshotId: IdentifierSchema,
    tenantId: IdentifierSchema.optional(),
    actorId: IdentifierSchema.optional(),
    status: BatchGenerationStatusSchema,
    dataset: BatchDatasetReferenceSchema,
    dataSnapshotHash: DataSnapshotHashSchema,
    jobIds: z.array(IdentifierSchema).default([]),
    progress: BatchProgressSummarySchema,
    preflight: BatchSafetyPreflightResultSchema,
    createdAt: IsoDateTimeSchema.optional(),
    updatedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export type BatchGenerationRunV1 = z.infer<typeof BatchGenerationRunV1Schema>;

export const BatchResultManifestJobSchema = z
  .object({
    id: IdentifierSchema,
    recipientId: IdentifierSchema,
    status: BatchDocumentJobStatusSchema,
    attempt: PositiveIntegerSchema,
    maxAttempts: PositiveIntegerSchema,
    artifactIds: z.array(IdentifierSchema).default([]),
    failureReason: BatchFailureReasonSchema.optional(),
  })
  .strict();

export type BatchResultManifestJob = z.infer<
  typeof BatchResultManifestJobSchema
>;

export const BatchResultManifestV1Schema = z
  .object({
    version: z.literal(1),
    batchId: IdentifierSchema,
    templateId: IdentifierSchema,
    templateVersion: PositiveIntegerSchema,
    templateSnapshotId: IdentifierSchema,
    tenantId: IdentifierSchema.optional(),
    actorId: IdentifierSchema.optional(),
    status: BatchGenerationStatusSchema,
    generatedAt: IsoDateTimeSchema,
    progress: BatchProgressSummarySchema,
    jobs: z.array(BatchResultManifestJobSchema).default([]),
    failures: z.array(BatchFailureReasonSchema).default([]),
    artifacts: z.array(DocumentArtifactSchema).default([]),
  })
  .strict();

export type BatchResultManifestV1 = z.infer<typeof BatchResultManifestV1Schema>;

export const BatchDownloadManifestV1Schema = z
  .object({
    version: z.literal(1),
    batchId: IdentifierSchema,
    kind: z.literal('zip'),
    generatedAt: IsoDateTimeSchema,
    artifactCount: NonNegativeIntegerSchema,
    sizeBytes: NonNegativeIntegerSchema.optional(),
    artifacts: z.array(DocumentArtifactSchema).default([]),
    failures: z.array(BatchFailureReasonSchema).default([]),
  })
  .strict();

export type BatchDownloadManifestV1 = z.infer<
  typeof BatchDownloadManifestV1Schema
>;

export interface CreateBatchGenerationDefinitionInput {
  readonly id: string;
  readonly templateSnapshot: unknown;
  readonly dataset: BatchDatasetReferenceInput;
  readonly recipients: readonly BatchRecipientReferenceInput[];
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly renderer?: z.infer<typeof RendererSchema>;
  readonly preflight?: BatchSafetyPreflightResultInput;
  readonly createdAt?: string;
}

export interface CreateBatchDocumentJobsInput {
  readonly definition: BatchGenerationDefinitionV1;
  readonly now?: string;
  readonly maxAttempts?: number;
}

export interface CreateBatchGenerationRunInput {
  readonly definition: BatchGenerationDefinitionV1;
  readonly jobs: readonly BatchDocumentJobV1[];
  readonly now?: string;
}

export interface TransitionBatchDocumentJobInput {
  readonly job: BatchDocumentJobV1;
  readonly status: BatchDocumentJobStatus;
  readonly now?: string;
  readonly renderJobId?: string;
  readonly failureReason?: BatchFailureReasonInput;
  readonly artifacts?: readonly DocumentArtifact[];
}

export interface CreateRetryBatchDocumentJobInput {
  readonly job: BatchDocumentJobV1;
  readonly now?: string;
}

export interface CancelBatchGenerationRunInput {
  readonly run: BatchGenerationRunV1;
  readonly jobs: readonly BatchDocumentJobV1[];
  readonly now?: string;
}

export interface CancelBatchGenerationRunResult {
  readonly run: BatchGenerationRunV1;
  readonly jobs: readonly BatchDocumentJobV1[];
}

export interface CreateBatchManifestInput {
  readonly run: BatchGenerationRunV1;
  readonly jobs: readonly BatchDocumentJobV1[];
  readonly now: string;
}

export interface BatchQueueEnqueueInput {
  readonly run: BatchGenerationRunV1;
  readonly jobs: readonly BatchDocumentJobV1[];
}

export interface BatchQueueEnqueueResult {
  readonly batchId: string;
  readonly enqueuedJobIds: readonly string[];
}

export interface BatchQueueCancelInput {
  readonly run: BatchGenerationRunV1;
  readonly jobIds?: readonly string[];
}

export interface BatchQueueRetryInput {
  readonly run: BatchGenerationRunV1;
  readonly jobs: readonly BatchDocumentJobV1[];
}

export interface BatchQueueAdapter {
  enqueueJobs(input: BatchQueueEnqueueInput): Promise<BatchQueueEnqueueResult>;
  cancelJobs?(input: BatchQueueCancelInput): Promise<void>;
  retryJobs?(input: BatchQueueRetryInput): Promise<BatchQueueEnqueueResult>;
}

export function createBatchGenerationDefinition(
  input: CreateBatchGenerationDefinitionInput,
): BatchGenerationDefinitionV1 {
  const templateSnapshot = assertProductionRenderableTemplateSnapshot(
    input.templateSnapshot,
  );
  const dataset = BatchDatasetReferenceSchema.parse(input.dataset);
  const recipients = z
    .array(BatchRecipientReferenceSchema)
    .min(1)
    .parse(input.recipients);
  const preflight = BatchSafetyPreflightResultSchema.parse(
    input.preflight ?? {
      ok: true,
      diagnostics: [],
    },
  );

  if (!preflight.ok) {
    throw new Error('Batch preflight must pass before jobs are created.');
  }

  const dataSnapshotHash =
    dataset.dataSnapshotHash ??
    createDataSnapshotHash({
      dataset,
      recipients,
      templateSnapshotId: templateSnapshot.id,
    });

  return BatchGenerationDefinitionV1Schema.parse({
    version: 1,
    id: input.id,
    status: 'draft',
    tenantId: input.tenantId,
    actorId: input.actorId,
    templateSnapshotId: templateSnapshot.id,
    templateId: templateSnapshot.templateId,
    templateVersion: templateSnapshot.templateVersion,
    templateSnapshot,
    dataset,
    recipients,
    dataSnapshotHash,
    mode: 'batch',
    renderer: input.renderer ?? 'docraptor',
    preflight,
    createdAt: input.createdAt,
  });
}

export function createBatchDocumentJobs(
  input: CreateBatchDocumentJobsInput,
): readonly BatchDocumentJobV1[] {
  const definition = BatchGenerationDefinitionV1Schema.parse(input.definition);
  const maxAttempts = input.maxAttempts ?? 3;

  return definition.recipients.map((recipient) => {
    const dataSnapshotHash =
      recipient.dataSnapshotHash ??
      createRecipientSnapshotHash({
        batchId: definition.id,
        dataset: definition.dataset,
        recipient,
        templateSnapshot: definition.templateSnapshot,
      });

    return BatchDocumentJobV1Schema.parse({
      version: 1,
      id: createBatchDocumentJobId(definition.id, recipient.id),
      batchId: definition.id,
      recipient,
      templateId: definition.templateId,
      templateVersion: definition.templateVersion,
      templateSnapshotId: definition.templateSnapshotId,
      status: 'queued',
      attempt: 1,
      maxAttempts,
      renderer: definition.renderer,
      dataSnapshotHash,
      artifacts: [],
      createdAt: input.now,
      updatedAt: input.now,
    });
  });
}

export function createBatchGenerationRun(
  input: CreateBatchGenerationRunInput,
): BatchGenerationRunV1 {
  const definition = BatchGenerationDefinitionV1Schema.parse(input.definition);
  const jobs = z.array(BatchDocumentJobV1Schema).parse(input.jobs);
  const progress = summarizeBatchProgress(jobs);

  return BatchGenerationRunV1Schema.parse({
    version: 1,
    id: definition.id,
    templateId: definition.templateId,
    templateVersion: definition.templateVersion,
    templateSnapshotId: definition.templateSnapshotId,
    tenantId: definition.tenantId,
    actorId: definition.actorId,
    status: resolveBatchGenerationStatus(jobs, definition.status),
    dataset: definition.dataset,
    dataSnapshotHash: definition.dataSnapshotHash,
    jobIds: jobs.map((job) => job.id),
    progress,
    preflight: definition.preflight,
    createdAt: definition.createdAt ?? input.now,
    updatedAt: input.now,
  });
}

export function transitionBatchDocumentJob(
  input: TransitionBatchDocumentJobInput,
): BatchDocumentJobV1 {
  const job = BatchDocumentJobV1Schema.parse(input.job);
  const artifacts = input.artifacts ?? job.artifacts;
  const failureReason =
    input.status === 'failed'
      ? BatchFailureReasonSchema.parse(input.failureReason)
      : undefined;

  if (input.status === 'failed' && input.failureReason === undefined) {
    throw new Error('Failed batch document jobs require a failure reason.');
  }

  if (input.status === 'retry_queued') {
    throw new Error(
      'Use createRetryBatchDocumentJob to move failed jobs into retry_queued.',
    );
  }

  return BatchDocumentJobV1Schema.parse({
    ...job,
    status: input.status,
    renderJobId: input.renderJobId ?? job.renderJobId,
    failureReason,
    artifacts,
    updatedAt: input.now ?? job.updatedAt,
  });
}

export function createRetryBatchDocumentJob(
  input: CreateRetryBatchDocumentJobInput,
): BatchDocumentJobV1 {
  const job = BatchDocumentJobV1Schema.parse(input.job);

  if (job.status !== 'failed') {
    throw new Error('Only failed batch document jobs can be retried.');
  }

  if (!job.failureReason?.retryable) {
    throw new Error(
      'Only retryable batch document job failures can be retried.',
    );
  }

  if (job.attempt >= job.maxAttempts) {
    throw new Error('Batch document job has reached the maximum retry count.');
  }

  return BatchDocumentJobV1Schema.parse({
    ...job,
    status: 'retry_queued',
    attempt: job.attempt + 1,
    failureReason: undefined,
    artifacts: [],
    updatedAt: input.now ?? job.updatedAt,
  });
}

export function cancelBatchGenerationRun(
  input: CancelBatchGenerationRunInput,
): CancelBatchGenerationRunResult {
  const run = BatchGenerationRunV1Schema.parse(input.run);
  const jobs = z.array(BatchDocumentJobV1Schema).parse(input.jobs);
  const canceledJobs = jobs.map((job) => {
    if (isTerminalBatchDocumentJob(job)) {
      return job;
    }

    return BatchDocumentJobV1Schema.parse({
      ...job,
      status: 'canceled',
      updatedAt: input.now ?? job.updatedAt,
    });
  });
  const progress = summarizeBatchProgress(canceledJobs);
  const canceledRun = BatchGenerationRunV1Schema.parse({
    ...run,
    status: 'canceled',
    progress,
    updatedAt: input.now ?? run.updatedAt,
  });

  return {
    jobs: canceledJobs,
    run: canceledRun,
  };
}

export function summarizeBatchProgress(
  jobs: readonly BatchDocumentJobV1[],
): BatchProgressSummary {
  const counts = {
    canceled: 0,
    failed: 0,
    pending: 0,
    retryQueued: 0,
    running: 0,
    succeeded: 0,
    total: jobs.length,
  };

  for (const job of jobs) {
    switch (job.status) {
      case 'queued':
        counts.pending += 1;
        break;
      case 'retry_queued':
        counts.retryQueued += 1;
        break;
      case 'running':
        counts.running += 1;
        break;
      case 'succeeded':
        counts.succeeded += 1;
        break;
      case 'failed':
        counts.failed += 1;
        break;
      case 'canceled':
        counts.canceled += 1;
        break;
    }
  }

  const completed = counts.succeeded + counts.failed + counts.canceled;
  const completionRatio =
    counts.total === 0 ? 0 : roundToFourDecimals(completed / counts.total);

  return BatchProgressSummarySchema.parse({
    ...counts,
    completionRatio,
  });
}

export function createBatchResultManifest(
  input: CreateBatchManifestInput,
): BatchResultManifestV1 {
  const run = BatchGenerationRunV1Schema.parse(input.run);
  const jobs = z.array(BatchDocumentJobV1Schema).parse(input.jobs);
  const artifacts = jobs.flatMap((job) => job.artifacts);
  const failures = jobs.flatMap((job) =>
    job.failureReason === undefined ? [] : [job.failureReason],
  );

  return BatchResultManifestV1Schema.parse({
    version: 1,
    batchId: run.id,
    templateId: run.templateId,
    templateVersion: run.templateVersion,
    templateSnapshotId: run.templateSnapshotId,
    tenantId: run.tenantId,
    actorId: run.actorId,
    status: resolveBatchGenerationStatus(jobs, run.status),
    generatedAt: input.now,
    progress: summarizeBatchProgress(jobs),
    jobs: jobs.map((job) => ({
      id: job.id,
      recipientId: job.recipient.id,
      status: job.status,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
      artifactIds: job.artifacts.map((artifact) => artifact.id),
      failureReason: job.failureReason,
    })),
    failures,
    artifacts,
  });
}

export function createBatchDownloadManifest(
  input: CreateBatchManifestInput,
): BatchDownloadManifestV1 {
  const run = BatchGenerationRunV1Schema.parse(input.run);
  const jobs = z.array(BatchDocumentJobV1Schema).parse(input.jobs);
  const artifacts = jobs.flatMap((job) =>
    job.status === 'succeeded' ? job.artifacts : [],
  );
  const sizeBytes = artifacts.reduce(
    (total, artifact) => total + artifact.sizeBytes,
    0,
  );
  const failures = jobs.flatMap((job) =>
    job.failureReason === undefined ? [] : [job.failureReason],
  );

  return BatchDownloadManifestV1Schema.parse({
    version: 1,
    batchId: run.id,
    kind: 'zip',
    generatedAt: input.now,
    artifactCount: artifacts.length,
    sizeBytes,
    artifacts,
    failures,
  });
}

function resolveBatchGenerationStatus(
  jobs: readonly BatchDocumentJobV1[],
  fallback: BatchGenerationStatus,
): BatchGenerationStatus {
  if (jobs.length === 0) {
    return fallback;
  }

  const progress = summarizeBatchProgress(jobs);
  const active = progress.pending + progress.running + progress.retryQueued;
  const completed = progress.succeeded + progress.failed + progress.canceled;

  if (progress.canceled === progress.total) {
    return 'canceled';
  }

  if (active > 0 && completed > 0) {
    return 'partial_success';
  }

  if (active > 0) {
    return progress.running > 0 ? 'running' : 'queued';
  }

  if (progress.succeeded === progress.total) {
    return 'completed';
  }

  if (progress.failed === progress.total) {
    return 'failed';
  }

  if (
    progress.canceled > 0 &&
    progress.succeeded === 0 &&
    progress.failed === 0
  ) {
    return 'canceled';
  }

  return 'partial_success';
}

function createRecipientSnapshotHash(input: {
  readonly batchId: string;
  readonly dataset: BatchDatasetReference;
  readonly recipient: BatchRecipientReference;
  readonly templateSnapshot: PublishedTemplateSnapshotV1;
}): DataSnapshotHash {
  return createDataSnapshotHash({
    batchId: input.batchId,
    dataset: input.dataset,
    recipient: input.recipient,
    templateSnapshotId: input.templateSnapshot.id,
    templateVersion: input.templateSnapshot.templateVersion,
  } satisfies JsonValue);
}

function createBatchDocumentJobId(
  batchId: string,
  recipientId: string,
): string {
  return `${batchId}:${recipientId}`;
}

function isTerminalBatchDocumentJob(job: BatchDocumentJobV1): boolean {
  return (
    job.status === 'succeeded' ||
    job.status === 'failed' ||
    job.status === 'canceled'
  );
}

function roundToFourDecimals(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
