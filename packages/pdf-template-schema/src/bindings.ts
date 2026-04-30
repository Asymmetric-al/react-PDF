import { z } from 'zod';
import {
  DataPathSchema,
  IdentifierSchema,
  JsonValueSchema,
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
  PositiveIntegerSchema,
  VariableKeySchema,
} from './primitives';
import { VariableValueTypeSchema } from './variables';

export const DataBindingSchema = z
  .object({
    id: IdentifierSchema,
    variableKey: VariableKeySchema,
    sourcePath: DataPathSchema,
    required: z.boolean().default(false),
  })
  .strict();

export type DataBinding = z.infer<typeof DataBindingSchema>;

export const ConditionalOperatorSchema = z.enum([
  'exists',
  'not_exists',
  'equals',
  'not_equals',
  'greater_than',
  'greater_than_or_equal',
  'less_than',
  'less_than_or_equal',
  'contains',
  'not_contains',
  'is_empty',
  'is_not_empty',
  'in',
  'not_in',
]);

const operatorsWithoutValue = new Set([
  'exists',
  'not_exists',
  'is_empty',
  'is_not_empty',
]);

const operatorsWithArrayValue = new Set(['in', 'not_in']);

export const ConditionalRuleSchema = z
  .object({
    id: IdentifierSchema.optional(),
    fieldPath: DataPathSchema,
    operator: ConditionalOperatorSchema,
    value: JsonValueSchema.optional(),
  })
  .strict()
  .superRefine((rule, context) => {
    const acceptsValue = !operatorsWithoutValue.has(rule.operator);

    if (acceptsValue && rule.value === undefined) {
      context.addIssue({
        code: 'custom',
        message: `Operator "${rule.operator}" requires a comparison value.`,
        path: ['value'],
      });
    }

    if (!acceptsValue && rule.value !== undefined) {
      context.addIssue({
        code: 'custom',
        message: `Operator "${rule.operator}" must not define a value.`,
        path: ['value'],
      });
    }

    if (
      operatorsWithArrayValue.has(rule.operator) &&
      !Array.isArray(rule.value)
    ) {
      context.addIssue({
        code: 'custom',
        message: `Operator "${rule.operator}" requires an array comparison value.`,
        path: ['value'],
      });
    }
  });

export type ConditionalRule = z.infer<typeof ConditionalRuleSchema>;

export const RepeaterBindingSchema = z
  .object({
    id: IdentifierSchema,
    sourcePath: DataPathSchema,
    itemAlias: DataPathSchema,
    indexAlias: DataPathSchema.optional(),
    emptyState: NonEmptyStringSchema.optional(),
    filters: z.array(ConditionalRuleSchema).default([]),
    maxItems: PositiveIntegerSchema.max(1000).default(1000),
    sort: z
      .object({
        fieldPath: DataPathSchema,
        direction: z.enum(['asc', 'desc']).default('asc'),
      })
      .strict()
      .optional(),
  })
  .strict();

export type RepeaterBinding = z.infer<typeof RepeaterBindingSchema>;
export type RepeaterBindingInput = z.input<typeof RepeaterBindingSchema>;

const TableColumnWidthSchema = z
  .string()
  .regex(
    /^(?:auto|(?:0|[1-9]\d*)(?:\.\d+)?(?:%|px|pt|in|cm|mm))$/,
    'Table column width must be auto or a positive CSS length/percentage.',
  );

export const TableColumnBindingSchema = z
  .object({
    key: IdentifierSchema,
    label: NonEmptyStringSchema,
    sourcePath: DataPathSchema,
    type: VariableValueTypeSchema.default('string'),
    formatter: NonEmptyStringSchema.optional(),
    width: TableColumnWidthSchema.optional(),
    align: z.enum(['left', 'center', 'right']).default('left'),
  })
  .strict();

export type TableColumnBinding = z.infer<typeof TableColumnBindingSchema>;

export const TableGroupingBindingSchema = z
  .object({
    fieldPath: DataPathSchema,
    label: NonEmptyStringSchema.optional(),
  })
  .strict();

export type TableGroupingBinding = z.infer<typeof TableGroupingBindingSchema>;

export const TableTotalBindingSchema = z
  .object({
    columnKey: IdentifierSchema,
    operation: z.enum(['sum', 'count']),
    label: NonEmptyStringSchema.optional(),
  })
  .strict();

export type TableTotalBinding = z.infer<typeof TableTotalBindingSchema>;

export const TableBindingSchema = z
  .object({
    id: IdentifierSchema,
    sourcePath: DataPathSchema,
    columns: z.array(TableColumnBindingSchema).min(1),
    emptyState: NonEmptyStringSchema.optional(),
    grouping: TableGroupingBindingSchema.optional(),
    repeatHeader: z.boolean().default(true),
    maxRows: NonNegativeIntegerSchema.max(5000).default(5000),
    totals: z.array(TableTotalBindingSchema).default([]),
  })
  .strict()
  .superRefine((binding, context) => {
    const columnKeys = new Set(binding.columns.map((column) => column.key));

    for (const total of binding.totals) {
      if (!columnKeys.has(total.columnKey)) {
        context.addIssue({
          code: 'custom',
          message: `Total references unknown table column "${total.columnKey}".`,
          path: ['totals'],
        });
      }
    }
  });

export type TableBinding = z.infer<typeof TableBindingSchema>;
export type TableBindingInput = z.input<typeof TableBindingSchema>;
