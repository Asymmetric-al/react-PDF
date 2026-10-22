import { z } from 'zod';
import { NonEmptyStringSchema } from './primitives';

export const PdfDocumentLanguageSchema = NonEmptyStringSchema.regex(
  /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/,
  'Expected a BCP 47-style language tag.',
);

const defaultPdfDocumentMetadata = {
  keywords: [],
  language: 'en-US',
};

export const PdfDocumentMetadataSchema = z
  .object({
    title: NonEmptyStringSchema.optional(),
    subject: NonEmptyStringSchema.optional(),
    author: NonEmptyStringSchema.optional(),
    organization: NonEmptyStringSchema.optional(),
    language: PdfDocumentLanguageSchema.default('en-US'),
    keywords: z.array(NonEmptyStringSchema).default([]),
  })
  .strict()
  .default(defaultPdfDocumentMetadata);

export type PdfDocumentMetadata = z.infer<typeof PdfDocumentMetadataSchema>;
export type PdfDocumentMetadataInput = z.input<
  typeof PdfDocumentMetadataSchema
>;

export const PdfDocumentProfileSchema = z.enum([
  'PDF/A-1a',
  'PDF/A-1a+PDF/UA-1',
  'PDF/A-1b',
  'PDF/A-2a',
  'PDF/A-2a+PDF/UA-1',
  'PDF/A-2b',
  'PDF/A-3a',
  'PDF/A-3a+PDF/UA-1',
  'PDF/A-3b',
  'PDF/UA-1',
]);

export type PdfDocumentProfile = z.infer<typeof PdfDocumentProfileSchema>;

export const PdfDocumentProfileOptionsSchema = z
  .object({
    profile: PdfDocumentProfileSchema.optional(),
  })
  .strict()
  .default({});

export type PdfDocumentProfileOptions = z.infer<
  typeof PdfDocumentProfileOptionsSchema
>;
export type PdfDocumentProfileOptionsInput = z.input<
  typeof PdfDocumentProfileOptionsSchema
>;

export const PdfDocumentOutputSettingsSchema = z
  .object({
    metadata: PdfDocumentMetadataSchema,
    profile: PdfDocumentProfileOptionsSchema,
  })
  .strict()
  .default({
    metadata: defaultPdfDocumentMetadata,
    profile: {},
  });

export type PdfDocumentOutputSettings = z.infer<
  typeof PdfDocumentOutputSettingsSchema
>;
export type PdfDocumentOutputSettingsInput = z.input<
  typeof PdfDocumentOutputSettingsSchema
>;
