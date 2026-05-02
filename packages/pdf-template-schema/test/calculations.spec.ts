import type { TableBindingInput } from '@asym/pdf-template-schema';
import {
  calculateFinancialTotals,
  calculateGroupedTableTotals,
  calculateInvoiceTotals,
  calculateNumericAggregate,
  calculateTableTotals,
  calculateTaxDeductibleAmount,
} from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';
import {
  annualGivingStatementTablePreviewFixture,
  financialReportTablePreviewFixture,
  invoiceTablePreviewFixture,
} from './fixtures/table-preview-fixtures';

describe('Phase 22 deterministic calculation engine', () => {
  it('calculates donation sums from Phase 21 table rows', () => {
    const result = calculateTableTotals({
      context: annualGivingStatementTablePreviewFixture.dataContext,
      tableBinding: getFirstTableBinding(
        annualGivingStatementTablePreviewFixture.template,
      ),
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.totals).toEqual([
      expect.objectContaining({
        columnKey: 'amount',
        operation: 'sum',
        value: {
          count: 3,
          decimal: '250.00',
          minorUnits: '25000',
          scale: 2,
        },
      }),
    ]);
  });

  it('calculates invoice subtotals and totals without hidden expressions', () => {
    const result = calculateInvoiceTotals({
      amountPath: 'amount',
      context: invoiceTablePreviewFixture.dataContext,
      lineItemsPath: 'invoice.lineItems',
      quantityPath: 'quantity',
      ratePath: 'rate',
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.subtotal.decimal).toBe('350.00');
    expect(result.total.decimal).toBe('350.00');
    expect(result.subtotal.minorUnits).toBe('35000');
    expect(result.total.count).toBe(2);
  });

  it('derives invoice line amounts from quantity and rate when amount is absent', () => {
    const result = calculateInvoiceTotals({
      context: {
        invoice: {
          discount: '5.00',
          lineItems: [
            {
              quantity: '2',
              rate: '19.995',
            },
          ],
          tax: '1.01',
        },
      },
      discountPath: 'invoice.discount',
      lineItemsPath: 'invoice.lineItems',
      quantityPath: 'quantity',
      ratePath: 'rate',
      taxPath: 'invoice.tax',
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.subtotal.decimal).toBe('39.99');
    expect(result.discounts.decimal).toBe('5.00');
    expect(result.taxes.decimal).toBe('1.01');
    expect(result.total.decimal).toBe('36.00');
  });

  it('calculates grouped subtotals in first-seen group order', () => {
    const result = calculateGroupedTableTotals({
      context: financialReportTablePreviewFixture.dataContext,
      groupPath: 'fund',
      sourcePath: 'report.rows',
      valuePath: 'amount',
    });

    expect(result.diagnostics).toEqual([]);
    expect(
      result.groups.map((group) => ({
        decimal: group.total.decimal,
        key: group.key,
        label: group.label,
      })),
    ).toEqual([
      { decimal: '1200.00', key: 'Operating', label: 'Operating' },
      { decimal: '-350.00', key: 'Outreach', label: 'Outreach' },
      { decimal: '275.00', key: 'Training', label: 'Training' },
    ]);
    expect(result.grandTotal.decimal).toBe('1125.00');
  });

  it('keeps grouped aggregate diagnostics out of the outer diagnostics list', () => {
    const result = calculateGroupedTableTotals({
      context: {
        rows: [
          { amount: '10.00', fund: 'Operating' },
          { amount: 'not a number', fund: 'Operating' },
          { fund: 'Outreach' },
        ],
      },
      groupPath: 'fund',
      sourcePath: 'rows',
      valuePath: 'amount',
    });

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]?.diagnostics).toEqual([
      expect.objectContaining({
        code: 'non_numeric_calculation_value',
        fieldPath: 'amount',
        sourceIndex: 1,
      }),
    ]);
    expect(result.groups[1]?.diagnostics).toEqual([
      expect.objectContaining({
        code: 'missing_calculation_field',
        fieldPath: 'amount',
      }),
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'non_numeric_calculation_value',
        fieldPath: 'amount',
        sourceIndex: 1,
      }),
      expect.objectContaining({
        code: 'missing_calculation_field',
        fieldPath: 'amount',
        sourceIndex: 2,
      }),
    ]);
  });

  it('calculates income, expense, and net financial totals', () => {
    const result = calculateFinancialTotals({
      amountPath: 'amount',
      categoryPath: 'category',
      context: financialReportTablePreviewFixture.dataContext,
      expenseCategories: ['Expense'],
      incomeCategories: ['Income'],
      sourcePath: 'report.rows',
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.income.decimal).toBe('1475.00');
    expect(result.expense.decimal).toBe('350.00');
    expect(result.net.decimal).toBe('1125.00');
  });

  it('covers count, average, min, max, and empty array behavior', () => {
    const context = {
      emptyRows: [],
      rows: [{ amount: '10.00' }, { amount: '20.00' }, { amount: '30.00' }],
    };

    expect(
      calculateNumericAggregate({
        context,
        operation: 'count',
        sourcePath: 'rows',
        valuePath: 'amount',
      }).value,
    ).toMatchObject({ decimal: '3.00', minorUnits: '300' });
    expect(
      calculateNumericAggregate({
        context,
        operation: 'average',
        sourcePath: 'rows',
        valuePath: 'amount',
      }).value,
    ).toMatchObject({ count: 3, decimal: '20.00' });
    expect(
      calculateNumericAggregate({
        context,
        operation: 'min',
        sourcePath: 'rows',
        valuePath: 'amount',
      }).value,
    ).toMatchObject({ decimal: '10.00' });
    expect(
      calculateNumericAggregate({
        context,
        operation: 'max',
        sourcePath: 'rows',
        valuePath: 'amount',
      }).value,
    ).toMatchObject({ decimal: '30.00' });

    const emptyAverage = calculateNumericAggregate({
      context,
      operation: 'average',
      sourcePath: 'emptyRows',
      valuePath: 'amount',
    });

    expect(emptyAverage.value).toBeNull();
    expect(emptyAverage.diagnostics).toEqual([
      expect.objectContaining({
        code: 'empty_calculation_source',
        severity: 'warning',
      }),
    ]);
  });

  it('returns diagnostics for missing paths and non-number fields', () => {
    const result = calculateNumericAggregate({
      context: {
        rows: [{ amount: 10 }, { amount: 'not a number' }, {}],
      },
      operation: 'sum',
      sourcePath: 'rows',
      valuePath: 'amount',
    });

    expect(result.value).toMatchObject({
      count: 1,
      decimal: '10.00',
      minorUnits: '1000',
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'non_numeric_calculation_value',
        severity: 'warning',
        sourceIndex: 1,
      }),
      expect.objectContaining({
        code: 'missing_calculation_field',
        severity: 'warning',
        sourceIndex: 2,
      }),
    ]);

    expect(
      calculateNumericAggregate({
        context: {},
        operation: 'sum',
        sourcePath: 'missingRows',
        valuePath: 'amount',
      }).diagnostics,
    ).toEqual([
      expect.objectContaining({
        code: 'missing_calculation_source',
        severity: 'warning',
      }),
    ]);
  });

  it('uses deterministic decimal precision without a decimal dependency', () => {
    const result = calculateNumericAggregate({
      context: {
        rows: [{ amount: '0.1' }, { amount: '0.2' }],
      },
      operation: 'sum',
      sourcePath: 'rows',
      valuePath: 'amount',
    });
    const positiveRound = calculateNumericAggregate({
      context: { rows: [{ amount: '1.005' }] },
      operation: 'sum',
      sourcePath: 'rows',
      valuePath: 'amount',
    });
    const negativeRound = calculateNumericAggregate({
      context: { rows: [{ amount: '-1.005' }] },
      operation: 'sum',
      sourcePath: 'rows',
      valuePath: 'amount',
    });

    expect(result.value).toMatchObject({
      decimal: '0.30',
      minorUnits: '30',
      scale: 2,
    });
    expect(positiveRound.value?.decimal).toBe('1.01');
    expect(negativeRound.value?.decimal).toBe('-1.01');
  });

  it('rejects exponential notation instead of parsing through floating point', () => {
    const result = calculateNumericAggregate({
      context: {
        rows: [{ amount: '1.23456789012345678901e2' }, { amount: '1.00' }],
      },
      operation: 'sum',
      sourcePath: 'rows',
      valuePath: 'amount',
    });

    expect(result.value).toMatchObject({
      count: 1,
      decimal: '1.00',
      minorUnits: '100',
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'non_numeric_calculation_value',
        fieldPath: 'amount',
        sourceIndex: 0,
      }),
    ]);
  });

  it('calculates tax-deductible amounts with a zero floor', () => {
    expect(
      calculateTaxDeductibleAmount({
        contributionAmount: '250.00',
        goodsOrServicesValue: '40.00',
      }),
    ).toMatchObject({
      diagnostics: [],
      value: {
        decimal: '210.00',
        minorUnits: '21000',
        scale: 2,
      },
    });

    expect(
      calculateTaxDeductibleAmount({
        contributionAmount: '25.00',
        goodsOrServicesValue: '40.00',
      }).value.decimal,
    ).toBe('0.00');
  });
});

function getFirstTableBinding(
  template: Readonly<Record<string, unknown>>,
): TableBindingInput {
  const tableBindings = template.tableBindings as
    | readonly TableBindingInput[]
    | undefined;
  const tableBinding = tableBindings?.[0];

  if (!tableBinding) {
    throw new Error('Expected table fixture to define a table binding.');
  }

  return tableBinding;
}
