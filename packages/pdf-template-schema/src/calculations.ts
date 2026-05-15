import {
  type TableBinding,
  type TableBindingInput,
  TableBindingSchema,
  type TableTotalBinding,
} from './bindings';
import { resolveTableRows } from './tables';
import {
  getValueAtDataPath,
  type VariableDataContext,
} from './variable-resolution';

export type CalculationOperation = 'average' | 'count' | 'max' | 'min' | 'sum';

export type CalculationRoundingMode = 'half_away_from_zero';

export interface CalculationPrecision {
  readonly scale?: number;
  readonly roundingMode?: CalculationRoundingMode;
}

export type CalculationDiagnosticSeverity = 'error' | 'warning';

export type CalculationDiagnosticCode =
  | 'empty_calculation_source'
  | 'invalid_calculation_input'
  | 'invalid_table_calculation_binding'
  | 'missing_calculation_field'
  | 'missing_calculation_source'
  | 'missing_financial_category'
  | 'missing_table_total_column'
  | 'non_array_calculation_source'
  | 'non_numeric_calculation_value'
  | 'unknown_financial_category';

export interface CalculationDiagnostic {
  readonly code: CalculationDiagnosticCode;
  readonly severity: CalculationDiagnosticSeverity;
  readonly message: string;
  readonly sourcePath?: string;
  readonly fieldPath?: string;
  readonly sourceIndex?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface CalculationDecimalValue {
  readonly decimal: string;
  readonly minorUnits: string;
  readonly scale: number;
  readonly count: number;
}

export interface CalculateNumericAggregateInput {
  readonly context: VariableDataContext;
  readonly sourcePath: string;
  readonly valuePath?: string;
  readonly operation: CalculationOperation;
  readonly precision?: CalculationPrecision;
}

export interface CalculateNumericAggregateResult {
  readonly operation: CalculationOperation;
  readonly sourcePath: string;
  readonly valuePath?: string;
  readonly value: CalculationDecimalValue | null;
  readonly diagnostics: readonly CalculationDiagnostic[];
}

export interface CalculateTableTotalsInput {
  readonly context: VariableDataContext;
  readonly tableBinding: TableBindingInput;
  readonly precision?: CalculationPrecision;
}

export interface CalculatedTableTotal {
  readonly columnKey: string;
  readonly label?: string;
  readonly operation: TableTotalBinding['operation'];
  readonly value: CalculationDecimalValue | null;
  readonly diagnostics: readonly CalculationDiagnostic[];
}

export interface CalculateTableTotalsResult {
  readonly binding?: TableBinding;
  readonly totals: readonly CalculatedTableTotal[];
  readonly diagnostics: readonly CalculationDiagnostic[];
}

export interface CalculateGroupedTableTotalsInput {
  readonly context: VariableDataContext;
  readonly sourcePath: string;
  readonly groupPath: string;
  readonly valuePath: string;
  readonly precision?: CalculationPrecision;
}

export interface CalculatedTableGroupTotal {
  readonly key: string;
  readonly label: string;
  readonly total: CalculationDecimalValue;
  readonly diagnostics: readonly CalculationDiagnostic[];
}

export interface CalculateGroupedTableTotalsResult {
  readonly groups: readonly CalculatedTableGroupTotal[];
  readonly grandTotal: CalculationDecimalValue;
  readonly diagnostics: readonly CalculationDiagnostic[];
}

export interface CalculateInvoiceTotalsInput {
  readonly context: VariableDataContext;
  readonly lineItemsPath: string;
  readonly amountPath?: string;
  readonly quantityPath?: string;
  readonly ratePath?: string;
  readonly discountPath?: string;
  readonly taxPath?: string;
  readonly precision?: CalculationPrecision;
}

export interface CalculateInvoiceTotalsResult {
  readonly subtotal: CalculationDecimalValue;
  readonly discounts: CalculationDecimalValue;
  readonly taxes: CalculationDecimalValue;
  readonly total: CalculationDecimalValue;
  readonly diagnostics: readonly CalculationDiagnostic[];
}

export interface CalculateFinancialTotalsInput {
  readonly context: VariableDataContext;
  readonly sourcePath: string;
  readonly amountPath: string;
  readonly categoryPath: string;
  readonly incomeCategories: readonly string[];
  readonly expenseCategories: readonly string[];
  readonly precision?: CalculationPrecision;
}

export interface CalculateFinancialTotalsResult {
  readonly income: CalculationDecimalValue;
  readonly expense: CalculationDecimalValue;
  readonly net: CalculationDecimalValue;
  readonly diagnostics: readonly CalculationDiagnostic[];
}

export interface CalculateTaxDeductibleAmountInput {
  readonly contributionAmount: number | string;
  readonly goodsOrServicesValue?: number | string;
  readonly precision?: CalculationPrecision;
}

export interface CalculateTaxDeductibleAmountResult {
  readonly value: CalculationDecimalValue;
  readonly diagnostics: readonly CalculationDiagnostic[];
}

interface NormalizedPrecision {
  readonly scale: number;
  readonly roundingMode: CalculationRoundingMode;
}

interface ResolvedCalculationRows {
  readonly rows: readonly unknown[];
  readonly diagnostics: readonly CalculationDiagnostic[];
}

interface ParsedDecimal {
  readonly minorUnits: bigint;
  readonly scale: number;
}

interface DecimalLookupResult {
  readonly found: boolean;
  readonly value?: ParsedDecimal;
}

const defaultPrecision: NormalizedPrecision = {
  roundingMode: 'half_away_from_zero',
  scale: 2,
};
const zeroBigInt = BigInt(0);
const oneBigInt = BigInt(1);
const twoBigInt = BigInt(2);
const tenBigInt = BigInt(10);

export function calculateNumericAggregate(
  input: CalculateNumericAggregateInput,
): CalculateNumericAggregateResult {
  const precision = normalizePrecision(input.precision);
  const rowsResult = resolveCalculationRows({
    context: input.context,
    sourcePath: input.sourcePath,
  });
  const aggregate = calculateRowsAggregate({
    operation: input.operation,
    precision,
    rows: rowsResult.rows,
    sourcePath: input.sourcePath,
    valuePath: input.valuePath,
  });

  return {
    ...aggregate,
    diagnostics: [...rowsResult.diagnostics, ...aggregate.diagnostics],
  };
}

export function calculateTableTotals(
  input: CalculateTableTotalsInput,
): CalculateTableTotalsResult {
  const precision = normalizePrecision(input.precision);
  const parseResult = TableBindingSchema.safeParse(input.tableBinding);

  if (!parseResult.success) {
    const diagnostic: CalculationDiagnostic = {
      code: 'invalid_table_calculation_binding',
      details: {
        validationError: parseResult.error.message,
      },
      message: `Table binding is invalid for calculation: ${parseResult.error.message}`,
      severity: 'error',
    };

    return {
      diagnostics: [diagnostic],
      totals: [],
    };
  }

  const binding = parseResult.data;
  const tableRows = resolveTableRows({
    binding,
    context: input.context,
  });
  const rowValues = tableRows.rows.map((row) => row.value);
  const tableDiagnostics = tableRows.diagnostics.map(
    (diagnostic): CalculationDiagnostic => ({
      code:
        diagnostic.code === 'missing_table_source'
          ? 'missing_calculation_source'
          : 'invalid_table_calculation_binding',
      details: diagnostic.details,
      fieldPath: diagnostic.columnKey,
      message: diagnostic.message,
      severity: diagnostic.severity,
      sourceIndex: diagnostic.sourceIndex,
      sourcePath: diagnostic.sourcePath,
    }),
  );
  const columnByKey = new Map(
    binding.columns.map((column) => [column.key, column] as const),
  );

  const totals = binding.totals.map((total) => {
    const column = columnByKey.get(total.columnKey);

    if (!column) {
      const diagnostic: CalculationDiagnostic = {
        code: 'missing_table_total_column',
        fieldPath: total.columnKey,
        message: `Table total references unknown column "${total.columnKey}".`,
        severity: 'error',
        sourcePath: binding.sourcePath,
      };

      return {
        columnKey: total.columnKey,
        diagnostics: [diagnostic],
        label: total.label,
        operation: total.operation,
        value: null,
      };
    }

    const aggregate = calculateRowsAggregate({
      operation: total.operation,
      precision,
      rows: rowValues,
      sourcePath: binding.sourcePath,
      valuePath: column.sourcePath,
    });

    return {
      columnKey: total.columnKey,
      diagnostics: aggregate.diagnostics,
      label: total.label,
      operation: total.operation,
      value: aggregate.value,
    };
  });
  const totalDiagnostics = totals.flatMap((total) => total.diagnostics);

  return {
    binding,
    diagnostics: [...tableDiagnostics, ...totalDiagnostics],
    totals,
  };
}

export function calculateGroupedTableTotals(
  input: CalculateGroupedTableTotalsInput,
): CalculateGroupedTableTotalsResult {
  const precision = normalizePrecision(input.precision);
  const rowsResult = resolveCalculationRows({
    context: input.context,
    sourcePath: input.sourcePath,
  });
  const diagnostics: CalculationDiagnostic[] = [...rowsResult.diagnostics];
  const groups = new Map<
    string,
    { readonly rows: unknown[]; readonly sourceIndexes: number[] }
  >();
  const groupOrder: string[] = [];
  const groupedRows: unknown[] = [];
  const groupedSourceIndexes: number[] = [];

  rowsResult.rows.forEach((row, sourceIndex) => {
    const lookup = getValueAtDataPath(
      isRecord(row) ? row : {},
      input.groupPath,
    );

    if (!lookup.found || lookup.value === undefined || lookup.value === null) {
      diagnostics.push(
        createFieldDiagnostic({
          code: 'missing_calculation_field',
          fieldPath: input.groupPath,
          message: `Calculation field "${input.groupPath}" is missing.`,
          sourceIndex,
          sourcePath: input.sourcePath,
        }),
      );

      return;
    }

    const groupKey = String(lookup.value);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { rows: [], sourceIndexes: [] });
      groupOrder.push(groupKey);
    }

    const group = groups.get(groupKey);
    group?.rows.push(row);
    group?.sourceIndexes.push(sourceIndex);
    groupedRows.push(row);
    groupedSourceIndexes.push(sourceIndex);
  });

  const calculatedGroups = groupOrder.map((groupKey) => {
    const group = groups.get(groupKey);
    const rows = group?.rows ?? [];
    const aggregate = calculateRowsAggregate({
      operation: 'sum',
      precision,
      rows,
      sourcePath: input.sourcePath,
      sourceIndexes: group?.sourceIndexes,
      valuePath: input.valuePath,
    });

    return {
      diagnostics: aggregate.diagnostics,
      key: groupKey,
      label: groupKey,
      total:
        aggregate.value ?? createDecimalValue(zeroBigInt, precision.scale, 0),
    };
  });
  const grandAggregate = calculateRowsAggregate({
    operation: 'sum',
    precision,
    rows: groupedRows,
    sourcePath: input.sourcePath,
    sourceIndexes: groupedSourceIndexes,
    valuePath: input.valuePath,
  });

  diagnostics.push(...grandAggregate.diagnostics);

  return {
    diagnostics,
    grandTotal:
      grandAggregate.value ??
      createDecimalValue(zeroBigInt, precision.scale, 0),
    groups: calculatedGroups,
  };
}

export function calculateInvoiceTotals(
  input: CalculateInvoiceTotalsInput,
): CalculateInvoiceTotalsResult {
  const precision = normalizePrecision(input.precision);
  const rowsResult = resolveCalculationRows({
    context: input.context,
    sourcePath: input.lineItemsPath,
  });
  const diagnostics: CalculationDiagnostic[] = [...rowsResult.diagnostics];
  let subtotal = zeroBigInt;
  let lineCount = 0;

  rowsResult.rows.forEach((row, sourceIndex) => {
    const lineAmount = resolveInvoiceLineAmount({
      amountPath: input.amountPath,
      diagnostics,
      lineItemsPath: input.lineItemsPath,
      precision,
      quantityPath: input.quantityPath,
      ratePath: input.ratePath,
      row,
      sourceIndex,
    });

    if (!lineAmount.found || lineAmount.value === undefined) {
      return;
    }

    subtotal += lineAmount.value.minorUnits;
    lineCount += 1;
  });

  const discounts = input.discountPath
    ? resolveContextDecimalValue({
        context: input.context,
        fieldPath: input.discountPath,
        precision,
        sourcePath: input.discountPath,
      })
    : {
        found: true,
        value: { minorUnits: zeroBigInt, scale: precision.scale },
      };
  const taxes = input.taxPath
    ? resolveContextDecimalValue({
        context: input.context,
        fieldPath: input.taxPath,
        precision,
        sourcePath: input.taxPath,
      })
    : {
        found: true,
        value: { minorUnits: zeroBigInt, scale: precision.scale },
      };

  if (discounts.diagnostics) {
    diagnostics.push(...discounts.diagnostics);
  }

  if (taxes.diagnostics) {
    diagnostics.push(...taxes.diagnostics);
  }

  const discountMinorUnits = discounts.value?.minorUnits ?? zeroBigInt;
  const taxMinorUnits = taxes.value?.minorUnits ?? zeroBigInt;
  const discountCount = input.discountPath && discounts.value ? 1 : 0;
  const taxCount = input.taxPath && taxes.value ? 1 : 0;
  const total = subtotal - discountMinorUnits + taxMinorUnits;

  return {
    diagnostics,
    discounts: createDecimalValue(
      discountMinorUnits,
      precision.scale,
      discountCount,
    ),
    subtotal: createDecimalValue(subtotal, precision.scale, lineCount),
    taxes: createDecimalValue(taxMinorUnits, precision.scale, taxCount),
    total: createDecimalValue(total, precision.scale, lineCount),
  };
}

export function calculateFinancialTotals(
  input: CalculateFinancialTotalsInput,
): CalculateFinancialTotalsResult {
  const precision = normalizePrecision(input.precision);
  const rowsResult = resolveCalculationRows({
    context: input.context,
    sourcePath: input.sourcePath,
  });
  const diagnostics: CalculationDiagnostic[] = [...rowsResult.diagnostics];
  const incomeCategories = new Set(input.incomeCategories);
  const expenseCategories = new Set(input.expenseCategories);
  let income = zeroBigInt;
  let expense = zeroBigInt;
  let incomeCount = 0;
  let expenseCount = 0;

  rowsResult.rows.forEach((row, sourceIndex) => {
    const categoryLookup = getValueAtDataPath(
      isRecord(row) ? row : {},
      input.categoryPath,
    );

    if (
      !categoryLookup.found ||
      categoryLookup.value === undefined ||
      categoryLookup.value === null
    ) {
      diagnostics.push(
        createFieldDiagnostic({
          code: 'missing_financial_category',
          fieldPath: input.categoryPath,
          message: `Financial category field "${input.categoryPath}" is missing.`,
          sourceIndex,
          sourcePath: input.sourcePath,
        }),
      );

      return;
    }

    const category = String(categoryLookup.value);
    const amount = resolveRowDecimalValue({
      diagnostics,
      fieldPath: input.amountPath,
      precision,
      row,
      sourceIndex,
      sourcePath: input.sourcePath,
    });

    if (!amount.found || amount.value === undefined) {
      return;
    }

    if (incomeCategories.has(category)) {
      income += amount.value.minorUnits;
      incomeCount += 1;
      return;
    }

    if (expenseCategories.has(category)) {
      expense += absolute(amount.value.minorUnits);
      expenseCount += 1;
      return;
    }

    diagnostics.push({
      code: 'unknown_financial_category',
      details: { category },
      fieldPath: input.categoryPath,
      message: `Financial category "${category}" is not configured as income or expense.`,
      severity: 'warning',
      sourceIndex,
      sourcePath: input.sourcePath,
    });
  });

  return {
    diagnostics,
    expense: createDecimalValue(expense, precision.scale, expenseCount),
    income: createDecimalValue(income, precision.scale, incomeCount),
    net: createDecimalValue(
      income - expense,
      precision.scale,
      rowsResult.rows.length,
    ),
  };
}

export function calculateTaxDeductibleAmount(
  input: CalculateTaxDeductibleAmountInput,
): CalculateTaxDeductibleAmountResult {
  const precision = normalizePrecision(input.precision);
  const diagnostics: CalculationDiagnostic[] = [];
  const contribution = parseScalarDecimalValue({
    diagnostics,
    fieldPath: 'contributionAmount',
    precision,
    value: input.contributionAmount,
  });
  const goodsOrServices = parseScalarDecimalValue({
    diagnostics,
    fieldPath: 'goodsOrServicesValue',
    precision,
    value: input.goodsOrServicesValue ?? '0',
  });
  const deductible = contribution.minorUnits - goodsOrServices.minorUnits;
  const flooredDeductible = deductible < zeroBigInt ? zeroBigInt : deductible;

  return {
    diagnostics,
    value: createDecimalValue(flooredDeductible, precision.scale, 1),
  };
}

function calculateRowsAggregate(input: {
  readonly rows: readonly unknown[];
  readonly sourcePath: string;
  readonly sourceIndexes?: readonly number[];
  readonly valuePath?: string;
  readonly operation: CalculationOperation;
  readonly precision: NormalizedPrecision;
}): CalculateNumericAggregateResult {
  const diagnostics: CalculationDiagnostic[] = [];

  if (input.operation === 'count') {
    const countMinorUnits =
      BigInt(input.rows.length) * scaleFactor(input.precision.scale);

    return {
      diagnostics,
      operation: input.operation,
      sourcePath: input.sourcePath,
      value: createDecimalValue(
        countMinorUnits,
        input.precision.scale,
        input.rows.length,
      ),
      valuePath: input.valuePath,
    };
  }

  if (!input.valuePath) {
    diagnostics.push({
      code: 'invalid_calculation_input',
      message: `Calculation operation "${input.operation}" requires a value path.`,
      severity: 'error',
      sourcePath: input.sourcePath,
    });

    return {
      diagnostics,
      operation: input.operation,
      sourcePath: input.sourcePath,
      value: null,
      valuePath: input.valuePath,
    };
  }

  const values = input.rows.flatMap((row, rowIndex) => {
    const sourceIndex = input.sourceIndexes?.[rowIndex] ?? rowIndex;
    const value = resolveRowDecimalValue({
      diagnostics,
      fieldPath: input.valuePath ?? '',
      precision: input.precision,
      row,
      sourceIndex,
      sourcePath: input.sourcePath,
    });

    return value.found && value.value ? [value.value.minorUnits] : [];
  });

  if (values.length === 0) {
    if (input.operation === 'sum') {
      return {
        diagnostics,
        operation: input.operation,
        sourcePath: input.sourcePath,
        value: createDecimalValue(zeroBigInt, input.precision.scale, 0),
        valuePath: input.valuePath,
      };
    }

    diagnostics.push({
      code: 'empty_calculation_source',
      fieldPath: input.valuePath,
      message: `Calculation operation "${input.operation}" has no numeric values.`,
      severity: 'warning',
      sourcePath: input.sourcePath,
    });

    return {
      diagnostics,
      operation: input.operation,
      sourcePath: input.sourcePath,
      value: null,
      valuePath: input.valuePath,
    };
  }

  const aggregate = calculateMinorUnitAggregate(input.operation, values);

  return {
    diagnostics,
    operation: input.operation,
    sourcePath: input.sourcePath,
    value: createDecimalValue(aggregate, input.precision.scale, values.length),
    valuePath: input.valuePath,
  };
}

function calculateMinorUnitAggregate(
  operation: CalculationOperation,
  values: readonly bigint[],
): bigint {
  switch (operation) {
    case 'average':
      return divideMinorUnits(
        values.reduce((total, value) => total + value, zeroBigInt),
        BigInt(values.length),
      );
    case 'max':
      return values.reduce((maximum, value) =>
        value > maximum ? value : maximum,
      );
    case 'min':
      return values.reduce((minimum, value) =>
        value < minimum ? value : minimum,
      );
    case 'sum':
      return values.reduce((total, value) => total + value, zeroBigInt);
    case 'count':
      return BigInt(values.length);
  }
}

function resolveCalculationRows(input: {
  readonly context: VariableDataContext;
  readonly sourcePath: string;
}): ResolvedCalculationRows {
  const lookup = getValueAtDataPath(input.context, input.sourcePath);

  if (!lookup.found || lookup.value === undefined || lookup.value === null) {
    return {
      diagnostics: [
        {
          code: 'missing_calculation_source',
          message: `Calculation source "${input.sourcePath}" is missing.`,
          severity: 'warning',
          sourcePath: input.sourcePath,
        },
      ],
      rows: [],
    };
  }

  if (!Array.isArray(lookup.value)) {
    return {
      diagnostics: [
        {
          code: 'non_array_calculation_source',
          details: { actualType: typeof lookup.value },
          message: `Calculation source "${input.sourcePath}" must resolve to an array.`,
          severity: 'warning',
          sourcePath: input.sourcePath,
        },
      ],
      rows: [],
    };
  }

  return {
    diagnostics: [],
    rows: lookup.value,
  };
}

function resolveInvoiceLineAmount(input: {
  readonly row: unknown;
  readonly sourceIndex: number;
  readonly lineItemsPath: string;
  readonly amountPath?: string;
  readonly quantityPath?: string;
  readonly ratePath?: string;
  readonly precision: NormalizedPrecision;
  readonly diagnostics: CalculationDiagnostic[];
}): DecimalLookupResult {
  if (input.amountPath) {
    const amount = resolveRowDecimalValue({
      diagnostics: input.diagnostics,
      emitMissingDiagnostic: false,
      fieldPath: input.amountPath,
      precision: input.precision,
      row: input.row,
      sourceIndex: input.sourceIndex,
      sourcePath: input.lineItemsPath,
    });

    if (amount.found && amount.value) {
      return amount;
    }
  }

  if (!input.quantityPath || !input.ratePath) {
    input.diagnostics.push(
      createFieldDiagnostic({
        code: 'missing_calculation_field',
        fieldPath: input.amountPath ?? 'amount',
        message: 'Invoice line amount could not be resolved.',
        sourceIndex: input.sourceIndex,
        sourcePath: input.lineItemsPath,
      }),
    );

    return { found: false };
  }

  const quantityPrecision: NormalizedPrecision = {
    ...input.precision,
    scale: 4,
  };
  const ratePrecision: NormalizedPrecision = {
    ...input.precision,
    scale: input.precision.scale + 4,
  };
  const quantity = resolveRowDecimalValue({
    diagnostics: input.diagnostics,
    fieldPath: input.quantityPath,
    precision: quantityPrecision,
    row: input.row,
    sourceIndex: input.sourceIndex,
    sourcePath: input.lineItemsPath,
  });
  const rate = resolveRowDecimalValue({
    diagnostics: input.diagnostics,
    fieldPath: input.ratePath,
    precision: ratePrecision,
    row: input.row,
    sourceIndex: input.sourceIndex,
    sourcePath: input.lineItemsPath,
  });

  if (!quantity.found || !quantity.value || !rate.found || !rate.value) {
    return { found: false };
  }

  return {
    found: true,
    value: multiplyDecimalValues(quantity.value, rate.value, input.precision),
  };
}

function resolveContextDecimalValue(input: {
  readonly context: VariableDataContext;
  readonly sourcePath: string;
  readonly fieldPath: string;
  readonly precision: NormalizedPrecision;
}): DecimalLookupResult & {
  readonly diagnostics?: readonly CalculationDiagnostic[];
} {
  const diagnostics: CalculationDiagnostic[] = [];
  const lookup = getValueAtDataPath(input.context, input.sourcePath);

  if (!lookup.found || lookup.value === undefined || lookup.value === null) {
    diagnostics.push(
      createFieldDiagnostic({
        code: 'missing_calculation_field',
        fieldPath: input.fieldPath,
        message: `Calculation field "${input.fieldPath}" is missing.`,
        sourcePath: input.sourcePath,
      }),
    );

    return { diagnostics, found: false };
  }

  const parsed = parseDecimalValue(lookup.value, input.precision);

  if (!parsed) {
    diagnostics.push(
      createFieldDiagnostic({
        code: 'non_numeric_calculation_value',
        fieldPath: input.fieldPath,
        message: `Calculation field "${input.fieldPath}" must be numeric.`,
        sourcePath: input.sourcePath,
      }),
    );

    return { diagnostics, found: false };
  }

  return {
    diagnostics,
    found: true,
    value: parsed,
  };
}

function resolveRowDecimalValue(input: {
  readonly row: unknown;
  readonly sourcePath: string;
  readonly fieldPath: string;
  readonly sourceIndex: number;
  readonly precision: NormalizedPrecision;
  readonly diagnostics: CalculationDiagnostic[];
  readonly emitMissingDiagnostic?: boolean;
}): DecimalLookupResult {
  const lookup = getValueAtDataPath(
    isRecord(input.row) ? input.row : {},
    input.fieldPath,
  );
  const emitMissingDiagnostic = input.emitMissingDiagnostic ?? true;

  if (!lookup.found || lookup.value === undefined || lookup.value === null) {
    if (emitMissingDiagnostic) {
      input.diagnostics.push(
        createFieldDiagnostic({
          code: 'missing_calculation_field',
          fieldPath: input.fieldPath,
          message: `Calculation field "${input.fieldPath}" is missing.`,
          sourceIndex: input.sourceIndex,
          sourcePath: input.sourcePath,
        }),
      );
    }

    return { found: false };
  }

  const parsed = parseDecimalValue(lookup.value, input.precision);

  if (!parsed) {
    input.diagnostics.push(
      createFieldDiagnostic({
        code: 'non_numeric_calculation_value',
        fieldPath: input.fieldPath,
        message: `Calculation field "${input.fieldPath}" must be numeric.`,
        sourceIndex: input.sourceIndex,
        sourcePath: input.sourcePath,
      }),
    );

    return { found: false };
  }

  return {
    found: true,
    value: parsed,
  };
}

function parseScalarDecimalValue(input: {
  readonly value: unknown;
  readonly fieldPath: string;
  readonly precision: NormalizedPrecision;
  readonly diagnostics: CalculationDiagnostic[];
}): ParsedDecimal {
  const parsed = parseDecimalValue(input.value, input.precision);

  if (parsed) {
    return parsed;
  }

  input.diagnostics.push({
    code: 'non_numeric_calculation_value',
    fieldPath: input.fieldPath,
    message: `Calculation field "${input.fieldPath}" must be numeric.`,
    severity: 'warning',
  });

  return {
    minorUnits: zeroBigInt,
    scale: input.precision.scale,
  };
}

function parseDecimalValue(
  value: unknown,
  precision: NormalizedPrecision,
): ParsedDecimal | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return undefined;
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return undefined;
  }

  const source = String(value).trim();

  if (/[eE]/.test(source)) {
    return undefined;
  }

  const match = /^([+-])?(\d+)(?:\.(\d+))?$/.exec(source);

  if (!match) {
    return undefined;
  }

  const sign = match[1] === '-' ? -oneBigInt : oneBigInt;
  const integerPart = match[2] ?? '0';
  const fractionPart = match[3] ?? '';
  const factor = scaleFactor(precision.scale);
  const paddedFraction = fractionPart.padEnd(precision.scale + 1, '0');
  const keptFraction = precision.scale
    ? paddedFraction.slice(0, precision.scale)
    : '';
  const nextDigit = paddedFraction[precision.scale] ?? '0';
  const integerUnits = BigInt(integerPart) * factor;
  const fractionUnits = keptFraction ? BigInt(keptFraction) : zeroBigInt;
  const roundingIncrement = nextDigit >= '5' ? oneBigInt : zeroBigInt;
  const minorUnits = (integerUnits + fractionUnits + roundingIncrement) * sign;

  return {
    minorUnits,
    scale: precision.scale,
  };
}

function multiplyDecimalValues(
  left: ParsedDecimal,
  right: ParsedDecimal,
  precision: NormalizedPrecision,
): ParsedDecimal {
  const product = left.minorUnits * right.minorUnits;
  const productScale = left.scale + right.scale;

  return {
    minorUnits: convertScale(product, productScale, precision.scale),
    scale: precision.scale,
  };
}

function convertScale(
  minorUnits: bigint,
  fromScale: number,
  toScale: number,
): bigint {
  if (fromScale === toScale) {
    return minorUnits;
  }

  if (fromScale < toScale) {
    return minorUnits * scaleFactor(toScale - fromScale);
  }

  return roundDivide(minorUnits, scaleFactor(fromScale - toScale));
}

function divideMinorUnits(minorUnits: bigint, divisor: bigint): bigint {
  return roundDivide(minorUnits, divisor);
}

function roundDivide(dividend: bigint, divisor: bigint): bigint {
  const sign = dividend < zeroBigInt ? -oneBigInt : oneBigInt;
  const absoluteDividend = absolute(dividend);
  const quotient = absoluteDividend / divisor;
  const remainder = absoluteDividend % divisor;
  const increment = remainder * twoBigInt >= divisor ? oneBigInt : zeroBigInt;

  return (quotient + increment) * sign;
}

function createDecimalValue(
  minorUnits: bigint,
  scale: number,
  count: number,
): CalculationDecimalValue {
  return {
    count,
    decimal: formatDecimal(minorUnits, scale),
    minorUnits: minorUnits.toString(),
    scale,
  };
}

function formatDecimal(minorUnits: bigint, scale: number): string {
  const sign = minorUnits < zeroBigInt ? '-' : '';
  const absoluteValue = absolute(minorUnits);

  if (scale === 0) {
    return `${sign}${absoluteValue.toString()}`;
  }

  const padded = absoluteValue.toString().padStart(scale + 1, '0');
  const integerPart = padded.slice(0, -scale);
  const fractionPart = padded.slice(-scale);

  return `${sign}${integerPart}.${fractionPart}`;
}

function normalizePrecision(
  precision: CalculationPrecision | undefined,
): NormalizedPrecision {
  if (
    precision?.scale === undefined ||
    !Number.isInteger(precision.scale) ||
    precision.scale < 0
  ) {
    return defaultPrecision;
  }

  return {
    roundingMode: precision.roundingMode ?? defaultPrecision.roundingMode,
    scale: precision.scale,
  };
}

function scaleFactor(scale: number): bigint {
  let factor = oneBigInt;

  for (let index = 0; index < scale; index += 1) {
    factor *= tenBigInt;
  }

  return factor;
}

function absolute(value: bigint): bigint {
  return value < zeroBigInt ? -value : value;
}

function createFieldDiagnostic(input: {
  readonly code:
    | 'missing_calculation_field'
    | 'missing_financial_category'
    | 'non_numeric_calculation_value';
  readonly fieldPath: string;
  readonly message: string;
  readonly sourcePath: string;
  readonly sourceIndex?: number;
}): CalculationDiagnostic {
  return {
    code: input.code,
    fieldPath: input.fieldPath,
    message: input.message,
    severity: 'warning',
    sourceIndex: input.sourceIndex,
    sourcePath: input.sourcePath,
  };
}

function isRecord(value: unknown): value is VariableDataContext {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
