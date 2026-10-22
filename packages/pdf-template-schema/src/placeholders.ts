import { z } from 'zod';
import {
  DataPathSchema,
  IdentifierSchema,
  NonEmptyStringSchema,
  PositiveIntegerSchema,
  UrlSchema,
  VariableKeySchema,
} from './primitives';

export const DocumentPlaceholderKindSchema = z.enum([
  'text_field',
  'checkbox',
  'signature',
  'initials',
  'qr',
  'date',
]);

export const DocumentPlaceholderSignerRoleSchema = z.enum([
  'organization',
  'recipient',
  'witness',
  'staff',
  'custom',
]);

export const QrPlaceholderPayloadSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('url'),
      value: UrlSchema.refine(
        (value) => isSafeQrUrl(value),
        'QR URL payloads must use http or https URLs.',
      ),
    })
    .strict(),
  z
    .object({
      type: z.literal('text'),
      value: NonEmptyStringSchema.max(2048),
    })
    .strict(),
  z
    .object({
      type: z.literal('variable'),
      key: VariableKeySchema,
    })
    .strict(),
]);

export type QrPlaceholderPayload = z.infer<typeof QrPlaceholderPayloadSchema>;

const BaseDocumentPlaceholderSchema = z
  .object({
    id: IdentifierSchema,
    kind: DocumentPlaceholderKindSchema,
    label: NonEmptyStringSchema.optional(),
    required: z.boolean().default(false),
    adapterKey: IdentifierSchema.optional(),
    dataPath: DataPathSchema.optional(),
    description: z.string().trim().min(1).optional(),
  })
  .strict();

export const TextFieldPlaceholderSchema = BaseDocumentPlaceholderSchema.extend({
  kind: z.literal('text_field'),
  placeholderText: z.string().trim().min(1).optional(),
  maxLength: PositiveIntegerSchema.optional(),
  multiline: z.boolean().default(false),
}).strict();

export const CheckboxPlaceholderSchema = BaseDocumentPlaceholderSchema.extend({
  kind: z.literal('checkbox'),
  checkedByDefault: z.boolean().default(false),
}).strict();

export const SignaturePlaceholderSchema = BaseDocumentPlaceholderSchema.extend({
  kind: z.literal('signature'),
  signerRole: DocumentPlaceholderSignerRoleSchema.optional(),
  width: PositiveIntegerSchema.optional(),
  height: PositiveIntegerSchema.optional(),
}).strict();

export const InitialsPlaceholderSchema = BaseDocumentPlaceholderSchema.extend({
  kind: z.literal('initials'),
  signerRole: DocumentPlaceholderSignerRoleSchema.optional(),
  width: PositiveIntegerSchema.optional(),
  height: PositiveIntegerSchema.optional(),
}).strict();

export const QrPlaceholderSchema = BaseDocumentPlaceholderSchema.extend({
  kind: z.literal('qr'),
  payload: QrPlaceholderPayloadSchema,
  size: PositiveIntegerSchema.optional(),
  errorCorrectionLevel: z
    .enum(['low', 'medium', 'quartile', 'high'])
    .optional(),
}).strict();

export const DatePlaceholderSchema = BaseDocumentPlaceholderSchema.extend({
  kind: z.literal('date'),
  dateFormat: NonEmptyStringSchema.optional(),
}).strict();

export const DocumentPlaceholderSchema = z.discriminatedUnion('kind', [
  TextFieldPlaceholderSchema,
  CheckboxPlaceholderSchema,
  SignaturePlaceholderSchema,
  InitialsPlaceholderSchema,
  QrPlaceholderSchema,
  DatePlaceholderSchema,
]);

export type DocumentPlaceholder = z.infer<typeof DocumentPlaceholderSchema>;
export type DocumentPlaceholderInput = z.input<
  typeof DocumentPlaceholderSchema
>;
export type DocumentPlaceholderKind = z.infer<
  typeof DocumentPlaceholderKindSchema
>;
export type DocumentPlaceholderSignerRole = z.infer<
  typeof DocumentPlaceholderSignerRoleSchema
>;

function isSafeQrUrl(value: string): boolean {
  if (containsControlCharacter(value)) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);

    if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) {
      return true;
    }
  }

  return false;
}
