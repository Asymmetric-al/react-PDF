import { z } from 'zod';
import {
  DataPathSchema,
  IdentifierSchema,
  NonEmptyStringSchema,
} from './primitives';

export const SummaryCalculationPrecisionSchema = z
  .object({
    scale: z.number().int().nonnegative().optional(),
    roundingMode: z.literal('half_away_from_zero').optional(),
  })
  .strict();

export const SummaryDisplayLabelsSchema = z
  .record(z.string(), NonEmptyStringSchema)
  .optional();

export const TotalContributionsCalculationReferenceSchema = z
  .object({
    type: z.literal('total_contributions'),
    sourcePath: DataPathSchema,
    amountPath: DataPathSchema,
    label: NonEmptyStringSchema.optional(),
  })
  .strict();

export const TableTotalCalculationReferenceSchema = z
  .object({
    type: z.literal('table_total'),
    tableBindingId: IdentifierSchema,
    columnKey: IdentifierSchema,
    operation: z.enum(['sum', 'count']).optional(),
    label: NonEmptyStringSchema.optional(),
  })
  .strict();

export const InvoiceTotalsCalculationReferenceSchema = z
  .object({
    type: z.literal('invoice_totals'),
    lineItemsPath: DataPathSchema,
    amountPath: DataPathSchema.optional(),
    quantityPath: DataPathSchema.optional(),
    ratePath: DataPathSchema.optional(),
    discountPath: DataPathSchema.optional(),
    taxPath: DataPathSchema.optional(),
    fields: z
      .array(z.enum(['subtotal', 'discounts', 'taxes', 'total']))
      .min(1)
      .default(['subtotal', 'discounts', 'taxes', 'total']),
    labels: SummaryDisplayLabelsSchema,
  })
  .strict();

export const FinancialReportTotalsCalculationReferenceSchema = z
  .object({
    type: z.literal('financial_report_totals'),
    sourcePath: DataPathSchema,
    amountPath: DataPathSchema,
    categoryPath: DataPathSchema,
    incomeCategories: z.array(NonEmptyStringSchema).min(1),
    expenseCategories: z.array(NonEmptyStringSchema).min(1),
    fields: z
      .array(z.enum(['income', 'expense', 'net']))
      .min(1)
      .default(['income', 'expense', 'net']),
    labels: SummaryDisplayLabelsSchema,
  })
  .strict();

export const GroupedSubtotalsCalculationReferenceSchema = z
  .object({
    type: z.literal('grouped_subtotals'),
    sourcePath: DataPathSchema,
    groupPath: DataPathSchema,
    valuePath: DataPathSchema,
    includeGrandTotal: z.boolean().default(false),
    labels: SummaryDisplayLabelsSchema,
    grandTotalLabel: NonEmptyStringSchema.optional(),
  })
  .strict();

export const GrandTotalCalculationReferenceSchema = z
  .object({
    type: z.literal('grand_total'),
    sourcePath: DataPathSchema,
    groupPath: DataPathSchema,
    valuePath: DataPathSchema,
    label: NonEmptyStringSchema.optional(),
  })
  .strict();

export const SummaryCalculationReferenceSchema = z.discriminatedUnion('type', [
  TotalContributionsCalculationReferenceSchema,
  TableTotalCalculationReferenceSchema,
  InvoiceTotalsCalculationReferenceSchema,
  FinancialReportTotalsCalculationReferenceSchema,
  GroupedSubtotalsCalculationReferenceSchema,
  GrandTotalCalculationReferenceSchema,
]);

export type SummaryCalculationReference = z.infer<
  typeof SummaryCalculationReferenceSchema
>;
export type SummaryCalculationReferenceInput = z.input<
  typeof SummaryCalculationReferenceSchema
>;

export const SummaryBlockBindingSchema = z
  .object({
    id: IdentifierSchema,
    title: NonEmptyStringSchema.optional(),
    formatter: NonEmptyStringSchema.default('currency.usd'),
    precision: SummaryCalculationPrecisionSchema.optional(),
    calculation: SummaryCalculationReferenceSchema,
  })
  .strict();

export type SummaryBlockBinding = z.infer<typeof SummaryBlockBindingSchema>;
export type SummaryBlockBindingInput = z.input<
  typeof SummaryBlockBindingSchema
>;
