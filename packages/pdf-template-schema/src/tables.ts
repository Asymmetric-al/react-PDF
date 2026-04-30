import {
  type TableBinding,
  type TableBindingInput,
  TableBindingSchema,
  type TableColumnBinding,
  type TableTotalBinding,
} from './bindings';
import {
  formatVariableValue,
  type VariableFormatterOptions,
} from './formatters';
import {
  getValueAtDataPath,
  type VariableDataContext,
} from './variable-resolution';
import type { RegistryVariableDefinition } from './variables';

export type TableResolutionDiagnosticCode =
  | 'invalid_table_binding'
  | 'missing_table_source'
  | 'non_array_table_source'
  | 'table_max_rows_exceeded'
  | 'unsupported_table_column_value';

export type TableResolutionDiagnosticSeverity = 'error' | 'warning';

export interface TableResolutionDiagnostic {
  readonly code: TableResolutionDiagnosticCode;
  readonly severity: TableResolutionDiagnosticSeverity;
  readonly message: string;
  readonly bindingId: string;
  readonly sourcePath: string;
  readonly columnKey?: string;
  readonly sourceIndex?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface ResolvedTableCell {
  readonly columnKey: string;
  readonly label: string;
  readonly sourcePath: string;
  readonly align: TableColumnBinding['align'];
  readonly width?: string;
  readonly formatter: string;
  readonly rawValue?: unknown;
  readonly displayValue: string;
}

export interface ResolvedTableRow {
  readonly value: unknown;
  readonly sourceIndex: number;
  readonly renderedIndex: number;
  readonly cells: readonly ResolvedTableCell[];
}

export interface ResolveTableRowsInput extends VariableFormatterOptions {
  readonly binding: TableBindingInput;
  readonly context: VariableDataContext;
}

export interface ResolveTableRowsResult {
  readonly binding?: TableBinding;
  readonly rows: readonly ResolvedTableRow[];
  readonly diagnostics: readonly TableResolutionDiagnostic[];
  readonly totalPlaceholders: readonly TableTotalBinding[];
}

export function resolveTableRows(
  input: ResolveTableRowsInput,
): ResolveTableRowsResult {
  const parseResult = TableBindingSchema.safeParse(input.binding);

  if (!parseResult.success) {
    return {
      diagnostics: [
        createInvalidBindingDiagnostic(
          input.binding,
          parseResult.error.message,
        ),
      ],
      rows: [],
      totalPlaceholders: [],
    };
  }

  const binding = parseResult.data;
  const source = getValueAtDataPath(input.context, binding.sourcePath);

  if (!source.found || source.value === undefined || source.value === null) {
    return {
      binding,
      diagnostics: [
        createDiagnostic({
          binding,
          code: 'missing_table_source',
          message: `Table source "${binding.sourcePath}" is missing.`,
          severity: 'warning',
        }),
      ],
      rows: [],
      totalPlaceholders: binding.totals,
    };
  }

  if (!Array.isArray(source.value)) {
    return {
      binding,
      diagnostics: [
        createDiagnostic({
          binding,
          code: 'non_array_table_source',
          details: { actualType: typeof source.value },
          message: `Table source "${binding.sourcePath}" must resolve to an array.`,
          severity: 'warning',
        }),
      ],
      rows: [],
      totalPlaceholders: binding.totals,
    };
  }

  const diagnostics: TableResolutionDiagnostic[] = [];
  const limitedRows = limitRows(binding, source.value, diagnostics);

  return {
    binding,
    diagnostics,
    rows: limitedRows.map((value, renderedIndex) =>
      resolveTableRow({
        binding,
        formatterOptions: input,
        renderedIndex,
        sourceIndex: renderedIndex,
        value,
        diagnostics,
      }),
    ),
    totalPlaceholders: binding.totals,
  };
}

function limitRows(
  binding: TableBinding,
  rows: readonly unknown[],
  diagnostics: TableResolutionDiagnostic[],
): readonly unknown[] {
  if (rows.length <= binding.maxRows) {
    return rows;
  }

  diagnostics.push(
    createDiagnostic({
      binding,
      code: 'table_max_rows_exceeded',
      details: {
        maxRows: binding.maxRows,
        totalRows: rows.length,
      },
      message: `Table "${binding.id}" limited ${rows.length} rows to ${binding.maxRows}.`,
      severity: 'warning',
    }),
  );

  return rows.slice(0, binding.maxRows);
}

function resolveTableRow(input: {
  readonly binding: TableBinding;
  readonly value: unknown;
  readonly sourceIndex: number;
  readonly renderedIndex: number;
  readonly formatterOptions: VariableFormatterOptions;
  readonly diagnostics: TableResolutionDiagnostic[];
}): ResolvedTableRow {
  return {
    cells: input.binding.columns.map((column) =>
      resolveTableCell({
        binding: input.binding,
        column,
        formatterOptions: input.formatterOptions,
        rowValue: input.value,
        sourceIndex: input.sourceIndex,
        diagnostics: input.diagnostics,
      }),
    ),
    renderedIndex: input.renderedIndex,
    sourceIndex: input.sourceIndex,
    value: input.value,
  };
}

function resolveTableCell(input: {
  readonly binding: TableBinding;
  readonly column: TableColumnBinding;
  readonly rowValue: unknown;
  readonly sourceIndex: number;
  readonly formatterOptions: VariableFormatterOptions;
  readonly diagnostics: TableResolutionDiagnostic[];
}): ResolvedTableCell {
  const lookup = getValueAtDataPath(
    isRecord(input.rowValue) ? input.rowValue : {},
    input.column.sourcePath,
  );
  const formatter = resolveColumnFormatter(input.column);

  if (!lookup.found || lookup.value === undefined || lookup.value === null) {
    input.diagnostics.push(
      createUnsupportedColumnDiagnostic({
        binding: input.binding,
        column: input.column,
        message: `Table column "${input.column.key}" could not resolve "${input.column.sourcePath}".`,
        sourceIndex: input.sourceIndex,
      }),
    );

    return createEmptyCell(input.column, formatter);
  }

  const formatted = formatVariableValue({
    ...input.formatterOptions,
    definition: createColumnDefinition(input.binding, input.column, formatter),
    formatter,
    value: lookup.value,
  });

  if (formatted.diagnostics.length > 0) {
    input.diagnostics.push(
      createUnsupportedColumnDiagnostic({
        binding: input.binding,
        column: input.column,
        details: {
          formatterDiagnostics: formatted.diagnostics.map((diagnostic) => ({
            code: diagnostic.code,
            severity: diagnostic.severity,
          })),
        },
        message: `Table column "${input.column.key}" could not format its value.`,
        sourceIndex: input.sourceIndex,
      }),
    );

    return createEmptyCell(input.column, formatter, lookup.value);
  }

  return {
    align: input.column.align,
    columnKey: input.column.key,
    displayValue: formatted.formattedValue,
    formatter,
    label: input.column.label,
    rawValue: lookup.value,
    sourcePath: input.column.sourcePath,
    width: input.column.width,
  };
}

function createEmptyCell(
  column: TableColumnBinding,
  formatter: string,
  rawValue?: unknown,
): ResolvedTableCell {
  return {
    align: column.align,
    columnKey: column.key,
    displayValue: '',
    formatter,
    label: column.label,
    rawValue,
    sourcePath: column.sourcePath,
    width: column.width,
  };
}

function createColumnDefinition(
  binding: TableBinding,
  column: TableColumnBinding,
  formatter: string,
): RegistryVariableDefinition {
  return {
    description: `Phase 18 table column "${column.label}".`,
    documentCategories: ['financial_report'],
    fallback: { mode: 'omit' },
    formatter,
    group: 'financial_report',
    key: `table.${binding.id}.${column.key}`,
    label: column.label,
    privacy: 'financial',
    required: false,
    sampleValue: '',
    sourcePath: column.sourcePath,
    type: column.type,
  };
}

function resolveColumnFormatter(column: TableColumnBinding): string {
  if (column.formatter) {
    return column.formatter;
  }

  switch (column.type) {
    case 'address':
      return 'address.multiline';
    case 'boolean':
      return 'boolean.yes_no';
    case 'currency':
      return 'currency.usd';
    case 'date':
      return 'date.medium';
    case 'id':
      return 'id';
    case 'image_url':
      return 'image_url';
    case 'number':
      return 'number';
    case 'percentage':
      return 'percentage';
    case 'rich_text':
      return 'rich_text';
    case 'string':
      return 'text';
    case 'url':
      return 'url';
  }
}

function createUnsupportedColumnDiagnostic(input: {
  readonly binding: TableBinding;
  readonly column: TableColumnBinding;
  readonly message: string;
  readonly sourceIndex: number;
  readonly details?: Readonly<Record<string, unknown>>;
}): TableResolutionDiagnostic {
  return createDiagnostic({
    binding: input.binding,
    code: 'unsupported_table_column_value',
    columnKey: input.column.key,
    details: input.details,
    message: input.message,
    severity: 'warning',
    sourceIndex: input.sourceIndex,
  });
}

function createDiagnostic(input: {
  readonly binding: TableBinding;
  readonly code: TableResolutionDiagnosticCode;
  readonly message: string;
  readonly severity: TableResolutionDiagnosticSeverity;
  readonly columnKey?: string;
  readonly sourceIndex?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}): TableResolutionDiagnostic {
  return {
    bindingId: input.binding.id,
    code: input.code,
    columnKey: input.columnKey,
    details: input.details,
    message: input.message,
    severity: input.severity,
    sourceIndex: input.sourceIndex,
    sourcePath: input.binding.sourcePath,
  };
}

function createInvalidBindingDiagnostic(
  binding: TableBindingInput,
  message: string,
): TableResolutionDiagnostic {
  const bindingRecord: Readonly<Record<string, unknown>> = isRecord(binding)
    ? binding
    : {};
  const bindingId = readDiagnosticString(bindingRecord.id);
  const sourcePath = readDiagnosticString(bindingRecord.sourcePath);

  return {
    bindingId,
    code: 'invalid_table_binding',
    details: {
      validationError: message,
    },
    message: `Table binding is invalid: ${message}`,
    severity: 'error',
    sourcePath,
  };
}

function readDiagnosticString(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

function isRecord(value: unknown): value is VariableDataContext {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
