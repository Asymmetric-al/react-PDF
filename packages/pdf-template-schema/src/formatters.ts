import type { RegistryVariableDefinition } from './variables';

export type VariableResolutionDiagnosticSeverity = 'warning' | 'error';

export type VariableResolutionDiagnosticCode =
  | 'invalid_variable_type'
  | 'invalid_variable_value'
  | 'missing_optional_value'
  | 'missing_required_value'
  | 'unknown_formatter'
  | 'unknown_variable';

export interface VariableResolutionDiagnostic {
  readonly code: VariableResolutionDiagnosticCode;
  readonly severity: VariableResolutionDiagnosticSeverity;
  readonly message: string;
  readonly variableKey: string;
  readonly sourcePath?: string;
  readonly formatter?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface VariableFormatterOptions {
  readonly locale?: string;
  readonly currency?: string;
  readonly timeZone?: string;
}

export interface NormalizedVariableFormatterOptions {
  readonly locale: string;
  readonly currency: string;
  readonly timeZone: string;
}

export interface VariableFormatterContext
  extends NormalizedVariableFormatterOptions {
  readonly definition: RegistryVariableDefinition;
  readonly formatter: string;
}

export interface VariableFormatResult {
  readonly formattedValue: string;
  readonly diagnostics: readonly VariableResolutionDiagnostic[];
}

export type VariableFormatter = (
  value: unknown,
  context: VariableFormatterContext,
) => VariableFormatResult;

export type VariableFormatterMap = Readonly<Record<string, VariableFormatter>>;

export interface FormatVariableValueInput extends VariableFormatterOptions {
  readonly definition: RegistryVariableDefinition;
  readonly value: unknown;
  readonly formatter?: string;
  readonly formatters?: VariableFormatterMap;
}

const defaultFormatterOptions: NormalizedVariableFormatterOptions = {
  currency: 'USD',
  locale: 'en-US',
  timeZone: 'UTC',
};

export const defaultVariableFormatters: VariableFormatterMap = Object.freeze({
  'address.multiline': formatAddress,
  'boolean.true_false': formatBooleanTrueFalse,
  'boolean.yes_no': formatBooleanYesNo,
  'currency.usd': formatCurrency,
  'date.medium': formatDate,
  'date.short': formatDate,
  'date_range.medium': formatDateRange,
  'datetime.medium': formatDateTime,
  email: formatText,
  'fiscal.period': formatFiscalPeriod,
  'fiscal.year': formatFiscalYear,
  id: formatText,
  'id.tax': formatText,
  image_url: formatText,
  'invoice.number': formatText,
  number: formatNumber,
  'number.integer': formatInteger,
  percentage: formatPercentage,
  'receipt.number': formatText,
  rich_text: formatText,
  text: formatText,
  url: formatText,
});

export function normalizeVariableFormatterOptions(
  options: VariableFormatterOptions = {},
): NormalizedVariableFormatterOptions {
  return {
    currency: options.currency ?? defaultFormatterOptions.currency,
    locale: options.locale ?? defaultFormatterOptions.locale,
    timeZone: options.timeZone ?? defaultFormatterOptions.timeZone,
  };
}

export function formatVariableValue(
  input: FormatVariableValueInput,
): VariableFormatResult {
  const formatterName = input.formatter ?? input.definition.formatter;
  const formatters = input.formatters ?? defaultVariableFormatters;
  const formatter = formatters[formatterName];

  if (!formatter) {
    return {
      diagnostics: [
        createDiagnostic({
          code: 'unknown_formatter',
          definition: input.definition,
          formatter: formatterName,
          message: `Unknown variable formatter "${formatterName}".`,
          severity: 'error',
        }),
      ],
      formattedValue: '',
    };
  }

  const validationDiagnostic = validateFormatterValue(
    input.definition,
    formatterName,
    input.value,
  );

  if (validationDiagnostic) {
    return {
      diagnostics: [validationDiagnostic],
      formattedValue: '',
    };
  }

  return formatter(input.value, {
    ...normalizeVariableFormatterOptions(input),
    definition: input.definition,
    formatter: formatterName,
  });
}

function createDiagnostic(input: {
  readonly code: VariableResolutionDiagnosticCode;
  readonly severity: VariableResolutionDiagnosticSeverity;
  readonly message: string;
  readonly definition: RegistryVariableDefinition;
  readonly formatter?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}): VariableResolutionDiagnostic {
  return {
    code: input.code,
    details: input.details,
    formatter: input.formatter,
    message: input.message,
    severity: input.severity,
    sourcePath: input.definition.sourcePath,
    variableKey: input.definition.key,
  };
}

function validateFormatterValue(
  definition: RegistryVariableDefinition,
  formatter: string,
  value: unknown,
): VariableResolutionDiagnostic | undefined {
  if (formatter === 'date_range.medium') {
    return validateDateRange(definition, formatter, value);
  }

  if (formatter === 'fiscal.year') {
    return validateFiscalYear(definition, formatter, value);
  }

  const validType = isValueValidForType(definition.type, value);

  if (!validType) {
    return createDiagnostic({
      code: 'invalid_variable_type',
      definition,
      formatter,
      message: `Variable "${definition.key}" expected ${definition.type}.`,
      severity: definition.required ? 'error' : 'warning',
    });
  }

  if (
    (definition.type === 'url' || definition.type === 'image_url') &&
    !isHttpUrl(value)
  ) {
    return createDiagnostic({
      code: 'invalid_variable_value',
      definition,
      formatter,
      message: `Variable "${definition.key}" must be an http or https URL.`,
      severity: definition.required ? 'error' : 'warning',
    });
  }

  if (definition.type === 'date' && parseDate(value) === undefined) {
    return createDiagnostic({
      code: 'invalid_variable_value',
      definition,
      formatter,
      message: `Variable "${definition.key}" must be a valid date.`,
      severity: definition.required ? 'error' : 'warning',
    });
  }

  return undefined;
}

function validateDateRange(
  definition: RegistryVariableDefinition,
  formatter: string,
  value: unknown,
): VariableResolutionDiagnostic | undefined {
  const range = readDateRange(value);

  if (range && parseDate(range.startDate) && parseDate(range.endDate)) {
    return undefined;
  }

  return createDiagnostic({
    code: 'invalid_variable_value',
    definition,
    formatter,
    message: `Variable "${definition.key}" must be a valid date range.`,
    severity: definition.required ? 'error' : 'warning',
  });
}

function validateFiscalYear(
  definition: RegistryVariableDefinition,
  formatter: string,
  value: unknown,
): VariableResolutionDiagnostic | undefined {
  const year = readFiscalYear(value);

  if (year !== undefined) {
    return undefined;
  }

  return createDiagnostic({
    code: 'invalid_variable_value',
    definition,
    formatter,
    message: `Variable "${definition.key}" must be a valid fiscal year.`,
    severity: definition.required ? 'error' : 'warning',
  });
}

function isValueValidForType(
  type: RegistryVariableDefinition['type'],
  value: unknown,
): boolean {
  switch (type) {
    case 'address':
      return isRecord(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'currency':
    case 'number':
    case 'percentage':
      return typeof value === 'number' && Number.isFinite(value);
    case 'date':
      return typeof value === 'string' || value instanceof Date;
    case 'id':
    case 'image_url':
    case 'rich_text':
    case 'string':
    case 'url':
      return typeof value === 'string';
  }
}

function formatText(value: unknown): VariableFormatResult {
  return {
    diagnostics: [],
    formattedValue: String(value),
  };
}

function formatCurrency(
  value: unknown,
  context: VariableFormatterContext,
): VariableFormatResult {
  return {
    diagnostics: [],
    formattedValue: new Intl.NumberFormat(context.locale, {
      currency: context.currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: 'currency',
    }).format(Number(value)),
  };
}

function formatDate(
  value: unknown,
  context: VariableFormatterContext,
): VariableFormatResult {
  const date = parseDate(value);

  if (!date) {
    return createInvalidFormatterValueResult(context);
  }

  return {
    diagnostics: [],
    formattedValue: new Intl.DateTimeFormat(context.locale, {
      dateStyle: context.formatter === 'date.short' ? 'short' : 'medium',
      timeZone: context.timeZone,
    }).format(date),
  };
}

function formatDateTime(
  value: unknown,
  context: VariableFormatterContext,
): VariableFormatResult {
  const date = parseDate(value);

  if (!date) {
    return createInvalidFormatterValueResult(context);
  }

  return {
    diagnostics: [],
    formattedValue: new Intl.DateTimeFormat(context.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: context.timeZone,
    }).format(date),
  };
}

function formatDateRange(
  value: unknown,
  context: VariableFormatterContext,
): VariableFormatResult {
  const range = readDateRange(value);
  const startDate = parseDate(range?.startDate);
  const endDate = parseDate(range?.endDate);

  if (!startDate || !endDate) {
    return createInvalidFormatterValueResult(context);
  }

  const formatter = new Intl.DateTimeFormat(context.locale, {
    dateStyle: 'medium',
    timeZone: context.timeZone,
  });

  return {
    diagnostics: [],
    formattedValue: `${formatter.format(startDate)} - ${formatter.format(endDate)}`,
  };
}

function formatNumber(
  value: unknown,
  context: VariableFormatterContext,
): VariableFormatResult {
  return {
    diagnostics: [],
    formattedValue: new Intl.NumberFormat(context.locale, {
      maximumFractionDigits: 2,
    }).format(Number(value)),
  };
}

function formatInteger(
  value: unknown,
  context: VariableFormatterContext,
): VariableFormatResult {
  return {
    diagnostics: [],
    formattedValue: new Intl.NumberFormat(context.locale, {
      maximumFractionDigits: 0,
    }).format(Number(value)),
  };
}

function formatPercentage(
  value: unknown,
  context: VariableFormatterContext,
): VariableFormatResult {
  return {
    diagnostics: [],
    formattedValue: new Intl.NumberFormat(context.locale, {
      maximumFractionDigits: 2,
      style: 'percent',
    }).format(Number(value)),
  };
}

function formatAddress(value: unknown): VariableFormatResult {
  const address = isRecord(value) ? value : {};
  const streetLines = [address.line1, address.line2].filter(isNonEmptyString);
  const city = isNonEmptyString(address.city) ? address.city : undefined;
  const regionPostal = [address.region, address.postalCode]
    .filter(isNonEmptyString)
    .join(' ');
  const cityRegionPostal = [city, regionPostal]
    .filter(isNonEmptyString)
    .join(', ');
  const lines = [
    ...streetLines,
    cityRegionPostal,
    isNonEmptyString(address.country) ? address.country : undefined,
  ].filter(isNonEmptyString);

  return {
    diagnostics: [],
    formattedValue: lines.join('\n'),
  };
}

function formatFiscalPeriod(value: unknown): VariableFormatResult {
  if (typeof value === 'number') {
    return formatFiscalYear(value);
  }

  if (typeof value === 'string' && /^\d{4}$/.test(value)) {
    return formatFiscalYear(Number(value));
  }

  if (isRecord(value)) {
    const range = readDateRange(value);

    if (range) {
      return {
        diagnostics: [],
        formattedValue: `${range.startDate} - ${range.endDate}`,
      };
    }
  }

  return {
    diagnostics: [],
    formattedValue: String(value),
  };
}

function formatFiscalYear(value: unknown): VariableFormatResult {
  return {
    diagnostics: [],
    formattedValue: `FY ${Number(value)}`,
  };
}

function formatBooleanYesNo(value: unknown): VariableFormatResult {
  return {
    diagnostics: [],
    formattedValue: value === true ? 'Yes' : 'No',
  };
}

function formatBooleanTrueFalse(value: unknown): VariableFormatResult {
  return {
    diagnostics: [],
    formattedValue: value === true ? 'True' : 'False',
  };
}

function parseDate(value: unknown): Date | undefined {
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function createInvalidFormatterValueResult(
  context: VariableFormatterContext,
): VariableFormatResult {
  return {
    diagnostics: [
      createDiagnostic({
        code: 'invalid_variable_value',
        definition: context.definition,
        formatter: context.formatter,
        message: `Variable "${context.definition.key}" cannot be formatted by "${context.formatter}".`,
        severity: context.definition.required ? 'error' : 'warning',
      }),
    ],
    formattedValue: '',
  };
}

function readDateRange(
  value: unknown,
): { readonly startDate: unknown; readonly endDate: unknown } | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const startDate = value.startDate ?? value.start;
  const endDate = value.endDate ?? value.end;

  if (startDate === undefined || endDate === undefined) {
    return undefined;
  }

  return { endDate, startDate };
}

function readFiscalYear(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d{4}$/.test(value)) {
    return Number(value);
  }

  return undefined;
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
