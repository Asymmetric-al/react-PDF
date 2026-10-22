import {
  type DocumentAssetImageAttributes,
  type DocumentAssetImageAttributesInput,
  DocumentAssetImageAttributesSchema,
  type DocumentAssetReference,
  DocumentAssetReferenceSchema,
  type DocumentAssetRole,
} from '@asym/pdf-template-schema';
import { mergeAttributes, Node, type RawCommands } from '@tiptap/core';

export interface InsertAssetImageInput
  extends DocumentAssetImageAttributesInput {}

export interface AssetImageAttributes {
  readonly asset?: DocumentAssetReference;
  readonly assetId?: string;
  readonly role?: DocumentAssetRole;
  readonly url?: string;
  readonly renderSafeUrl?: string;
  readonly mimeType?: string;
  readonly altText?: string;
  readonly width?: number;
  readonly height?: number;
  readonly alignment?: DocumentAssetImageAttributes['alignment'];
  readonly linkUrl?: string;
  readonly renderSafe?: boolean;
  readonly tenantId?: string;
  readonly source?: DocumentAssetReference['source'];
}

export type AssetImagePreviewStatus =
  | 'invalid_asset'
  | 'missing_alt_text'
  | 'missing_asset'
  | 'valid';

export type AssetImagePreviewDiagnostic =
  | {
      readonly code: 'invalid_asset';
      readonly severity: 'error';
      readonly message: string;
      readonly validationError: string;
    }
  | {
      readonly code: 'missing_asset';
      readonly severity: 'error';
      readonly message: string;
      readonly assetId?: string;
      readonly role?: DocumentAssetRole;
    }
  | {
      readonly code: 'missing_asset_alt_text';
      readonly severity: 'warning';
      readonly message: string;
      readonly assetId?: string;
      readonly role?: DocumentAssetRole;
    };

export interface AssetImagePreviewInput
  extends DocumentAssetImageAttributesInput {}

export interface AssetImagePreviewResult {
  readonly status: AssetImagePreviewStatus;
  readonly diagnostics: readonly AssetImagePreviewDiagnostic[];
  readonly asset?: DocumentAssetReference;
  readonly assetId?: string;
  readonly role?: DocumentAssetRole;
}

interface AssetImageAttributeSource {
  readonly asset?: unknown;
  readonly assetId?: unknown;
  readonly role?: unknown;
  readonly url?: unknown;
  readonly renderSafeUrl?: unknown;
  readonly mimeType?: unknown;
  readonly altText?: unknown;
  readonly width?: unknown;
  readonly height?: unknown;
  readonly alignment?: unknown;
  readonly linkUrl?: unknown;
  readonly renderSafe?: unknown;
  readonly tenantId?: unknown;
  readonly source?: unknown;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    assetImage: {
      insertAssetImage: (input: InsertAssetImageInput) => ReturnType;
    };
  }
}

const assetImageAttribute = 'data-asym-asset-image';

export function createAssetImageExtension() {
  return Node.create({
    name: 'assetImage',

    atom: true,
    defining: true,
    group: 'block',
    isolating: true,
    selectable: true,

    addAttributes() {
      return {
        asset: {
          default: null,
          parseHTML: (element) => readAssetFromElement(element),
        },
        assetId: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-asset-id')),
        },
        role: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-asset-role')),
        },
        url: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-asset-url')),
        },
        renderSafeUrl: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(
              element.getAttribute('data-asset-render-safe-url'),
            ),
        },
        mimeType: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-asset-mime-type')),
        },
        altText: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-asset-alt-text')),
        },
        width: {
          default: null,
          parseHTML: (element) =>
            readNumberAttribute(element, 'data-asset-width'),
        },
        height: {
          default: null,
          parseHTML: (element) =>
            readNumberAttribute(element, 'data-asset-height'),
        },
        alignment: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-asset-alignment')),
        },
        linkUrl: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-asset-link-url')),
        },
        renderSafe: {
          default: null,
          parseHTML: (element) =>
            element.getAttribute('data-asset-render-safe') === 'true',
        },
        tenantId: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-asset-tenant-id')),
        },
        source: {
          default: null,
          parseHTML: (element) => readSourceFromElement(element),
        },
      };
    },

    parseHTML() {
      return [{ tag: `figure[${assetImageAttribute}]` }];
    },

    renderHTML({ HTMLAttributes }) {
      const attrs = normalizeAssetImageAttributes(HTMLAttributes);
      const preview = getAssetImagePreview(attrs ?? {});
      const asset = attrs?.asset;
      const role = asset?.role ?? attrs?.role ?? 'image';
      const src =
        asset?.renderSafeUrl ??
        asset?.url ??
        attrs?.renderSafeUrl ??
        attrs?.url ??
        '';
      const altText = asset?.altText ?? attrs?.altText ?? '';

      return [
        'figure',
        mergeAttributes({
          [assetImageAttribute]: 'true',
          ...(asset ? { 'data-asset': stringifyAsset(asset) } : {}),
          ...(asset?.id ? { 'data-asset-reference-id': asset.id } : {}),
          ...((asset?.assetId ?? attrs?.assetId)
            ? { 'data-asset-id': asset?.assetId ?? attrs?.assetId }
            : {}),
          'data-asset-role': role,
          ...(src ? { 'data-asset-url': src } : {}),
          ...((asset?.mimeType ?? attrs?.mimeType)
            ? { 'data-asset-mime-type': asset?.mimeType ?? attrs?.mimeType }
            : {}),
          ...(altText ? { 'data-asset-alt-text': altText } : {}),
          ...((asset?.width ?? attrs?.width)
            ? { 'data-asset-width': String(asset?.width ?? attrs?.width) }
            : {}),
          ...((asset?.height ?? attrs?.height)
            ? { 'data-asset-height': String(asset?.height ?? attrs?.height) }
            : {}),
          ...((asset?.alignment ?? attrs?.alignment)
            ? { 'data-asset-alignment': asset?.alignment ?? attrs?.alignment }
            : {}),
          ...((asset?.linkUrl ?? attrs?.linkUrl)
            ? { 'data-asset-link-url': asset?.linkUrl ?? attrs?.linkUrl }
            : {}),
          ...((asset?.renderSafe ?? attrs?.renderSafe)
            ? { 'data-asset-render-safe': 'true' }
            : {}),
          ...((asset?.tenantId ?? attrs?.tenantId)
            ? { 'data-asset-tenant-id': asset?.tenantId ?? attrs?.tenantId }
            : {}),
          class: resolveAssetImageClassName(preview),
          contenteditable: 'false',
        }),
        [
          'img',
          {
            alt: altText,
            ...(src ? { src } : {}),
          },
        ],
      ];
    },

    addCommands() {
      return {
        insertAssetImage:
          (input) =>
          ({ commands }) => {
            const attrs = normalizeInsertedAttributes(input);

            if (!attrs) {
              return false;
            }

            return commands.insertContent({
              attrs,
              type: this.name,
            });
          },
      } satisfies Partial<RawCommands>;
    },
  });
}

export const AssetImageNode = createAssetImageExtension();

export function getAssetImagePreview(
  input: AssetImagePreviewInput,
): AssetImagePreviewResult {
  if (!hasAssetReferenceInput(input)) {
    return {
      diagnostics: [
        {
          code: 'missing_asset',
          message:
            'Phase 27 asset image preview requires an asset contract, asset id, or URL.',
          severity: 'error',
        },
      ],
      status: 'missing_asset',
    };
  }

  const normalized = normalizeAssetImageAttributes(input);

  if (!normalized) {
    return {
      diagnostics: [
        {
          code: 'invalid_asset',
          message:
            'Phase 27 asset image preview requires a valid structured asset contract.',
          severity: 'error',
          validationError: getAssetImageValidationError(input),
        },
      ],
      status: 'invalid_asset',
    };
  }

  const role = normalized.asset?.role ?? normalized.role ?? 'image';
  const assetId = normalized.asset?.assetId ?? normalized.assetId;
  const altText = normalized.asset?.altText ?? normalized.altText;

  if (requiresAltText(role) && (!altText || altText.trim().length === 0)) {
    return {
      asset: normalized.asset,
      assetId,
      diagnostics: [
        {
          assetId,
          code: 'missing_asset_alt_text',
          message:
            'Phase 27 asset images should include alt text for accessibility and preflight.',
          role,
          severity: 'warning',
        },
      ],
      role,
      status: 'missing_alt_text',
    };
  }

  return {
    asset: normalized.asset,
    assetId,
    diagnostics: [],
    role,
    status: 'valid',
  };
}

export function isValidDocumentAssetImage(
  input: AssetImagePreviewInput,
): boolean {
  return normalizeAssetImageAttributes(input) !== undefined;
}

function normalizeInsertedAttributes(
  input: InsertAssetImageInput,
): AssetImageAttributes | undefined {
  return normalizeAssetImageAttributes(input);
}

function normalizeAssetImageAttributes(
  input: AssetImageAttributeSource,
): AssetImageAttributes | undefined {
  const parseResult = DocumentAssetImageAttributesSchema.safeParse(
    stripNullValues(input),
  );

  return parseResult.success ? parseResult.data : undefined;
}

function hasAssetReferenceInput(input: AssetImageAttributeSource): boolean {
  return Boolean(
    input.asset ||
      readOptionalString(input.assetId) ||
      readOptionalString(input.url) ||
      readOptionalString(input.renderSafeUrl),
  );
}

function getAssetImageValidationError(
  input: AssetImageAttributeSource,
): string {
  const parseResult = DocumentAssetImageAttributesSchema.safeParse(
    stripNullValues(input),
  );

  if (parseResult.success) {
    return '';
  }

  return (
    parseResult.error.issues[0]?.message ?? 'Unknown asset validation error.'
  );
}

function readAssetFromElement(
  element: HTMLElement,
): DocumentAssetReference | null {
  const source = element.getAttribute('data-asset');
  const asset = readAsset(source);

  return asset ?? null;
}

function readAsset(value: unknown): DocumentAssetReference | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    const parseResult = DocumentAssetReferenceSchema.safeParse(parsed);

    return parseResult.success ? parseResult.data : undefined;
  } catch {
    return undefined;
  }
}

function readSourceFromElement(
  element: HTMLElement,
): DocumentAssetReference['source'] | null {
  const provider = readOptionalString(
    element.getAttribute('data-asset-source-provider'),
  );
  const sourceId = readOptionalString(
    element.getAttribute('data-asset-source-id'),
  );

  return provider || sourceId ? { provider, sourceId } : null;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumberAttribute(
  element: HTMLElement,
  attribute: string,
): number | undefined {
  const value = element.getAttribute(attribute);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function stripNullValues(
  input: AssetImageAttributeSource,
): DocumentAssetImageAttributesInput {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== null && value !== undefined) {
      normalized[key] = value;
    }
  }

  return normalized as DocumentAssetImageAttributesInput;
}

function stringifyAsset(asset: DocumentAssetReference): string {
  return stableStringify(asset) ?? JSON.stringify(asset);
}

function stableStringify(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) => stableStringify(item) ?? 'null')
      .join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, entryValue]) => entryValue !== undefined,
  );

  return `{${entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
    )
    .join(',')}}`;
}

function requiresAltText(role: DocumentAssetRole): boolean {
  return (
    role === 'image' || role === 'logo' || role === 'signature' || role === 'qr'
  );
}

function resolveAssetImageClassName(preview: AssetImagePreviewResult): string {
  const statusClass =
    preview.status === 'valid'
      ? 'asym-asset-image--valid'
      : 'asym-asset-image--warning';

  return `asym-asset-image ${statusClass}`;
}
