import { z } from 'zod';
import { IdentifierSchema, NonEmptyStringSchema } from './primitives';

export const DocumentPageBreakAttributesSchema = z
  .object({
    id: IdentifierSchema.optional(),
    label: NonEmptyStringSchema.optional(),
  })
  .strict();

export type DocumentPageBreakAttributes = z.infer<
  typeof DocumentPageBreakAttributesSchema
>;
export type DocumentPageBreakAttributesInput = z.input<
  typeof DocumentPageBreakAttributesSchema
>;

export const DocumentPageBreakNodeSchema = z
  .object({
    type: z.literal('pageBreak'),
    attrs: DocumentPageBreakAttributesSchema.default({}),
  })
  .strict();

export type DocumentPageBreakNode = z.infer<typeof DocumentPageBreakNodeSchema>;
export type DocumentPageBreakNodeInput = z.input<
  typeof DocumentPageBreakNodeSchema
>;

export const PageFlowControlAttributesSchema = z
  .object({
    keepTogether: z.boolean().optional(),
    startOnNewPage: z.boolean().optional(),
    avoidBreakAfter: z.boolean().optional(),
    avoidRowSplit: z.boolean().optional(),
  })
  .strict();

export type PageFlowControlAttributes = z.infer<
  typeof PageFlowControlAttributesSchema
>;
export type PageFlowControlAttributesInput = z.input<
  typeof PageFlowControlAttributesSchema
>;
