import { z } from 'zod';
import {
  IdentifierSchema,
  IsoDateTimeSchema,
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
  UrlSchema,
} from './primitives';

export const PdfSecurityActorSchema = z
  .object({
    type: z.enum(['user', 'system']),
    id: IdentifierSchema.optional(),
  })
  .strict()
  .superRefine((actor, context) => {
    if (actor.type === 'user' && actor.id === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'User actors require an id.',
        path: ['id'],
      });
    }
  });

export type PdfSecurityActor = z.infer<typeof PdfSecurityActorSchema>;
export type PdfSecurityActorInput = z.input<typeof PdfSecurityActorSchema>;

export const PdfSecurityPermissionSchema = z.enum([
  'template.edit',
  'template.publish',
  'render.preview',
  'render.production',
  'batch.start',
  'asset.read',
  'asset.render_safe_url',
]);

export type PdfSecurityPermission = z.infer<typeof PdfSecurityPermissionSchema>;

export const PdfSecurityActionSchema = z.enum([
  'edit_template',
  'publish_template',
  'preview_render',
  'production_render',
  'start_batch',
  'read_asset',
  'resolve_render_safe_url',
]);

export type PdfSecurityAction = z.infer<typeof PdfSecurityActionSchema>;

export const PdfSecurityContextSchema = z
  .object({
    tenantId: IdentifierSchema,
    actor: PdfSecurityActorSchema,
    permissions: z.array(PdfSecurityPermissionSchema).default([]),
  })
  .strict();

export type PdfSecurityContext = z.infer<typeof PdfSecurityContextSchema>;
export type PdfSecurityContextInput = z.input<typeof PdfSecurityContextSchema>;

export const PdfSecurityResourceTypeSchema = z.enum([
  'template',
  'asset',
  'render_artifact',
  'batch',
  'dataset',
]);

export type PdfSecurityResourceType = z.infer<
  typeof PdfSecurityResourceTypeSchema
>;

export const PdfSecurityResourceSchema = z
  .object({
    type: PdfSecurityResourceTypeSchema,
    id: IdentifierSchema.optional(),
    tenantId: IdentifierSchema,
  })
  .strict();

export type PdfSecurityResource = z.infer<typeof PdfSecurityResourceSchema>;
export type PdfSecurityResourceInput = z.input<
  typeof PdfSecurityResourceSchema
>;

export const PdfAuthorizationReasonCodeSchema = z.enum([
  'allowed',
  'missing_permission',
  'tenant_mismatch',
]);

export type PdfAuthorizationReasonCode = z.infer<
  typeof PdfAuthorizationReasonCodeSchema
>;

export const PdfAuthorizationDecisionSchema = z
  .object({
    ok: z.boolean(),
    action: PdfSecurityActionSchema,
    actorId: IdentifierSchema.optional(),
    tenantId: IdentifierSchema,
    resourceTenantId: IdentifierSchema.optional(),
    requiredPermission: PdfSecurityPermissionSchema.optional(),
    reasonCode: PdfAuthorizationReasonCodeSchema.optional(),
    message: NonEmptyStringSchema.optional(),
  })
  .strict()
  .superRefine((decision, context) => {
    if (!decision.ok && decision.reasonCode === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Denied authorization decisions require a reason code.',
        path: ['reasonCode'],
      });
    }
  });

export type PdfAuthorizationDecision = z.infer<
  typeof PdfAuthorizationDecisionSchema
>;

export interface AuthorizePdfSecurityActionInput {
  readonly action: PdfSecurityAction;
  readonly context: PdfSecurityContextInput;
  readonly resource: PdfSecurityResourceInput;
  readonly requiredPermission?: PdfSecurityPermission;
}

export interface PdfPermissionAuthorizationRequest {
  readonly action: PdfSecurityAction;
  readonly resource: PdfSecurityResourceInput;
  readonly context?: PdfSecurityContextInput;
  readonly requiredPermission?: PdfSecurityPermission;
}

export interface PdfPermissionAdapter {
  readonly authorize: (
    request: PdfPermissionAuthorizationRequest,
  ) => PdfAuthorizationDecision | Promise<PdfAuthorizationDecision>;
}

export interface CreateFakePdfPermissionAdapterInput {
  readonly context: PdfSecurityContextInput;
}

export const PdfAssetAccessRequestSchema = z
  .object({
    tenantId: IdentifierSchema,
    actorId: IdentifierSchema.optional(),
    assetId: IdentifierSchema,
    role: z
      .enum(['logo', 'image', 'signature', 'font', 'qr', 'attachment'])
      .optional(),
    purpose: z.enum(['browse', 'preview', 'production_render']),
  })
  .strict();

export type PdfAssetAccessRequest = z.infer<typeof PdfAssetAccessRequestSchema>;
export type PdfAssetAccessRequestInput = z.input<
  typeof PdfAssetAccessRequestSchema
>;

export const PdfSignedRenderUrlRequestSchema = z
  .object({
    tenantId: IdentifierSchema,
    actorId: IdentifierSchema.optional(),
    assetId: IdentifierSchema,
    purpose: z.enum(['browser_preview', 'production_render']),
    expiresInSeconds: NonNegativeIntegerSchema.optional(),
  })
  .strict();

export type PdfSignedRenderUrlRequest = z.infer<
  typeof PdfSignedRenderUrlRequestSchema
>;
export type PdfSignedRenderUrlRequestInput = z.input<
  typeof PdfSignedRenderUrlRequestSchema
>;

export const PdfSignedRenderUrlResultSchema = z
  .object({
    tenantId: IdentifierSchema,
    assetId: IdentifierSchema,
    url: UrlSchema,
    public: z.boolean().default(false),
    expiresAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export type PdfSignedRenderUrlResult = z.infer<
  typeof PdfSignedRenderUrlResultSchema
>;
export type PdfSignedRenderUrlResultInput = z.input<
  typeof PdfSignedRenderUrlResultSchema
>;

export interface PdfAssetAccessAdapter {
  readonly authorizeAssetAccess: (
    request: PdfAssetAccessRequestInput,
  ) => PdfAuthorizationDecision | Promise<PdfAuthorizationDecision>;
  readonly createSignedRenderUrl?: (
    request: PdfSignedRenderUrlRequestInput,
  ) =>
    | PdfSignedRenderUrlResultInput
    | undefined
    | Promise<PdfSignedRenderUrlResultInput | undefined>;
}

export const PdfDataClassificationSchema = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
  'pii',
  'financial_pii',
  'secret',
]);

export type PdfDataClassification = z.infer<typeof PdfDataClassificationSchema>;

export const PdfClassifiedDataPathSchema = z
  .object({
    path: z.array(NonEmptyStringSchema),
    classification: PdfDataClassificationSchema,
    reason: NonEmptyStringSchema,
  })
  .strict();

export type PdfClassifiedDataPath = z.infer<typeof PdfClassifiedDataPathSchema>;

export const PdfSecretLikeTemplateDiagnosticSchema = z
  .object({
    code: z.literal('secret_like_template_value'),
    severity: z.literal('error'),
    path: z.array(NonEmptyStringSchema),
    message: NonEmptyStringSchema,
    reason: NonEmptyStringSchema,
    redactedPreview: NonEmptyStringSchema.optional(),
  })
  .strict();

export type PdfSecretLikeTemplateDiagnostic = z.infer<
  typeof PdfSecretLikeTemplateDiagnosticSchema
>;

const permissionByAction: Readonly<
  Record<PdfSecurityAction, PdfSecurityPermission>
> = {
  edit_template: 'template.edit',
  publish_template: 'template.publish',
  preview_render: 'render.preview',
  production_render: 'render.production',
  start_batch: 'batch.start',
  read_asset: 'asset.read',
  resolve_render_safe_url: 'asset.render_safe_url',
};

const publicOrganizationPathPattern =
  /^organization\.(?:name|address|email|phone|website|url)$/iu;
const secretKeyPattern =
  /api[_-]?key|apikey|authorization|bearer|cookie|password|secret|token|private[_-]?key|client[_-]?secret|webhook[_-]?secret/iu;
const financialPathPattern =
  /donation|gift|payment|invoice|tax|ein|bank|account|routing|credit|card|amount|balance|financial|receipt/iu;
const piiPathPattern =
  /recipient|donor|missionary|person|email|phone|address|full[_-]?name|name/iu;

const secretValuePatterns: readonly RegExp[] = [
  /\b[rs]k_(?:live|test)_[A-Za-z0-9]{8,}\b/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/iu,
  /\b(?:api[_-]?key|authorization|cookie|password|secret|token)\s*[=:]\s*[^\s,;]+/iu,
  /https?:\/\/\S+[?&](?:x-amz-signature|x-amz-credential|x-amz-security-token|x-goog-signature|signature|sig|token|access_token|policy|key-pair-id)=[^\s,;]+/iu,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
];

export function authorizePdfSecurityAction(
  input: AuthorizePdfSecurityActionInput,
): PdfAuthorizationDecision {
  const context = PdfSecurityContextSchema.parse(input.context);
  const resource = PdfSecurityResourceSchema.parse(input.resource);
  const requiredPermission =
    input.requiredPermission ?? permissionByAction[input.action];

  if (context.tenantId !== resource.tenantId) {
    return PdfAuthorizationDecisionSchema.parse({
      action: input.action,
      actorId: context.actor.id,
      message: 'Resource belongs to a different tenant.',
      ok: false,
      reasonCode: 'tenant_mismatch',
      requiredPermission,
      resourceTenantId: resource.tenantId,
      tenantId: context.tenantId,
    });
  }

  if (!context.permissions.includes(requiredPermission)) {
    return PdfAuthorizationDecisionSchema.parse({
      action: input.action,
      actorId: context.actor.id,
      message: `Missing required permission: ${requiredPermission}.`,
      ok: false,
      reasonCode: 'missing_permission',
      requiredPermission,
      resourceTenantId: resource.tenantId,
      tenantId: context.tenantId,
    });
  }

  return PdfAuthorizationDecisionSchema.parse({
    action: input.action,
    actorId: context.actor.id,
    message: 'Authorization allowed by package-level permission contract.',
    ok: true,
    reasonCode: 'allowed',
    requiredPermission,
    resourceTenantId: resource.tenantId,
    tenantId: context.tenantId,
  });
}

export function createFakePdfPermissionAdapter(
  input: CreateFakePdfPermissionAdapterInput,
): PdfPermissionAdapter {
  const context = PdfSecurityContextSchema.parse(input.context);

  return {
    authorize: async (request) =>
      authorizePdfSecurityAction({
        action: request.action,
        context: request.context ?? context,
        requiredPermission: request.requiredPermission,
        resource: request.resource,
      }),
  };
}

export function classifyPdfDataPath(
  path: string | readonly string[],
): PdfClassifiedDataPath {
  const normalizedPath = normalizePath(path);
  const joinedPath = normalizedPath.join('.');

  if (normalizedPath.some((segment) => isSecretLikeKey(segment))) {
    return PdfClassifiedDataPathSchema.parse({
      classification: 'secret',
      path: normalizedPath,
      reason: 'The data path contains a secret-like key.',
    });
  }

  if (publicOrganizationPathPattern.test(joinedPath)) {
    return PdfClassifiedDataPathSchema.parse({
      classification: 'public',
      path: normalizedPath,
      reason: 'Organization identity fields are public document metadata.',
    });
  }

  if (financialPathPattern.test(joinedPath)) {
    return PdfClassifiedDataPathSchema.parse({
      classification: 'financial_pii',
      path: normalizedPath,
      reason:
        'The data path references donor, gift, receipt, tax, or financial values.',
    });
  }

  if (piiPathPattern.test(joinedPath)) {
    return PdfClassifiedDataPathSchema.parse({
      classification: 'pii',
      path: normalizedPath,
      reason:
        'The data path references an identifiable person or contact field.',
    });
  }

  return PdfClassifiedDataPathSchema.parse({
    classification: 'internal',
    path: normalizedPath,
    reason:
      'The data path is package-internal unless classified by an adapter.',
  });
}

export function findSecretLikeTemplateValues(
  template: unknown,
): readonly PdfSecretLikeTemplateDiagnostic[] {
  const diagnostics: PdfSecretLikeTemplateDiagnostic[] = [];

  collectSecretLikeTemplateDiagnostics(template, [], diagnostics);

  return diagnostics;
}

export function redactPdfSecurityLogValue<T>(
  value: T,
  options: { readonly redactValues?: readonly string[] } = {},
): T {
  return redactUnknown(value, options.redactValues ?? []) as T;
}

export function redactRenderMetadataForClient<T>(
  metadata: T,
  options: { readonly redactValues?: readonly string[] } = {},
): T {
  return redactPdfSecurityLogValue(metadata, options);
}

function collectSecretLikeTemplateDiagnostics(
  value: unknown,
  path: readonly string[],
  diagnostics: PdfSecretLikeTemplateDiagnostic[],
): void {
  if (typeof value === 'string') {
    const reason = getSecretLikeValueReason(value);

    if (reason !== undefined) {
      diagnostics.push(
        createSecretLikeTemplateDiagnostic({
          path,
          reason,
          value,
        }),
      );
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectSecretLikeTemplateDiagnostics(
        item,
        [...path, String(index)],
        diagnostics,
      );
    });
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  for (const [key, item] of entries) {
    const itemPath = [...path, key];

    if (isSecretLikeKey(key)) {
      diagnostics.push(
        createSecretLikeTemplateDiagnostic({
          path: itemPath,
          reason: `The template key "${key}" looks like a credential field.`,
          value: typeof item === 'string' ? item : undefined,
        }),
      );
      continue;
    }

    collectSecretLikeTemplateDiagnostics(item, itemPath, diagnostics);
  }
}

function createSecretLikeTemplateDiagnostic(input: {
  readonly path: readonly string[];
  readonly reason: string;
  readonly value?: string;
}): PdfSecretLikeTemplateDiagnostic {
  return PdfSecretLikeTemplateDiagnosticSchema.parse({
    code: 'secret_like_template_value',
    message:
      'Template JSON contains a secret-like value. Store credentials and signed URLs in server-side adapters, not template source.',
    path: input.path,
    reason: input.reason,
    redactedPreview:
      input.value === undefined ? undefined : redactString(input.value, []),
    severity: 'error',
  });
}

function normalizePath(path: string | readonly string[]): string[] {
  const rawSegments: readonly string[] =
    typeof path === 'string' ? path.split('.') : path;
  const segments = rawSegments
    .map((segment: string) => String(segment).trim())
    .filter((segment) => segment.length > 0);

  return segments.length > 0 ? segments : ['value'];
}

function isSecretLikeKey(key: string): boolean {
  return secretKeyPattern.test(key);
}

function getSecretLikeValueReason(value: string): string | undefined {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (secretValuePatterns.some((pattern) => pattern.test(trimmed))) {
    return 'The value matches a credential or token-like pattern.';
  }

  return undefined;
}

function redactUnknown(
  value: unknown,
  redactValues: readonly string[],
): unknown {
  if (typeof value === 'string') {
    return redactString(value, redactValues);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item, redactValues));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (isSecretLikeKey(key)) {
          return [key, '[redacted]'];
        }

        return [key, redactUnknown(item, redactValues)];
      }),
    );
  }

  return value;
}

function redactString(value: string, redactValues: readonly string[]): string {
  let redacted = value;

  for (const secret of redactValues) {
    if (secret.length > 0) {
      redacted = redacted.split(secret).join('[redacted]');
    }
  }

  redacted = redacted.replace(
    /\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,
    'Bearer [redacted]',
  );
  redacted = redacted.replace(
    /\b[rs]k_(?:live|test)_[A-Za-z0-9]+/gu,
    '[redacted]',
  );
  redacted = redacted.replace(/\bAKIA[0-9A-Z]{16}\b/gu, '[redacted]');
  redacted = redacted.replace(
    /(api[_-]?key|authorization|cookie|password|secret|token)(\s*[=:]\s*)[^\s,;]+/giu,
    '$1$2[redacted]',
  );
  redacted = redacted.replace(
    /([?&](?:x-amz-signature|x-amz-credential|x-amz-security-token|x-goog-signature|signature|sig|token|access_token|policy|key-pair-id)=)[^&#\s]+/giu,
    '$1[redacted]',
  );

  return redacted;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
