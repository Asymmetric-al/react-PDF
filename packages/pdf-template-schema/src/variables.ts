import { z } from 'zod';
import { type TemplateCategory, TemplateCategorySchema } from './categories';
import {
  DataPathSchema,
  type JsonValue,
  JsonValueSchema,
  NonEmptyStringSchema,
  VariableKeySchema,
} from './primitives';

export const VariableGroupSchema = z.enum([
  'organization',
  'recipient',
  'donation',
  'document',
  'missionary',
  'tax_receipt',
  'financial_report',
  'statement',
  'invoice',
  'asset',
  'computed',
  'custom',
]);

export const VariableValueTypeSchema = z.enum([
  'string',
  'rich_text',
  'date',
  'currency',
  'number',
  'percentage',
  'boolean',
  'address',
  'image_url',
  'url',
  'id',
]);

export const PrivacyClassificationSchema = z.enum([
  'public',
  'internal',
  'pii',
  'financial',
  'sensitive',
]);

export const FallbackBehaviorSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('none'),
  }),
  z.object({
    mode: z.literal('use_value'),
    value: JsonValueSchema,
  }),
  z.object({
    mode: z.literal('omit'),
  }),
]);

export type FallbackBehavior = z.infer<typeof FallbackBehaviorSchema>;
export type PrivacyClassification = z.infer<typeof PrivacyClassificationSchema>;
export type VariableGroup = z.infer<typeof VariableGroupSchema>;
export type VariableValueType = z.infer<typeof VariableValueTypeSchema>;

const VariableDefinitionBaseSchema = z
  .object({
    key: VariableKeySchema,
    label: NonEmptyStringSchema,
    group: VariableGroupSchema,
    description: NonEmptyStringSchema.optional(),
    type: VariableValueTypeSchema,
    sampleValue: JsonValueSchema,
    required: z.boolean().default(false),
    fallback: FallbackBehaviorSchema.default({ mode: 'none' }),
    formatter: NonEmptyStringSchema.optional(),
    privacy: PrivacyClassificationSchema.default('internal'),
    sourcePath: DataPathSchema.optional(),
  })
  .strict();

export const VariableDefinitionSchema =
  VariableDefinitionBaseSchema.superRefine((definition, context) => {
    if (definition.required && definition.fallback.mode === 'omit') {
      context.addIssue({
        code: 'custom',
        message: 'Required variables cannot use omit fallback behavior.',
        path: ['fallback'],
      });
    }
  });

export type VariableDefinition = z.infer<typeof VariableDefinitionSchema>;

export const RegistryVariableDefinitionSchema =
  VariableDefinitionBaseSchema.extend({
    description: NonEmptyStringSchema,
    required: z.boolean(),
    fallback: FallbackBehaviorSchema,
    formatter: NonEmptyStringSchema,
    privacy: PrivacyClassificationSchema,
    sourcePath: DataPathSchema,
    documentCategories: z.array(TemplateCategorySchema).min(1),
  })
    .strict()
    .superRefine((definition, context) => {
      if (definition.required && definition.fallback.mode === 'omit') {
        context.addIssue({
          code: 'custom',
          message: 'Required variables cannot use omit fallback behavior.',
          path: ['fallback'],
        });
      }
    });

export type RegistryVariableDefinition = z.infer<
  typeof RegistryVariableDefinitionSchema
>;
export type RegistryVariableDefinitionInput = z.input<
  typeof RegistryVariableDefinitionSchema
>;

export const VariableReferenceSchema = z
  .object({
    type: z.literal('variable'),
    key: VariableKeySchema,
    formatter: NonEmptyStringSchema.optional(),
    fallback: FallbackBehaviorSchema.optional(),
  })
  .strict();

export type VariableReference = z.infer<typeof VariableReferenceSchema>;

export type VariableRegistryErrorCode = 'duplicate_key' | 'invalid_definition';

export interface VariableRegistryErrorOptions {
  readonly code: VariableRegistryErrorCode;
  readonly message: string;
  readonly variableKeys?: readonly string[];
  readonly cause?: unknown;
}

export class VariableRegistryError extends Error {
  readonly code: VariableRegistryErrorCode;
  readonly variableKeys: readonly string[];
  readonly cause?: unknown;

  constructor(options: VariableRegistryErrorOptions) {
    super(options.message);
    this.name = 'VariableRegistryError';
    this.code = options.code;
    this.variableKeys = options.variableKeys ?? [];
    this.cause = options.cause;
  }
}

export type VariableSampleData = Record<string, JsonValue>;

export interface VariableRegistry {
  readonly definitions: readonly RegistryVariableDefinition[];
  get(key: string): RegistryVariableDefinition | undefined;
  listByGroup(group: VariableGroup): readonly RegistryVariableDefinition[];
  listRequired(
    category?: TemplateCategory,
  ): readonly RegistryVariableDefinition[];
  detectUnknownKeys(keys: Iterable<string>): readonly string[];
  createSampleData(category?: TemplateCategory): VariableSampleData;
}

function categoryList(...categories: TemplateCategory[]): TemplateCategory[] {
  return categories;
}

function compareDefinitions(
  left: RegistryVariableDefinition,
  right: RegistryVariableDefinition,
): number {
  return left.key.localeCompare(right.key);
}

function cloneJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => cloneJsonValue(item));
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey),
    );

    return Object.fromEntries(
      entries.map(([key, item]) => [key, cloneJsonValue(item)]),
    );
  }

  return value;
}

function isJsonRecord(
  value: JsonValue | undefined,
): value is VariableSampleData {
  return (
    value !== undefined &&
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function setSampleValue(
  sampleData: VariableSampleData,
  sourcePath: string,
  value: JsonValue,
): void {
  const segments = sourcePath.split('.');
  let current: VariableSampleData = sampleData;

  for (const [index, segment] of segments.entries()) {
    const isLastSegment = index === segments.length - 1;

    if (isLastSegment) {
      current[segment] = cloneJsonValue(value);
      return;
    }

    const existingValue = current[segment];

    if (isJsonRecord(existingValue)) {
      current = existingValue;
      continue;
    }

    const nextValue: VariableSampleData = {};
    current[segment] = nextValue;
    current = nextValue;
  }
}

function isDefinitionForCategory(
  definition: RegistryVariableDefinition,
  category: TemplateCategory | undefined,
): boolean {
  return (
    category === undefined || definition.documentCategories.includes(category)
  );
}

function parseRegistryDefinition(
  definition: RegistryVariableDefinitionInput,
): RegistryVariableDefinition {
  const result = RegistryVariableDefinitionSchema.safeParse(definition);

  if (result.success) {
    return result.data;
  }

  const maybeKey =
    typeof definition === 'object' &&
    definition !== null &&
    'key' in definition &&
    typeof definition.key === 'string'
      ? [definition.key]
      : [];

  throw new VariableRegistryError({
    code: 'invalid_definition',
    message: 'Invalid variable registry definition.',
    variableKeys: maybeKey,
    cause: result.error,
  });
}

function findDuplicateKeys(
  definitions: readonly RegistryVariableDefinition[],
): readonly string[] {
  const seenKeys = new Set<string>();
  const duplicateKeys = new Set<string>();

  for (const definition of definitions) {
    if (seenKeys.has(definition.key)) {
      duplicateKeys.add(definition.key);
      continue;
    }

    seenKeys.add(definition.key);
  }

  return [...duplicateKeys].sort();
}

export function createVariableRegistry(
  definitions: readonly RegistryVariableDefinitionInput[],
): VariableRegistry {
  const parsedDefinitions = definitions.map((definition) =>
    parseRegistryDefinition(definition),
  );
  const duplicateKeys = findDuplicateKeys(parsedDefinitions);

  if (duplicateKeys.length > 0) {
    throw new VariableRegistryError({
      code: 'duplicate_key',
      message: `Duplicate variable registry key: ${duplicateKeys.join(', ')}`,
      variableKeys: duplicateKeys,
    });
  }

  const registryDefinitions = Object.freeze(
    [...parsedDefinitions].sort(compareDefinitions),
  );
  const definitionsByKey = new Map(
    registryDefinitions.map((definition) => [definition.key, definition]),
  );

  return Object.freeze({
    definitions: registryDefinitions,

    get(key: string): RegistryVariableDefinition | undefined {
      return definitionsByKey.get(key);
    },

    listByGroup(group: VariableGroup): readonly RegistryVariableDefinition[] {
      return registryDefinitions.filter(
        (definition) => definition.group === group,
      );
    },

    listRequired(
      category?: TemplateCategory,
    ): readonly RegistryVariableDefinition[] {
      return registryDefinitions.filter(
        (definition) =>
          definition.required && isDefinitionForCategory(definition, category),
      );
    },

    detectUnknownKeys(keys: Iterable<string>): readonly string[] {
      const unknownKeys = new Set<string>();

      for (const key of keys) {
        if (!definitionsByKey.has(key)) {
          unknownKeys.add(key);
        }
      }

      return [...unknownKeys].sort();
    },

    createSampleData(category?: TemplateCategory): VariableSampleData {
      const sampleData: VariableSampleData = {};

      for (const definition of registryDefinitions) {
        if (!isDefinitionForCategory(definition, category)) {
          continue;
        }

        setSampleValue(
          sampleData,
          definition.sourcePath,
          definition.sampleValue,
        );
      }

      return sampleData;
    },
  });
}

const receiptCategories = categoryList('donation_receipt', 'tax_receipt');
const statementCategories = categoryList('annual_giving_statement');
const donorLetterCategories = categoryList('donor_letter');
const missionaryCategories = categoryList('missionary_report');
const financialReportCategories = categoryList('financial_report');
const invoiceCategories = categoryList('invoice');
const certificateCategories = categoryList('certificate');
const allDocumentCategories = categoryList(
  'donation_receipt',
  'tax_receipt',
  'annual_giving_statement',
  'donor_letter',
  'missionary_report',
  'financial_report',
  'invoice',
  'certificate',
  'custom',
);

const coreVariableDefinitionInputs: readonly RegistryVariableDefinitionInput[] =
  [
    {
      key: 'organization.name',
      label: 'Organization Name',
      group: 'organization',
      description: 'Public-facing organization name for branded documents.',
      type: 'string',
      sampleValue: 'Asymmetric Giving',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'text',
      privacy: 'public',
      sourcePath: 'organization.name',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'organization.legal_name',
      label: 'Organization Legal Name',
      group: 'organization',
      description: 'Legal organization name for official receipts and reports.',
      type: 'string',
      sampleValue: 'Asymmetric Giving Foundation',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'text',
      privacy: 'public',
      sourcePath: 'organization.legalName',
      documentCategories: receiptCategories,
    },
    {
      key: 'organization.ein',
      label: 'Organization EIN',
      group: 'organization',
      description: 'Tax identifier used on tax receipts when applicable.',
      type: 'id',
      sampleValue: '12-3456789',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'id.tax',
      privacy: 'sensitive',
      sourcePath: 'organization.ein',
      documentCategories: receiptCategories,
    },
    {
      key: 'organization.address',
      label: 'Organization Address',
      group: 'organization',
      description: 'Mailing address used in letters, receipts, and invoices.',
      type: 'address',
      sampleValue: {
        line1: '100 Mission Way',
        city: 'Franklin',
        region: 'TN',
        postalCode: '37064',
        country: 'US',
      },
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'address.multiline',
      privacy: 'public',
      sourcePath: 'organization.address',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'organization.website',
      label: 'Organization Website',
      group: 'organization',
      description: 'Website URL used in branded footers and letters.',
      type: 'url',
      sampleValue: 'https://example.org',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'url',
      privacy: 'public',
      sourcePath: 'organization.website',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'recipient.id',
      label: 'Recipient ID',
      group: 'recipient',
      description: 'Stable recipient identifier for audit and batch output.',
      type: 'id',
      sampleValue: 'recipient-1001',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'id',
      privacy: 'pii',
      sourcePath: 'recipient.id',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'recipient.full_name',
      label: 'Recipient Full Name',
      group: 'recipient',
      description:
        'Full display name for donors, invoice recipients, or honorees.',
      type: 'string',
      sampleValue: 'Jordan Lee',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'text',
      privacy: 'pii',
      sourcePath: 'recipient.fullName',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'recipient.email',
      label: 'Recipient Email',
      group: 'recipient',
      description:
        'Recipient email address for contact display where appropriate.',
      type: 'string',
      sampleValue: 'jordan.lee@example.test',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'email',
      privacy: 'pii',
      sourcePath: 'recipient.email',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'recipient.address',
      label: 'Recipient Address',
      group: 'recipient',
      description:
        'Recipient mailing address for receipts, statements, and invoices.',
      type: 'address',
      sampleValue: {
        line1: '42 Donor Lane',
        city: 'Austin',
        region: 'TX',
        postalCode: '78701',
        country: 'US',
      },
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'address.multiline',
      privacy: 'pii',
      sourcePath: 'recipient.address',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'donation.id',
      label: 'Donation ID',
      group: 'donation',
      description: 'Stable gift identifier for receipt audit trails.',
      type: 'id',
      sampleValue: 'gift-2001',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'id',
      privacy: 'financial',
      sourcePath: 'donation.id',
      documentCategories: receiptCategories,
    },
    {
      key: 'donation.date',
      label: 'Donation Date',
      group: 'donation',
      description: 'Date the donation was received.',
      type: 'date',
      sampleValue: '2026-04-15',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'date.medium',
      privacy: 'financial',
      sourcePath: 'donation.date',
      documentCategories: receiptCategories,
    },
    {
      key: 'donation.amount',
      label: 'Donation Amount',
      group: 'donation',
      description: 'Gift amount for receipts and donor-facing summaries.',
      type: 'currency',
      sampleValue: 125,
      required: true,
      fallback: { mode: 'none' },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'donation.amount',
      documentCategories: receiptCategories,
    },
    {
      key: 'donation.method',
      label: 'Donation Method',
      group: 'donation',
      description: 'Gift payment method label for receipt context.',
      type: 'string',
      sampleValue: 'Credit card',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'text',
      privacy: 'financial',
      sourcePath: 'donation.method',
      documentCategories: receiptCategories,
    },
    {
      key: 'donation.designation',
      label: 'Donation Designation',
      group: 'donation',
      description: 'Fund, campaign, or designation associated with the gift.',
      type: 'string',
      sampleValue: 'General Fund',
      required: false,
      fallback: { mode: 'use_value', value: 'General Fund' },
      formatter: 'text',
      privacy: 'financial',
      sourcePath: 'donation.designation',
      documentCategories: receiptCategories,
    },
    {
      key: 'donation.goods_services_value',
      label: 'Goods or Services Value',
      group: 'donation',
      description: 'Value of goods or services received by the donor.',
      type: 'currency',
      sampleValue: 0,
      required: false,
      fallback: { mode: 'use_value', value: 0 },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'donation.goodsServicesValue',
      documentCategories: receiptCategories,
    },
    {
      key: 'donation.receipt_number',
      label: 'Donation Receipt Number',
      group: 'donation',
      description: 'Receipt number shown on official donation receipts.',
      type: 'id',
      sampleValue: 'REC-2026-0001',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'receipt.number',
      privacy: 'internal',
      sourcePath: 'donation.receiptNumber',
      documentCategories: receiptCategories,
    },
    {
      key: 'document.title',
      label: 'Document Title',
      group: 'document',
      description: 'Human-readable title for the rendered document.',
      type: 'string',
      sampleValue: 'Sample Document',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'text',
      privacy: 'internal',
      sourcePath: 'document.title',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'document.date',
      label: 'Document Date',
      group: 'document',
      description: 'Date displayed as the document issue or generation date.',
      type: 'date',
      sampleValue: '2026-04-28',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'date.medium',
      privacy: 'internal',
      sourcePath: 'document.date',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'document.number',
      label: 'Document Number',
      group: 'document',
      description: 'Optional official document number or reference code.',
      type: 'id',
      sampleValue: 'DOC-2026-0001',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'id',
      privacy: 'internal',
      sourcePath: 'document.number',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'document.footer_text',
      label: 'Document Footer Text',
      group: 'document',
      description: 'Reusable footer language for branded templates.',
      type: 'rich_text',
      sampleValue: 'Thank you for partnering with our mission.',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'rich_text',
      privacy: 'public',
      sourcePath: 'document.footerText',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'missionary.id',
      label: 'Missionary ID',
      group: 'missionary',
      description: 'Stable missionary or field worker identifier.',
      type: 'id',
      sampleValue: 'missionary-3001',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'id',
      privacy: 'internal',
      sourcePath: 'missionary.id',
      documentCategories: missionaryCategories,
    },
    {
      key: 'missionary.full_name',
      label: 'Missionary Full Name',
      group: 'missionary',
      description: 'Display name for the missionary or field worker.',
      type: 'string',
      sampleValue: 'Avery Carter',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'text',
      privacy: 'pii',
      sourcePath: 'missionary.fullName',
      documentCategories: missionaryCategories,
    },
    {
      key: 'missionary.location',
      label: 'Missionary Location',
      group: 'missionary',
      description: 'Public location label for missionary support reports.',
      type: 'string',
      sampleValue: 'Southeast Asia',
      required: false,
      fallback: { mode: 'use_value', value: 'Field location' },
      formatter: 'text',
      privacy: 'sensitive',
      sourcePath: 'missionary.location',
      documentCategories: missionaryCategories,
    },
    {
      key: 'missionary.support_goal',
      label: 'Missionary Support Goal',
      group: 'missionary',
      description: 'Support goal shown in missionary support reports.',
      type: 'currency',
      sampleValue: 5000,
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'missionary.supportGoal',
      documentCategories: missionaryCategories,
    },
    {
      key: 'missionary.prayer_update',
      label: 'Missionary Prayer Update',
      group: 'missionary',
      description: 'Optional rich-text update for missionary reports.',
      type: 'rich_text',
      sampleValue: 'Please pray for continued community partnerships.',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'rich_text',
      privacy: 'sensitive',
      sourcePath: 'missionary.prayerUpdate',
      documentCategories: missionaryCategories,
    },
    {
      key: 'tax_receipt.tax_year',
      label: 'Tax Receipt Year',
      group: 'tax_receipt',
      description: 'Tax year covered by the receipt.',
      type: 'number',
      sampleValue: 2026,
      required: true,
      fallback: { mode: 'none' },
      formatter: 'number.integer',
      privacy: 'internal',
      sourcePath: 'taxReceipt.taxYear',
      documentCategories: categoryList(
        'tax_receipt',
        'annual_giving_statement',
      ),
    },
    {
      key: 'tax_receipt.deductible_amount',
      label: 'Tax Deductible Amount',
      group: 'tax_receipt',
      description:
        'Amount eligible for tax deduction according to receipt rules.',
      type: 'currency',
      sampleValue: 125,
      required: true,
      fallback: { mode: 'none' },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'taxReceipt.deductibleAmount',
      documentCategories: categoryList(
        'tax_receipt',
        'annual_giving_statement',
      ),
    },
    {
      key: 'tax_receipt.goods_services_statement',
      label: 'Goods or Services Statement',
      group: 'tax_receipt',
      description: 'Receipt language describing goods or services received.',
      type: 'rich_text',
      sampleValue:
        'No goods or services were provided in exchange for this contribution.',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'rich_text',
      privacy: 'public',
      sourcePath: 'taxReceipt.goodsServicesStatement',
      documentCategories: receiptCategories,
    },
    {
      key: 'tax_receipt.issued_date',
      label: 'Tax Receipt Issued Date',
      group: 'tax_receipt',
      description: 'Date the official tax receipt was issued.',
      type: 'date',
      sampleValue: '2026-04-28',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'date.medium',
      privacy: 'internal',
      sourcePath: 'taxReceipt.issuedDate',
      documentCategories: receiptCategories,
    },
    {
      key: 'financial_report.period',
      label: 'Financial Report Period',
      group: 'financial_report',
      description: 'Period label for a financial report.',
      type: 'string',
      sampleValue: 'Q1 2026',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'fiscal.period',
      privacy: 'internal',
      sourcePath: 'financialReport.period',
      documentCategories: financialReportCategories,
    },
    {
      key: 'financial_report.fund_name',
      label: 'Financial Report Fund Name',
      group: 'financial_report',
      description: 'Fund or reporting segment name.',
      type: 'string',
      sampleValue: 'General Fund',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'text',
      privacy: 'financial',
      sourcePath: 'financialReport.fundName',
      documentCategories: financialReportCategories,
    },
    {
      key: 'financial_report.income_total',
      label: 'Income Total',
      group: 'financial_report',
      description: 'Total income for the report period.',
      type: 'currency',
      sampleValue: 25000,
      required: true,
      fallback: { mode: 'none' },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'financialReport.incomeTotal',
      documentCategories: financialReportCategories,
    },
    {
      key: 'financial_report.expense_total',
      label: 'Expense Total',
      group: 'financial_report',
      description: 'Total expenses for the report period.',
      type: 'currency',
      sampleValue: 18250,
      required: true,
      fallback: { mode: 'none' },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'financialReport.expenseTotal',
      documentCategories: financialReportCategories,
    },
    {
      key: 'financial_report.net_balance',
      label: 'Net Balance',
      group: 'financial_report',
      description: 'Net balance for the report period.',
      type: 'currency',
      sampleValue: 6750,
      required: true,
      fallback: { mode: 'none' },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'financialReport.netBalance',
      documentCategories: financialReportCategories,
    },
    {
      key: 'financial_report.row_count',
      label: 'Financial Report Row Count',
      group: 'financial_report',
      description: 'Number of rows included in the report fixture.',
      type: 'number',
      sampleValue: 12,
      required: false,
      fallback: { mode: 'use_value', value: 0 },
      formatter: 'number.integer',
      privacy: 'internal',
      sourcePath: 'financialReport.rowCount',
      documentCategories: financialReportCategories,
    },
    {
      key: 'financial_report.variance_percentage',
      label: 'Financial Report Variance Percentage',
      group: 'financial_report',
      description: 'Percentage variance used in finance summary blocks.',
      type: 'percentage',
      sampleValue: 0.08,
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'percentage',
      privacy: 'financial',
      sourcePath: 'financialReport.variancePercentage',
      documentCategories: financialReportCategories,
    },
    {
      key: 'statement.period',
      label: 'Statement Period',
      group: 'statement',
      description: 'Human-readable statement period label.',
      type: 'string',
      sampleValue: '2026 Year to Date',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'fiscal.period',
      privacy: 'internal',
      sourcePath: 'statement.period',
      documentCategories: statementCategories,
    },
    {
      key: 'statement.start_date',
      label: 'Statement Start Date',
      group: 'statement',
      description: 'Start date of the statement period.',
      type: 'date',
      sampleValue: '2026-01-01',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'date.medium',
      privacy: 'financial',
      sourcePath: 'statement.startDate',
      documentCategories: statementCategories,
    },
    {
      key: 'statement.end_date',
      label: 'Statement End Date',
      group: 'statement',
      description: 'End date of the statement period.',
      type: 'date',
      sampleValue: '2026-12-31',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'date.medium',
      privacy: 'financial',
      sourcePath: 'statement.endDate',
      documentCategories: statementCategories,
    },
    {
      key: 'statement.total_contributions',
      label: 'Statement Total Contributions',
      group: 'statement',
      description: 'Total contributions in an annual giving statement.',
      type: 'currency',
      sampleValue: 2400,
      required: true,
      fallback: { mode: 'none' },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'statement.totalContributions',
      documentCategories: statementCategories,
    },
    {
      key: 'statement.donation_count',
      label: 'Statement Donation Count',
      group: 'statement',
      description: 'Number of donations included in a statement.',
      type: 'number',
      sampleValue: 18,
      required: false,
      fallback: { mode: 'use_value', value: 0 },
      formatter: 'number.integer',
      privacy: 'financial',
      sourcePath: 'statement.donationCount',
      documentCategories: statementCategories,
    },
    {
      key: 'invoice.number',
      label: 'Invoice Number',
      group: 'invoice',
      description: 'Human-readable invoice number.',
      type: 'id',
      sampleValue: 'INV-1001',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'invoice.number',
      privacy: 'internal',
      sourcePath: 'invoice.number',
      documentCategories: invoiceCategories,
    },
    {
      key: 'invoice.due_date',
      label: 'Invoice Due Date',
      group: 'invoice',
      description: 'Date by which invoice payment is due.',
      type: 'date',
      sampleValue: '2026-05-15',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'date.medium',
      privacy: 'financial',
      sourcePath: 'invoice.dueDate',
      documentCategories: invoiceCategories,
    },
    {
      key: 'invoice.subtotal',
      label: 'Invoice Subtotal',
      group: 'invoice',
      description: 'Invoice subtotal before tax or adjustments.',
      type: 'currency',
      sampleValue: 1200,
      required: true,
      fallback: { mode: 'none' },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'invoice.subtotal',
      documentCategories: invoiceCategories,
    },
    {
      key: 'invoice.tax_rate',
      label: 'Invoice Tax Rate',
      group: 'invoice',
      description: 'Tax rate applied to invoice line items when needed.',
      type: 'percentage',
      sampleValue: 0.0825,
      required: false,
      fallback: { mode: 'use_value', value: 0 },
      formatter: 'percentage',
      privacy: 'financial',
      sourcePath: 'invoice.taxRate',
      documentCategories: invoiceCategories,
    },
    {
      key: 'invoice.total',
      label: 'Invoice Total',
      group: 'invoice',
      description: 'Final invoice amount due.',
      type: 'currency',
      sampleValue: 1299,
      required: true,
      fallback: { mode: 'none' },
      formatter: 'currency.usd',
      privacy: 'financial',
      sourcePath: 'invoice.total',
      documentCategories: invoiceCategories,
    },
    {
      key: 'invoice.paid',
      label: 'Invoice Paid',
      group: 'invoice',
      description: 'Whether the invoice is already paid.',
      type: 'boolean',
      sampleValue: false,
      required: false,
      fallback: { mode: 'use_value', value: false },
      formatter: 'boolean.yes_no',
      privacy: 'financial',
      sourcePath: 'invoice.paid',
      documentCategories: invoiceCategories,
    },
    {
      key: 'asset.logo_url',
      label: 'Logo URL',
      group: 'asset',
      description: 'Render-safe logo URL for preview fixtures.',
      type: 'image_url',
      sampleValue: 'https://assets.example.test/logo.png',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'image_url',
      privacy: 'public',
      sourcePath: 'asset.logoUrl',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'asset.logo_alt_text',
      label: 'Logo Alt Text',
      group: 'asset',
      description: 'Accessible alt text for organization logos.',
      type: 'string',
      sampleValue: 'Asymmetric Giving logo',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'text',
      privacy: 'public',
      sourcePath: 'asset.logoAltText',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'asset.signature_url',
      label: 'Signature Image URL',
      group: 'asset',
      description:
        'Render-safe signature image URL for letters and certificates.',
      type: 'image_url',
      sampleValue: 'https://assets.example.test/signature.png',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'image_url',
      privacy: 'sensitive',
      sourcePath: 'asset.signatureUrl',
      documentCategories: categoryList(
        'donor_letter',
        'donation_receipt',
        'tax_receipt',
        'certificate',
      ),
    },
    {
      key: 'asset.portal_url',
      label: 'Donor Portal URL',
      group: 'asset',
      description: 'Safe public URL used for donor portal links or QR codes.',
      type: 'url',
      sampleValue: 'https://example.org/donor-portal',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'url',
      privacy: 'public',
      sourcePath: 'asset.portalUrl',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'computed.current_page',
      label: 'Current Page Number',
      group: 'computed',
      description:
        'Current page number placeholder for future headers and footers.',
      type: 'number',
      sampleValue: 1,
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'number.integer',
      privacy: 'public',
      sourcePath: 'computed.currentPage',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'computed.total_pages',
      label: 'Total Page Count',
      group: 'computed',
      description:
        'Total page count placeholder for future headers and footers.',
      type: 'number',
      sampleValue: 3,
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'number.integer',
      privacy: 'public',
      sourcePath: 'computed.totalPages',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'computed.generated_at',
      label: 'Generated At',
      group: 'computed',
      description: 'Timestamp placeholder for generated sample output.',
      type: 'date',
      sampleValue: '2026-04-28T00:00:00.000Z',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'datetime.medium',
      privacy: 'internal',
      sourcePath: 'computed.generatedAt',
      documentCategories: allDocumentCategories,
    },
    {
      key: 'computed.is_tax_deductible',
      label: 'Is Tax Deductible',
      group: 'computed',
      description:
        'Structured boolean indicating whether a gift is deductible.',
      type: 'boolean',
      sampleValue: true,
      required: false,
      fallback: { mode: 'use_value', value: true },
      formatter: 'boolean.yes_no',
      privacy: 'financial',
      sourcePath: 'computed.isTaxDeductible',
      documentCategories: receiptCategories,
    },
    {
      key: 'document.certificate_title',
      label: 'Certificate Title',
      group: 'document',
      description: 'Title displayed on certificate-style documents.',
      type: 'string',
      sampleValue: 'Certificate of Appreciation',
      required: true,
      fallback: { mode: 'none' },
      formatter: 'text',
      privacy: 'public',
      sourcePath: 'document.certificateTitle',
      documentCategories: certificateCategories,
    },
    {
      key: 'document.donor_letter_body',
      label: 'Donor Letter Body',
      group: 'document',
      description: 'Sample rich-text body for donor letter templates.',
      type: 'rich_text',
      sampleValue: 'Your generosity helps sustain this work.',
      required: false,
      fallback: { mode: 'omit' },
      formatter: 'rich_text',
      privacy: 'internal',
      sourcePath: 'document.donorLetterBody',
      documentCategories: donorLetterCategories,
    },
  ];

export const coreVariableRegistry = createVariableRegistry(
  coreVariableDefinitionInputs,
);

export const coreVariableDefinitions = coreVariableRegistry.definitions;
