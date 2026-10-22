import { z } from 'zod';
import { DocumentAssetReferenceSchema } from './assets';
import {
  IdentifierSchema,
  NonEmptyStringSchema,
  UrlSchema,
} from './primitives';

const defaultThemeColors = {
  primary: '#1f2937',
  accent: '#2563eb',
  text: '#111827',
  background: '#ffffff',
} as const;

const defaultThemeFonts = {
  body: 'Arial',
  heading: 'Arial',
  fallback: ['sans-serif'],
};

export const DocumentBrandSourceSchema = z.enum([
  'system_default',
  'tenant_default',
  'template_override',
]);

export type DocumentBrandSource = z.infer<typeof DocumentBrandSourceSchema>;

export const DocumentBrandFieldSchema = z.enum([
  'organization_name',
  'logo_asset',
  'primary_color',
  'accent_color',
  'text_color',
  'background_color',
  'heading_font',
  'body_font',
  'fallback_fonts',
  'footer_text',
  'receipt_defaults',
]);

export type DocumentBrandField = z.infer<typeof DocumentBrandFieldSchema>;

export const DocumentBrandingMetadataSchema = z
  .object({
    source: DocumentBrandSourceSchema.default('system_default'),
    tenantBrandId: IdentifierSchema.optional(),
    overriddenFields: z.array(DocumentBrandFieldSchema).default([]),
  })
  .strict()
  .default({
    source: 'system_default',
    overriddenFields: [],
  });

export type DocumentBrandingMetadata = z.infer<
  typeof DocumentBrandingMetadataSchema
>;

export const DocumentThemeColorSchema = NonEmptyStringSchema.regex(
  /^#[0-9a-fA-F]{6}$/,
  'Expected a six-digit hex color token.',
).transform((value) => value.toLowerCase());

export const DocumentThemeColorsSchema = z
  .object({
    primary: DocumentThemeColorSchema.default(defaultThemeColors.primary),
    accent: DocumentThemeColorSchema.default(defaultThemeColors.accent),
    text: DocumentThemeColorSchema.default(defaultThemeColors.text),
    background: DocumentThemeColorSchema.default(defaultThemeColors.background),
  })
  .strict()
  .default(defaultThemeColors);

export type DocumentThemeColors = z.infer<typeof DocumentThemeColorsSchema>;

export const DocumentThemeFontFamilySchema = NonEmptyStringSchema.regex(
  /^[A-Za-z0-9 ._-]+$/,
  'Expected a plain font family name without CSS syntax.',
);

export const DocumentThemeFontsSchema = z
  .object({
    body: DocumentThemeFontFamilySchema.default(defaultThemeFonts.body),
    heading: DocumentThemeFontFamilySchema.default(defaultThemeFonts.heading),
    fallback: z
      .array(DocumentThemeFontFamilySchema)
      .default([...defaultThemeFonts.fallback]),
  })
  .strict()
  .default(defaultThemeFonts);

export type DocumentThemeFonts = z.infer<typeof DocumentThemeFontsSchema>;

export const DocumentThemeOrganizationSchema = z
  .object({
    name: NonEmptyStringSchema.optional(),
    legalName: NonEmptyStringSchema.optional(),
    websiteUrl: UrlSchema.optional(),
  })
  .strict()
  .default({});

export type DocumentThemeOrganization = z.infer<
  typeof DocumentThemeOrganizationSchema
>;

export const DocumentReceiptDefaultsSchema = z
  .object({
    thankYouMessage: NonEmptyStringSchema.optional(),
    taxLanguage: NonEmptyStringSchema.optional(),
    goodsServicesStatement: NonEmptyStringSchema.optional(),
  })
  .strict()
  .default({});

export type DocumentReceiptDefaults = z.infer<
  typeof DocumentReceiptDefaultsSchema
>;

export const DocumentThemeSchema = z
  .object({
    name: NonEmptyStringSchema.default('Default'),
    branding: DocumentBrandingMetadataSchema,
    organization: DocumentThemeOrganizationSchema,
    colors: DocumentThemeColorsSchema,
    fonts: DocumentThemeFontsSchema,
    logoAsset: DocumentAssetReferenceSchema.optional(),
    logoAssetId: IdentifierSchema.optional(),
    footerText: z.string().optional(),
    receiptDefaults: DocumentReceiptDefaultsSchema,
  })
  .strict()
  .default({
    name: 'Default',
    branding: {
      source: 'system_default',
      overriddenFields: [],
    },
    colors: defaultThemeColors,
    fonts: defaultThemeFonts,
    organization: {},
    receiptDefaults: {},
  })
  .superRefine((theme, context) => {
    if (theme.logoAsset && theme.logoAsset.role !== 'logo') {
      context.addIssue({
        code: 'custom',
        message: 'Theme logo assets must use the logo role.',
        path: ['logoAsset', 'role'],
      });
    }
  });

export type DocumentTheme = z.infer<typeof DocumentThemeSchema>;
export type DocumentThemeInput = z.input<typeof DocumentThemeSchema>;

export interface ResolveDocumentThemeInput {
  readonly systemDefaults?: DocumentThemeInput;
  readonly tenantDefaults?: DocumentThemeInput;
  readonly templateOverrides?: DocumentThemeInput;
}

export function resolveDocumentTheme(
  input: ResolveDocumentThemeInput = {},
): DocumentTheme {
  const mergedTheme = mergeThemeInputs(
    input.systemDefaults,
    input.tenantDefaults,
    input.templateOverrides,
  );

  return DocumentThemeSchema.parse(mergedTheme);
}

export interface DocumentThemeDefaultsRequest {
  readonly tenantId?: string;
  readonly templateId?: string;
  readonly category?: string;
}

export interface DocumentThemeDefaultsAdapter {
  readonly resolveThemeDefaults: (
    request: DocumentThemeDefaultsRequest,
  ) => DocumentThemeInput | undefined | Promise<DocumentThemeInput | undefined>;
}

function mergeThemeInputs(
  ...themes: readonly (DocumentThemeInput | undefined)[]
): DocumentThemeInput {
  let mergedTheme: Record<string, unknown> = {};

  for (const theme of themes) {
    if (!theme || typeof theme !== 'object') {
      continue;
    }

    const nextTheme = theme as Record<string, unknown>;

    mergedTheme = {
      ...mergedTheme,
      ...withoutUndefinedValues(nextTheme),
      branding: mergeNestedObject(mergedTheme.branding, nextTheme.branding),
      colors: mergeNestedObject(mergedTheme.colors, nextTheme.colors),
      fonts: mergeNestedObject(mergedTheme.fonts, nextTheme.fonts),
      organization: mergeNestedObject(
        mergedTheme.organization,
        nextTheme.organization,
      ),
      receiptDefaults: mergeNestedObject(
        mergedTheme.receiptDefaults,
        nextTheme.receiptDefaults,
      ),
    };
  }

  return mergedTheme as DocumentThemeInput;
}

function mergeNestedObject(
  current: unknown,
  next: unknown,
): Record<string, unknown> | undefined {
  const currentObject = isPlainObject(current) ? current : {};

  if (!isPlainObject(next)) {
    return Object.keys(currentObject).length > 0 ? currentObject : undefined;
  }

  return {
    ...currentObject,
    ...withoutUndefinedValues(next),
  };
}

function withoutUndefinedValues(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
