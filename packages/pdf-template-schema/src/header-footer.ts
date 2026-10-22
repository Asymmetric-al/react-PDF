import { z } from 'zod';
import { IdentifierSchema, UnitLengthSchema } from './primitives';

export const HeaderFooterPlacementSchema = z.enum(['header', 'footer']);

export const HeaderFooterScopeSchema = z.enum(['first_page', 'repeating']);

export const HeaderFooterAlignmentSchema = z.enum(['left', 'center', 'right']);

export const HeaderFooterTextTokenSchema = z
  .object({
    kind: z.literal('text'),
    text: z.string().min(1),
  })
  .strict();

export const HeaderFooterDocumentTitleTokenSchema = z
  .object({
    kind: z.literal('document_title'),
  })
  .strict();

export const HeaderFooterOrganizationFooterTokenSchema = z
  .object({
    kind: z.literal('organization_footer'),
    fallbackText: z.string().optional(),
  })
  .strict();

export const HeaderFooterPageNumberTokenSchema = z
  .object({
    kind: z.literal('page_number'),
  })
  .strict();

export const HeaderFooterTotalPagesTokenSchema = z
  .object({
    kind: z.literal('total_pages'),
  })
  .strict();

export const HeaderFooterContentTokenSchema = z.discriminatedUnion('kind', [
  HeaderFooterTextTokenSchema,
  HeaderFooterDocumentTitleTokenSchema,
  HeaderFooterOrganizationFooterTokenSchema,
  HeaderFooterPageNumberTokenSchema,
  HeaderFooterTotalPagesTokenSchema,
]);

export const HeaderFooterRegionSchema = z
  .object({
    id: IdentifierSchema.optional(),
    placement: HeaderFooterPlacementSchema,
    scope: HeaderFooterScopeSchema,
    enabled: z.boolean().default(true),
    alignment: HeaderFooterAlignmentSchema.default('center'),
    minimumMargin: UnitLengthSchema.default('0.5in'),
    content: z.array(HeaderFooterContentTokenSchema).default([]),
  })
  .strict()
  .superRefine((region, context) => {
    if (region.enabled && region.content.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Enabled header/footer regions require at least one token.',
        path: ['content'],
      });
    }
  });

export const defaultDocumentHeaderFooterSettings = {
  regions: [],
};

export const DocumentHeaderFooterSettingsSchema = z
  .object({
    regions: z.array(HeaderFooterRegionSchema).default([]),
  })
  .strict()
  .default(defaultDocumentHeaderFooterSettings)
  .superRefine((settings, context) => {
    const seenRegions = new Set<string>();

    for (const [index, region] of settings.regions.entries()) {
      const regionKey = `${region.placement}:${region.scope}`;

      if (seenRegions.has(regionKey)) {
        context.addIssue({
          code: 'custom',
          message:
            'Header/footer regions must be unique by placement and scope.',
          path: ['regions', index],
        });
      }

      seenRegions.add(regionKey);
    }
  });

export type HeaderFooterPlacement = z.infer<typeof HeaderFooterPlacementSchema>;
export type HeaderFooterScope = z.infer<typeof HeaderFooterScopeSchema>;
export type HeaderFooterAlignment = z.infer<typeof HeaderFooterAlignmentSchema>;
export type HeaderFooterTextToken = z.infer<typeof HeaderFooterTextTokenSchema>;
export type HeaderFooterDocumentTitleToken = z.infer<
  typeof HeaderFooterDocumentTitleTokenSchema
>;
export type HeaderFooterOrganizationFooterToken = z.infer<
  typeof HeaderFooterOrganizationFooterTokenSchema
>;
export type HeaderFooterPageNumberToken = z.infer<
  typeof HeaderFooterPageNumberTokenSchema
>;
export type HeaderFooterTotalPagesToken = z.infer<
  typeof HeaderFooterTotalPagesTokenSchema
>;
export type HeaderFooterContentToken = z.infer<
  typeof HeaderFooterContentTokenSchema
>;
export type HeaderFooterContentTokenInput = z.input<
  typeof HeaderFooterContentTokenSchema
>;
export type HeaderFooterRegion = z.infer<typeof HeaderFooterRegionSchema>;
export type HeaderFooterRegionInput = z.input<typeof HeaderFooterRegionSchema>;
export type DocumentHeaderFooterSettings = z.infer<
  typeof DocumentHeaderFooterSettingsSchema
>;
export type DocumentHeaderFooterSettingsInput = z.input<
  typeof DocumentHeaderFooterSettingsSchema
>;
