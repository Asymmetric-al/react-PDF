import { z } from 'zod';
import {
  IdentifierSchema,
  IsoDateTimeSchema,
  JsonObjectSchema,
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
  PositiveIntegerSchema,
} from './primitives';
import {
  DocumentEngineSchema,
  type DocumentTemplateV1,
  DocumentTemplateV1Schema,
} from './template';

export const TemplateLifecycleStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
]);

export type TemplateLifecycleStatus = z.infer<
  typeof TemplateLifecycleStatusSchema
>;

export const TemplateLifecycleEventSchema = z.enum([
  'created',
  'updated',
  'published',
  'archived',
  'restored',
  'duplicated',
]);

export type TemplateLifecycleEvent = z.infer<
  typeof TemplateLifecycleEventSchema
>;

export const TemplateLifecycleCheckStatusSchema = z.enum([
  'not_run',
  'passed',
  'warning',
  'failed',
]);

export type TemplateLifecycleCheckStatus = z.infer<
  typeof TemplateLifecycleCheckStatusSchema
>;

export const TemplateLifecycleCheckSchema = z
  .object({
    status: TemplateLifecycleCheckStatusSchema.default('not_run'),
    checkedAt: IsoDateTimeSchema.optional(),
    diagnosticCount: NonNegativeIntegerSchema.default(0),
    errorCount: NonNegativeIntegerSchema.default(0),
    warningCount: NonNegativeIntegerSchema.default(0),
    summary: JsonObjectSchema.optional(),
  })
  .strict()
  .superRefine((check, context) => {
    if (check.status !== 'failed' && check.errorCount > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Only failed checks may include blocking errors.',
        path: ['errorCount'],
      });
    }
  });

export type TemplateLifecycleCheck = z.infer<
  typeof TemplateLifecycleCheckSchema
>;
export type TemplateLifecycleCheckInput = z.input<
  typeof TemplateLifecycleCheckSchema
>;

export const TemplateLifecycleEngineMetadataSchema = z
  .object({
    engine: DocumentEngineSchema.default('asym_pdf_document_builder'),
    schemaVersion: PositiveIntegerSchema.default(1),
    legacyTemplateId: IdentifierSchema.optional(),
    migrationId: IdentifierSchema.optional(),
  })
  .strict();

export type TemplateLifecycleEngineMetadata = z.infer<
  typeof TemplateLifecycleEngineMetadataSchema
>;
export type TemplateLifecycleEngineMetadataInput = z.input<
  typeof TemplateLifecycleEngineMetadataSchema
>;

export const TemplateLifecycleChangelogEntrySchema = z
  .object({
    id: IdentifierSchema,
    event: TemplateLifecycleEventSchema,
    at: IsoDateTimeSchema,
    actorId: IdentifierSchema.optional(),
    message: NonEmptyStringSchema.optional(),
    changes: z.array(NonEmptyStringSchema).default([]),
    metadata: JsonObjectSchema.default({}),
  })
  .strict();

export type TemplateLifecycleChangelogEntry = z.infer<
  typeof TemplateLifecycleChangelogEntrySchema
>;

export const TemplateLifecycleRecordV1Schema = z
  .object({
    version: z.literal(1),
    templateId: IdentifierSchema,
    status: TemplateLifecycleStatusSchema.default('draft'),
    currentDraftId: IdentifierSchema.optional(),
    currentDraftVersion: PositiveIntegerSchema.default(1),
    latestVersion: PositiveIntegerSchema.default(1),
    currentPublishedVersion: PositiveIntegerSchema.optional(),
    currentPublishedSnapshotId: IdentifierSchema.optional(),
    engine: TemplateLifecycleEngineMetadataSchema,
    validation: TemplateLifecycleCheckSchema.default({
      status: 'not_run',
      diagnosticCount: 0,
      errorCount: 0,
      warningCount: 0,
    }),
    preflight: TemplateLifecycleCheckSchema.default({
      status: 'not_run',
      diagnosticCount: 0,
      errorCount: 0,
      warningCount: 0,
    }),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
    publishedAt: IsoDateTimeSchema.optional(),
    archivedAt: IsoDateTimeSchema.optional(),
    restoredAt: IsoDateTimeSchema.optional(),
    createdByActorId: IdentifierSchema.optional(),
    updatedByActorId: IdentifierSchema.optional(),
    publishedByActorId: IdentifierSchema.optional(),
    archivedByActorId: IdentifierSchema.optional(),
    restoredByActorId: IdentifierSchema.optional(),
    changelog: z.array(TemplateLifecycleChangelogEntrySchema).default([]),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.currentDraftVersion > record.latestVersion) {
      context.addIssue({
        code: 'custom',
        message: 'currentDraftVersion cannot be greater than latestVersion.',
        path: ['currentDraftVersion'],
      });
    }

    if (
      record.status === 'published' &&
      (record.currentPublishedVersion === undefined ||
        record.currentPublishedSnapshotId === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Published lifecycle records require a published snapshot.',
        path: ['currentPublishedSnapshotId'],
      });
    }
  });

export type TemplateLifecycleRecordV1 = z.infer<
  typeof TemplateLifecycleRecordV1Schema
>;

export const PublishedTemplateSnapshotV1Schema = z
  .object({
    version: z.literal(1),
    id: IdentifierSchema,
    templateId: IdentifierSchema,
    templateVersion: PositiveIntegerSchema,
    status: z.literal('published'),
    immutable: z.literal(true),
    template: DocumentTemplateV1Schema,
    engine: TemplateLifecycleEngineMetadataSchema,
    validation: TemplateLifecycleCheckSchema,
    preflight: TemplateLifecycleCheckSchema,
    publishedAt: IsoDateTimeSchema,
    publishedByActorId: IdentifierSchema.optional(),
    changelog: z.array(TemplateLifecycleChangelogEntrySchema).default([]),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (snapshot.template.id !== snapshot.templateId) {
      context.addIssue({
        code: 'custom',
        message: 'Published snapshot template id must match templateId.',
        path: ['template', 'id'],
      });
    }

    if (snapshot.template.status !== 'published') {
      context.addIssue({
        code: 'custom',
        message: 'Published snapshots must contain a published template.',
        path: ['template', 'status'],
      });
    }

    if (snapshot.template.engine !== snapshot.engine.engine) {
      context.addIssue({
        code: 'custom',
        message: 'Published snapshot engine metadata must match the template.',
        path: ['engine', 'engine'],
      });
    }

    if (!checkAllowsPublish(snapshot.validation)) {
      context.addIssue({
        code: 'custom',
        message: 'Published snapshots require passing validation.',
        path: ['validation', 'status'],
      });
    }

    if (!checkAllowsPublish(snapshot.preflight)) {
      context.addIssue({
        code: 'custom',
        message: 'Published snapshots require passing preflight.',
        path: ['preflight', 'status'],
      });
    }
  });

export type PublishedTemplateSnapshotV1 = z.infer<
  typeof PublishedTemplateSnapshotV1Schema
>;

export interface CreateTemplateLifecycleInput {
  readonly template: unknown;
  readonly now: string;
  readonly actorId?: string;
  readonly draftId?: string;
  readonly engine?: TemplateLifecycleEngineMetadataInput;
  readonly changelogMessage?: string;
}

export interface PublishTemplateVersionInput {
  readonly lifecycle: TemplateLifecycleRecordV1;
  readonly draft: unknown;
  readonly now: string;
  readonly actorId?: string;
  readonly snapshotId?: string;
  readonly validation: TemplateLifecycleCheckInput;
  readonly preflight: TemplateLifecycleCheckInput;
  readonly changelogMessage?: string;
}

export interface PublishTemplateVersionResult {
  readonly lifecycle: TemplateLifecycleRecordV1;
  readonly snapshot: PublishedTemplateSnapshotV1;
}

export interface UpdateTemplateDraftInput {
  readonly lifecycle: TemplateLifecycleRecordV1;
  readonly template: unknown;
  readonly now: string;
  readonly actorId?: string;
  readonly draftId?: string;
  readonly changelogMessage?: string;
}

export interface UpdateTemplateDraftResult {
  readonly lifecycle: TemplateLifecycleRecordV1;
  readonly draft: DocumentTemplateV1;
}

export interface DuplicateTemplateLifecycleInput {
  readonly sourceLifecycle: TemplateLifecycleRecordV1;
  readonly sourceTemplate: unknown;
  readonly newTemplateId: string;
  readonly now: string;
  readonly actorId?: string;
  readonly name?: string;
  readonly draftId?: string;
  readonly changelogMessage?: string;
}

export interface DuplicateTemplateLifecycleResult {
  readonly lifecycle: TemplateLifecycleRecordV1;
  readonly draft: DocumentTemplateV1;
}

export interface ArchiveTemplateLifecycleInput {
  readonly lifecycle: TemplateLifecycleRecordV1;
  readonly now: string;
  readonly actorId?: string;
  readonly changelogMessage?: string;
}

export interface RestoreTemplateLifecycleInput {
  readonly lifecycle: TemplateLifecycleRecordV1;
  readonly now: string;
  readonly actorId?: string;
  readonly changelogMessage?: string;
}

export function createTemplateLifecycle(
  input: CreateTemplateLifecycleInput,
): TemplateLifecycleRecordV1 {
  const template = DocumentTemplateV1Schema.parse(input.template);
  const engine = TemplateLifecycleEngineMetadataSchema.parse(
    input.engine ?? {
      engine: template.engine,
      schemaVersion: 1,
    },
  );
  const draftId = input.draftId ?? createDraftId(template.id, 1);
  const changelog = [
    createChangelogEntry({
      actorId: input.actorId,
      at: input.now,
      event: 'created',
      message: input.changelogMessage,
      sequence: 1,
      templateId: template.id,
      templateVersion: 1,
    }),
  ];

  return TemplateLifecycleRecordV1Schema.parse({
    version: 1,
    templateId: template.id,
    status: 'draft',
    currentDraftId: draftId,
    currentDraftVersion: 1,
    latestVersion: 1,
    engine,
    validation: createLifecycleCheck(),
    preflight: createLifecycleCheck(),
    createdAt: input.now,
    updatedAt: input.now,
    createdByActorId: input.actorId,
    changelog,
  });
}

export function publishTemplateVersion(
  input: PublishTemplateVersionInput,
): PublishTemplateVersionResult {
  const lifecycle = TemplateLifecycleRecordV1Schema.parse(input.lifecycle);
  const draft = DocumentTemplateV1Schema.parse(input.draft);
  const validation = createLifecycleCheck(input.validation);
  const preflight = createLifecycleCheck(input.preflight);

  if (lifecycle.status === 'archived') {
    throw new Error('Archived templates must be restored before publishing.');
  }

  if (
    lifecycle.engine.engine !== 'asym_pdf_document_builder' ||
    draft.engine !== 'asym_pdf_document_builder'
  ) {
    throw new Error('Only native Asym PDF templates can be published.');
  }

  if (draft.status !== 'draft') {
    throw new Error('Only draft templates can be published.');
  }

  if (!checkAllowsPublish(validation)) {
    throw new Error('Template validation must pass before publish.');
  }

  if (!checkAllowsPublish(preflight)) {
    throw new Error('Template preflight must pass before publish.');
  }

  const templateVersion = lifecycle.currentDraftVersion;
  const snapshotId =
    input.snapshotId ?? createPublishedSnapshotId(draft.id, templateVersion);
  const publishedTemplate = DocumentTemplateV1Schema.parse({
    ...cloneJson(draft),
    status: 'published',
    metadata: {
      ...draft.metadata,
      updatedAt: input.now,
    },
  });
  const publishedEntry = createChangelogEntry({
    actorId: input.actorId,
    at: input.now,
    event: 'published',
    message: input.changelogMessage,
    sequence: lifecycle.changelog.length + 1,
    templateId: lifecycle.templateId,
    templateVersion,
  });
  const nextChangelog = [...lifecycle.changelog, publishedEntry];
  const nextLifecycle = TemplateLifecycleRecordV1Schema.parse({
    ...lifecycle,
    status: 'published',
    currentPublishedVersion: templateVersion,
    currentPublishedSnapshotId: snapshotId,
    validation,
    preflight,
    updatedAt: input.now,
    publishedAt: input.now,
    updatedByActorId: input.actorId,
    publishedByActorId: input.actorId,
    changelog: nextChangelog,
  });
  const snapshot = PublishedTemplateSnapshotV1Schema.parse({
    version: 1,
    id: snapshotId,
    templateId: lifecycle.templateId,
    templateVersion,
    status: 'published',
    immutable: true,
    template: publishedTemplate,
    engine: lifecycle.engine,
    validation,
    preflight,
    publishedAt: input.now,
    publishedByActorId: input.actorId,
    changelog: nextChangelog,
  });

  return {
    lifecycle: nextLifecycle,
    snapshot: deepFreeze(snapshot),
  };
}

export function updateTemplateDraft(
  input: UpdateTemplateDraftInput,
): UpdateTemplateDraftResult {
  const lifecycle = TemplateLifecycleRecordV1Schema.parse(input.lifecycle);
  const template = DocumentTemplateV1Schema.parse(input.template);

  if (lifecycle.status === 'archived') {
    throw new Error('Archived templates must be restored before editing.');
  }

  if (template.id !== lifecycle.templateId) {
    throw new Error('Draft template id must match the lifecycle template id.');
  }

  const nextVersion = lifecycle.latestVersion + 1;
  const draft = DocumentTemplateV1Schema.parse({
    ...cloneJson(template),
    engine: lifecycle.engine.engine,
    status: 'draft',
    metadata: {
      ...template.metadata,
      updatedAt: input.now,
    },
  });
  const updatedEntry = createChangelogEntry({
    actorId: input.actorId,
    at: input.now,
    event: 'updated',
    message: input.changelogMessage,
    sequence: lifecycle.changelog.length + 1,
    templateId: lifecycle.templateId,
    templateVersion: nextVersion,
  });
  const nextLifecycle = TemplateLifecycleRecordV1Schema.parse({
    ...lifecycle,
    status: 'draft',
    currentDraftId: input.draftId ?? createDraftId(template.id, nextVersion),
    currentDraftVersion: nextVersion,
    latestVersion: nextVersion,
    validation: createLifecycleCheck(),
    preflight: createLifecycleCheck(),
    updatedAt: input.now,
    updatedByActorId: input.actorId,
    changelog: [...lifecycle.changelog, updatedEntry],
  });

  return {
    draft,
    lifecycle: nextLifecycle,
  };
}

export function duplicateTemplateLifecycle(
  input: DuplicateTemplateLifecycleInput,
): DuplicateTemplateLifecycleResult {
  const sourceLifecycle = TemplateLifecycleRecordV1Schema.parse(
    input.sourceLifecycle,
  );
  const sourceTemplate = DocumentTemplateV1Schema.parse(input.sourceTemplate);
  const draft = DocumentTemplateV1Schema.parse({
    ...cloneJson(sourceTemplate),
    id: input.newTemplateId,
    name: input.name ?? `${sourceTemplate.name} Copy`,
    status: 'draft',
    metadata: {
      ...sourceTemplate.metadata,
      createdAt: input.now,
      updatedAt: input.now,
    },
  });
  const created = createTemplateLifecycle({
    actorId: input.actorId,
    draftId: input.draftId ?? createDraftId(input.newTemplateId, 1),
    engine: sourceLifecycle.engine,
    now: input.now,
    template: draft,
  });
  const duplicatedEntry = createChangelogEntry({
    actorId: input.actorId,
    at: input.now,
    event: 'duplicated',
    message: input.changelogMessage,
    metadata: {
      sourceTemplateId: sourceLifecycle.templateId,
    },
    sequence: created.changelog.length + 1,
    templateId: input.newTemplateId,
    templateVersion: 1,
  });
  const lifecycle = TemplateLifecycleRecordV1Schema.parse({
    ...created,
    changelog: [...created.changelog, duplicatedEntry],
  });

  return {
    draft,
    lifecycle,
  };
}

export function archiveTemplateLifecycle(
  input: ArchiveTemplateLifecycleInput,
): TemplateLifecycleRecordV1 {
  const lifecycle = TemplateLifecycleRecordV1Schema.parse(input.lifecycle);

  if (lifecycle.status === 'archived') {
    return lifecycle;
  }

  return TemplateLifecycleRecordV1Schema.parse({
    ...lifecycle,
    status: 'archived',
    archivedAt: input.now,
    archivedByActorId: input.actorId,
    updatedAt: input.now,
    updatedByActorId: input.actorId,
    changelog: [
      ...lifecycle.changelog,
      createChangelogEntry({
        actorId: input.actorId,
        at: input.now,
        event: 'archived',
        message: input.changelogMessage,
        sequence: lifecycle.changelog.length + 1,
        templateId: lifecycle.templateId,
        templateVersion: lifecycle.latestVersion,
      }),
    ],
  });
}

export function restoreTemplateLifecycle(
  input: RestoreTemplateLifecycleInput,
): TemplateLifecycleRecordV1 {
  const lifecycle = TemplateLifecycleRecordV1Schema.parse(input.lifecycle);

  if (lifecycle.status !== 'archived') {
    throw new Error('Only archived templates can be restored.');
  }

  return TemplateLifecycleRecordV1Schema.parse({
    ...lifecycle,
    status: 'draft',
    restoredAt: input.now,
    restoredByActorId: input.actorId,
    updatedAt: input.now,
    updatedByActorId: input.actorId,
    changelog: [
      ...lifecycle.changelog,
      createChangelogEntry({
        actorId: input.actorId,
        at: input.now,
        event: 'restored',
        message: input.changelogMessage,
        sequence: lifecycle.changelog.length + 1,
        templateId: lifecycle.templateId,
        templateVersion: lifecycle.latestVersion,
      }),
    ],
  });
}

export function assertProductionRenderableTemplateSnapshot(
  snapshot: unknown,
): PublishedTemplateSnapshotV1 {
  const result = PublishedTemplateSnapshotV1Schema.safeParse(snapshot);

  if (!result.success) {
    throw new Error(
      'Production rendering requires an immutable published snapshot.',
    );
  }

  return snapshot as PublishedTemplateSnapshotV1;
}

export function isProductionRenderableTemplateSnapshot(
  snapshot: unknown,
): snapshot is PublishedTemplateSnapshotV1 {
  return PublishedTemplateSnapshotV1Schema.safeParse(snapshot).success;
}

function createLifecycleCheck(
  input?: TemplateLifecycleCheckInput,
): TemplateLifecycleCheck {
  return TemplateLifecycleCheckSchema.parse(input ?? {});
}

function checkAllowsPublish(check: TemplateLifecycleCheck): boolean {
  return check.status === 'passed' || check.status === 'warning';
}

function createDraftId(templateId: string, templateVersion: number): string {
  return `${templateId}:draft:v${templateVersion}`;
}

function createPublishedSnapshotId(
  templateId: string,
  templateVersion: number,
): string {
  return `${templateId}:published:v${templateVersion}`;
}

function createChangelogEntry(input: {
  readonly templateId: string;
  readonly templateVersion: number;
  readonly event: TemplateLifecycleEvent;
  readonly at: string;
  readonly sequence: number;
  readonly actorId?: string;
  readonly message?: string;
  readonly changes?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}): TemplateLifecycleChangelogEntry {
  return TemplateLifecycleChangelogEntrySchema.parse({
    id: `${input.templateId}:${input.event}:v${input.templateVersion}:${input.sequence}`,
    event: input.event,
    at: input.at,
    actorId: input.actorId,
    message: input.message,
    changes: input.changes ?? [],
    metadata: input.metadata ?? {},
  });
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  for (const key of Object.getOwnPropertyNames(value)) {
    const child = (value as Record<string, unknown>)[key];

    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }

  return Object.freeze(value);
}
