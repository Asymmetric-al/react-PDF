import { z } from 'zod';
import { AssetReferenceSchema } from './assets';
import {
  ConditionalRuleSchema,
  DataBindingSchema,
  RepeaterBindingSchema,
  TableBindingSchema,
} from './bindings';
import { type TemplateCategory, TemplateCategorySchema } from './categories';
import {
  DocumentHeaderFooterSettingsSchema,
  defaultDocumentHeaderFooterSettings,
} from './header-footer';
import { PdfDocumentOutputSettingsSchema } from './pdf-metadata';
import { DocumentPlaceholderSchema } from './placeholders';
import {
  IdentifierSchema,
  IsoDateTimeSchema,
  JsonValueSchema,
  NonEmptyStringSchema,
  PositiveIntegerSchema,
  UnitLengthSchema,
} from './primitives';
import { SummaryBlockBindingSchema } from './summary-blocks';
import { DocumentThemeSchema } from './themes';
import { VariableDefinitionSchema } from './variables';

const defaultPageMargins = {
  top: '0.5in',
  right: '0.5in',
  bottom: '0.5in',
  left: '0.5in',
} as const;

const defaultPageSettings = {
  pageSize: 'letter' as const,
  orientation: 'portrait' as const,
  margins: defaultPageMargins,
  headerFooter: defaultDocumentHeaderFooterSettings,
};

export const DocumentEngineSchema = z.enum([
  'asym_pdf_document_builder',
  'unlayer',
]);

export const PageSizeSchema = z.enum(['letter', 'a4', 'legal', 'custom']);

export const PageOrientationSchema = z.enum(['portrait', 'landscape']);

export const PageUnitSchema = z.enum(['in', 'cm', 'mm', 'pt', 'px']);

export const PageMarginsSchema = z
  .object({
    top: UnitLengthSchema.default('0.5in'),
    right: UnitLengthSchema.default('0.5in'),
    bottom: UnitLengthSchema.default('0.5in'),
    left: UnitLengthSchema.default('0.5in'),
  })
  .strict()
  .default(defaultPageMargins);

export const CustomPageSizeSchema = z
  .object({
    width: PositiveIntegerSchema,
    height: PositiveIntegerSchema,
    unit: PageUnitSchema.default('in'),
  })
  .strict();

export const DocumentPageSettingsSchema = z
  .object({
    pageSize: PageSizeSchema.default('letter'),
    orientation: PageOrientationSchema.default('portrait'),
    margins: PageMarginsSchema,
    customSize: CustomPageSizeSchema.optional(),
    headerFooter: DocumentHeaderFooterSettingsSchema,
  })
  .strict()
  .default(defaultPageSettings)
  .superRefine((settings, context) => {
    if (settings.pageSize === 'custom' && settings.customSize === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'customSize is required when pageSize is custom.',
        path: ['customSize'],
      });
    }

    if (settings.pageSize !== 'custom' && settings.customSize !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'customSize can only be used when pageSize is custom.',
        path: ['customSize'],
      });
    }
  });

export type DocumentPageSettings = z.infer<typeof DocumentPageSettingsSchema>;
export type DocumentPageSettingsInput = z.input<
  typeof DocumentPageSettingsSchema
>;

export const DocumentMarkSchema: z.ZodType<{
  readonly type: string;
  readonly attrs?: Record<string, unknown>;
}> = z
  .object({
    type: NonEmptyStringSchema,
    attrs: z.record(z.string(), JsonValueSchema).optional(),
  })
  .strict();

export type DocumentContentNode = {
  readonly type: string;
  readonly attrs?: Record<string, unknown>;
  readonly text?: string;
  readonly marks?: readonly z.infer<typeof DocumentMarkSchema>[];
  readonly content?: readonly DocumentContentNode[];
};

export const DocumentContentNodeSchema: z.ZodType<DocumentContentNode> = z.lazy(
  () =>
    z
      .object({
        type: NonEmptyStringSchema,
        attrs: z.record(z.string(), JsonValueSchema).optional(),
        text: z.string().optional(),
        marks: z.array(DocumentMarkSchema).optional(),
        content: z.array(DocumentContentNodeSchema).optional(),
      })
      .strict(),
);

export const DocumentContentSchema = z
  .object({
    type: z.literal('doc'),
    content: z.array(DocumentContentNodeSchema).default([]),
  })
  .strict();

export type DocumentContent = z.infer<typeof DocumentContentSchema>;

export const DocumentTemplateV1Schema = z
  .object({
    version: z.literal(1),
    id: IdentifierSchema,
    name: NonEmptyStringSchema,
    category: TemplateCategorySchema,
    engine: DocumentEngineSchema.default('asym_pdf_document_builder'),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    pageSettings: DocumentPageSettingsSchema,
    theme: DocumentThemeSchema,
    pdfSettings: PdfDocumentOutputSettingsSchema,
    content: DocumentContentSchema,
    variables: z.array(VariableDefinitionSchema).default([]),
    dataBindings: z.array(DataBindingSchema).default([]),
    conditionalRules: z.array(ConditionalRuleSchema).default([]),
    repeaterBindings: z.array(RepeaterBindingSchema).default([]),
    tableBindings: z.array(TableBindingSchema).default([]),
    summaryBlockBindings: z.array(SummaryBlockBindingSchema).default([]),
    placeholderBindings: z.array(DocumentPlaceholderSchema).default([]),
    assets: z.array(AssetReferenceSchema).default([]),
    metadata: z
      .object({
        description: z.string().optional(),
        tags: z.array(NonEmptyStringSchema).default([]),
        createdAt: IsoDateTimeSchema.optional(),
        updatedAt: IsoDateTimeSchema.optional(),
      })
      .strict()
      .default({
        tags: [],
      }),
  })
  .strict();

export type DocumentTemplateV1 = z.infer<typeof DocumentTemplateV1Schema>;
export type DocumentTemplateV1Input = z.input<typeof DocumentTemplateV1Schema>;
export type { DocumentTheme, DocumentThemeInput } from './themes';
export type { TemplateCategory };
