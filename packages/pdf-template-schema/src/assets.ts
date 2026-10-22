import { z } from 'zod';
import {
  IdentifierSchema,
  NonEmptyStringSchema,
  PositiveIntegerSchema,
  UrlSchema,
} from './primitives';

export const DocumentAssetRoleSchema = z.enum([
  'logo',
  'image',
  'signature',
  'font',
  'qr',
  'attachment',
]);

export type DocumentAssetRole = z.infer<typeof DocumentAssetRoleSchema>;

export const AssetRoleSchema = DocumentAssetRoleSchema;

export const DocumentAssetUrlClassificationSchema = z.enum([
  'render_safe_public',
  'signed_render_url',
  'browser_blob',
  'data_url',
  'private_app_session',
  'non_https_url',
  'unsafe_scheme',
  'invalid_url',
]);

export type DocumentAssetUrlClassification = z.infer<
  typeof DocumentAssetUrlClassificationSchema
>;

export interface DocumentAssetUrlClassificationResult {
  readonly url: string;
  readonly classification: DocumentAssetUrlClassification;
  readonly safeForProductionRender: boolean;
  readonly reason: string;
  readonly redactedUrl?: string;
}

export const DocumentAssetAlignmentSchema = z.enum([
  'left',
  'center',
  'right',
  'full_width',
]);

export type DocumentAssetAlignment = z.infer<
  typeof DocumentAssetAlignmentSchema
>;

export const DocumentAssetSourceMetadataSchema = z
  .object({
    provider: NonEmptyStringSchema.optional(),
    sourceId: NonEmptyStringSchema.optional(),
    version: NonEmptyStringSchema.optional(),
    checksum: NonEmptyStringSchema.optional(),
    uploadedBy: IdentifierSchema.optional(),
  })
  .strict();

export type DocumentAssetSourceMetadata = z.infer<
  typeof DocumentAssetSourceMetadataSchema
>;

export const DocumentAssetReferenceSchema = z
  .object({
    id: IdentifierSchema,
    role: DocumentAssetRoleSchema,
    assetId: IdentifierSchema.optional(),
    url: UrlSchema.optional(),
    renderSafeUrl: UrlSchema.optional(),
    mimeType: NonEmptyStringSchema.optional(),
    altText: z.string().optional(),
    width: PositiveIntegerSchema.optional(),
    height: PositiveIntegerSchema.optional(),
    alignment: DocumentAssetAlignmentSchema.default('left'),
    linkUrl: UrlSchema.optional(),
    renderSafe: z.boolean().default(false),
    required: z.boolean().default(true),
    tenantId: IdentifierSchema.optional(),
    source: DocumentAssetSourceMetadataSchema.optional(),
  })
  .strict()
  .superRefine((asset, context) => {
    const hasResolvableReference =
      asset.assetId !== undefined ||
      asset.url !== undefined ||
      asset.renderSafeUrl !== undefined;

    if (!hasResolvableReference) {
      context.addIssue({
        code: 'custom',
        message:
          'Asset references require assetId, url, or renderSafeUrl for adapter resolution.',
        path: ['assetId'],
      });
    }

    if (asset.renderSafe && hasBlobUrl(asset.url)) {
      context.addIssue({
        code: 'custom',
        message:
          'Render-safe asset references cannot use browser blob URLs for production rendering.',
        path: ['url'],
      });
    }

    if (hasBlobUrl(asset.renderSafeUrl)) {
      context.addIssue({
        code: 'custom',
        message:
          'Render-safe asset URLs cannot be browser blob URLs for production rendering.',
        path: ['renderSafeUrl'],
      });
    }
  });

export type DocumentAssetReference = z.infer<
  typeof DocumentAssetReferenceSchema
>;
export type DocumentAssetReferenceInput = z.input<
  typeof DocumentAssetReferenceSchema
>;

export const AssetReferenceSchema = DocumentAssetReferenceSchema;
export type AssetReference = DocumentAssetReference;

export const DocumentAssetImageAttributesSchema = z
  .object({
    asset: DocumentAssetReferenceSchema.optional(),
    assetId: IdentifierSchema.optional(),
    id: IdentifierSchema.optional(),
    role: DocumentAssetRoleSchema.default('image'),
    url: UrlSchema.optional(),
    renderSafeUrl: UrlSchema.optional(),
    mimeType: NonEmptyStringSchema.optional(),
    altText: z.string().optional(),
    width: PositiveIntegerSchema.optional(),
    height: PositiveIntegerSchema.optional(),
    alignment: DocumentAssetAlignmentSchema.default('left'),
    linkUrl: UrlSchema.optional(),
    renderSafe: z.boolean().default(false),
    required: z.boolean().default(true),
    tenantId: IdentifierSchema.optional(),
    source: DocumentAssetSourceMetadataSchema.optional(),
  })
  .strict()
  .superRefine((attrs, context) => {
    const hasAssetContract = attrs.asset !== undefined;
    const hasReference =
      attrs.assetId !== undefined ||
      attrs.url !== undefined ||
      attrs.renderSafeUrl !== undefined;

    if (!hasAssetContract && !hasReference) {
      context.addIssue({
        code: 'custom',
        message:
          'Asset image nodes require a structured asset, assetId, url, or renderSafeUrl.',
        path: ['asset'],
      });
    }

    if (attrs.renderSafe && hasBlobUrl(attrs.url)) {
      context.addIssue({
        code: 'custom',
        message:
          'Render-safe asset image nodes cannot use browser blob URLs for production rendering.',
        path: ['url'],
      });
    }

    if (hasBlobUrl(attrs.renderSafeUrl)) {
      context.addIssue({
        code: 'custom',
        message:
          'Render-safe asset image node URLs cannot be browser blob URLs for production rendering.',
        path: ['renderSafeUrl'],
      });
    }
  });

export type DocumentAssetImageAttributes = z.infer<
  typeof DocumentAssetImageAttributesSchema
>;
export type DocumentAssetImageAttributesInput = z.input<
  typeof DocumentAssetImageAttributesSchema
>;

export const DocumentAssetImageNodeSchema = z
  .object({
    type: z.literal('assetImage'),
    attrs: DocumentAssetImageAttributesSchema,
  })
  .strict();

export type DocumentAssetImageNode = z.infer<
  typeof DocumentAssetImageNodeSchema
>;
export type DocumentAssetImageNodeInput = z.input<
  typeof DocumentAssetImageNodeSchema
>;

export interface DocumentAssetLookupRequest {
  readonly assetId?: string;
  readonly referenceId?: string;
  readonly role?: DocumentAssetRole;
  readonly tenantId?: string;
  readonly source?: DocumentAssetSourceMetadata;
}

export type DocumentAssetLookupResult = DocumentAssetReferenceInput | undefined;

export interface DocumentAssetLookupAdapter {
  readonly resolveAsset: (
    request: DocumentAssetLookupRequest,
  ) => DocumentAssetLookupResult | Promise<DocumentAssetLookupResult>;
}

export interface DocumentRenderSafeUrlRequest {
  readonly asset: DocumentAssetReferenceInput;
  readonly purpose: 'browser_preview' | 'production_render';
  readonly expiresInSeconds?: number;
}

export interface DocumentRenderSafeUrlResult {
  readonly url: string;
  readonly renderSafe: true;
  readonly expiresAt?: string;
}

export interface DocumentRenderSafeUrlAdapter {
  readonly resolveRenderSafeUrl: (
    request: DocumentRenderSafeUrlRequest,
  ) =>
    | DocumentRenderSafeUrlResult
    | undefined
    | Promise<DocumentRenderSafeUrlResult | undefined>;
}

const signedAssetUrlParamPattern =
  /(?:^|[?&])(?:x-amz-signature|x-amz-credential|x-amz-security-token|x-goog-signature|signature|sig|token|access_token|policy|key-pair-id)=/iu;
const privateAppSessionParamPattern =
  /(?:^|[?&])(?:session|sessionid|sid|cookie|jwt|auth|authorization|bearer)=/iu;
const redactedAssetUrlParamPattern =
  /([?&](?:x-amz-signature|x-amz-credential|x-amz-security-token|x-goog-signature|signature|sig|token|access_token|policy|key-pair-id|session|sessionid|sid|cookie|jwt|auth|authorization|bearer)=)[^&#\s]+/giu;

export function classifyDocumentAssetUrl(
  url: string,
): DocumentAssetUrlClassificationResult {
  const trimmedUrl = url.trim();
  const lowerUrl = trimmedUrl.toLowerCase();

  if (lowerUrl.startsWith('blob:')) {
    return createAssetUrlClassification({
      classification: 'browser_blob',
      reason: 'Browser blob URLs cannot be fetched by DocRaptor.',
      safeForProductionRender: false,
      url: trimmedUrl,
    });
  }

  if (lowerUrl.startsWith('data:')) {
    return createAssetUrlClassification({
      classification: 'data_url',
      reason:
        'Inline data URLs are not treated as production render-safe asset URLs.',
      safeForProductionRender: false,
      url: trimmedUrl,
    });
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return createAssetUrlClassification({
      classification: 'invalid_url',
      reason: 'Asset URL could not be parsed.',
      safeForProductionRender: false,
      url: trimmedUrl,
    });
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return createAssetUrlClassification({
      classification: 'unsafe_scheme',
      reason: `Asset URL scheme "${parsedUrl.protocol}" is not render-safe.`,
      safeForProductionRender: false,
      url: trimmedUrl,
    });
  }

  if (parsedUrl.protocol !== 'https:') {
    return createAssetUrlClassification({
      classification: 'non_https_url',
      reason: 'Production render-safe asset URLs should use HTTPS.',
      safeForProductionRender: false,
      url: trimmedUrl,
    });
  }

  if (
    isPrivateAssetHostname(parsedUrl.hostname) ||
    parsedUrl.pathname.includes('/api/') ||
    privateAppSessionParamPattern.test(parsedUrl.search)
  ) {
    return createAssetUrlClassification({
      classification: 'private_app_session',
      reason:
        'Private app-session URLs and local URLs must be resolved through an asset adapter before production rendering.',
      safeForProductionRender: false,
      url: trimmedUrl,
    });
  }

  if (signedAssetUrlParamPattern.test(parsedUrl.search)) {
    return createAssetUrlClassification({
      classification: 'signed_render_url',
      reason:
        'Signed render URLs can be production-fetchable, but their signature values must be redacted from client-facing metadata.',
      redactedUrl: redactSensitiveAssetUrl(trimmedUrl),
      safeForProductionRender: true,
      url: trimmedUrl,
    });
  }

  return createAssetUrlClassification({
    classification: 'render_safe_public',
    reason:
      'HTTPS asset URL has no known private-session or signed parameters.',
    safeForProductionRender: true,
    url: trimmedUrl,
  });
}

function hasBlobUrl(value: string | undefined): boolean {
  return (
    typeof value === 'string' && value.trim().toLowerCase().startsWith('blob:')
  );
}

function createAssetUrlClassification(
  input: DocumentAssetUrlClassificationResult,
): DocumentAssetUrlClassificationResult {
  return {
    classification: DocumentAssetUrlClassificationSchema.parse(
      input.classification,
    ),
    reason: input.reason,
    safeForProductionRender: input.safeForProductionRender,
    url: input.url,
    ...(input.redactedUrl ? { redactedUrl: input.redactedUrl } : {}),
  };
}

function isPrivateAssetHostname(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  return (
    lowerHostname === 'localhost' ||
    lowerHostname.endsWith('.local') ||
    lowerHostname === '127.0.0.1' ||
    lowerHostname.startsWith('127.') ||
    lowerHostname.startsWith('10.') ||
    lowerHostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./u.test(lowerHostname)
  );
}

function redactSensitiveAssetUrl(url: string): string {
  return url.replace(redactedAssetUrlParamPattern, '$1[redacted]');
}
