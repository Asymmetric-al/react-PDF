import {
  resolveTableRows,
  type TableBindingInput,
  TableBindingSchema,
} from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

const sampleContext = {
  donations: [
    { amount: 50, date: '2026-01-15', designation: 'Missions' },
    { amount: 125, date: '2026-01-02', designation: 'General' },
  ],
  financialRows: [
    { account: 'Income', fund: 'General', total: 100 },
    { account: 'Expense', fund: 'General', total: -30 },
  ],
  invoice: {
    lineItems: [
      { description: 'Design', total: 700 },
      { description: 'Print', total: 300 },
    ],
  },
};

const donationTableBinding = {
  id: 'donation-table',
  sourcePath: 'donations',
  emptyState: 'No donations in this period.',
  grouping: {
    fieldPath: 'designation',
    label: 'Designation',
  },
  totals: [
    {
      columnKey: 'amount',
      operation: 'sum',
      label: 'Total gifts',
    },
  ],
  columns: [
    {
      key: 'date',
      label: 'Date',
      sourcePath: 'date',
      type: 'date',
      formatter: 'date.medium',
      width: '1.2in',
    },
    {
      key: 'designation',
      label: 'Designation',
      sourcePath: 'designation',
      type: 'string',
    },
    {
      key: 'amount',
      label: 'Amount',
      sourcePath: 'amount',
      type: 'currency',
      formatter: 'currency.usd',
      align: 'right',
      width: '0.9in',
    },
  ],
} satisfies TableBindingInput;

describe('Phase 18 financial data table schema and row resolution', () => {
  it('validates table bindings with grouping metadata, totals placeholders, and defaults', () => {
    const parsed = TableBindingSchema.parse(donationTableBinding);

    expect(parsed).toMatchObject({
      id: 'donation-table',
      repeatHeader: true,
      maxRows: 5000,
      grouping: {
        fieldPath: 'designation',
        label: 'Designation',
      },
      totals: [
        {
          columnKey: 'amount',
          operation: 'sum',
          label: 'Total gifts',
        },
      ],
      columns: [
        {
          align: 'left',
          formatter: 'date.medium',
          key: 'date',
          type: 'date',
          width: '1.2in',
        },
        {
          align: 'left',
          key: 'designation',
          type: 'string',
        },
        {
          align: 'right',
          formatter: 'currency.usd',
          key: 'amount',
          type: 'currency',
          width: '0.9in',
        },
      ],
    });
  });

  it('rejects invalid table columns and max row limits', () => {
    expect(() =>
      TableBindingSchema.parse({
        id: 'invalid-table',
        sourcePath: 'donations',
        maxRows: 5001,
        columns: [],
      }),
    ).toThrow();
  });

  it('resolves rows with deterministic formatted cell display values', () => {
    const result = resolveTableRows({
      binding: donationTableBinding,
      context: sampleContext,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.rows.map((row) => row.sourceIndex)).toEqual([0, 1]);
    expect(result.rows[0]?.cells).toMatchObject([
      {
        columnKey: 'date',
        displayValue: 'Jan 15, 2026',
        sourcePath: 'date',
      },
      {
        columnKey: 'designation',
        displayValue: 'Missions',
      },
      {
        align: 'right',
        columnKey: 'amount',
        displayValue: '$50.00',
      },
    ]);
    expect(result.totalPlaceholders).toEqual(donationTableBinding.totals);
  });

  it('returns structured diagnostics for missing and non-array table sources', () => {
    expect(
      resolveTableRows({
        binding: {
          id: 'missing-table',
          sourcePath: 'missingRows',
          columns: [
            { key: 'name', label: 'Name', sourcePath: 'name', type: 'string' },
          ],
        },
        context: sampleContext,
      }).diagnostics,
    ).toMatchObject([
      {
        code: 'missing_table_source',
        severity: 'warning',
        sourcePath: 'missingRows',
      },
    ]);

    expect(
      resolveTableRows({
        binding: {
          id: 'non-array-table',
          sourcePath: 'invoice',
          columns: [
            { key: 'name', label: 'Name', sourcePath: 'name', type: 'string' },
          ],
        },
        context: sampleContext,
      }).diagnostics,
    ).toMatchObject([
      {
        code: 'non_array_table_source',
        severity: 'warning',
        sourcePath: 'invoice',
      },
    ]);
  });

  it('limits rows and reports unsupported column values without throwing', () => {
    const result = resolveTableRows({
      binding: {
        id: 'limited-table',
        maxRows: 1,
        sourcePath: 'financialRows',
        columns: [
          {
            key: 'account',
            label: 'Account',
            sourcePath: 'account',
            type: 'string',
          },
          {
            key: 'missing-total',
            label: 'Missing total',
            sourcePath: 'missing.total',
            type: 'currency',
            formatter: 'currency.usd',
          },
        ],
      },
      context: sampleContext,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unsupported_table_column_value',
          severity: 'warning',
          columnKey: 'missing-total',
        }),
        expect.objectContaining({
          code: 'table_max_rows_exceeded',
          severity: 'warning',
          details: {
            maxRows: 1,
            totalRows: 2,
          },
        }),
      ]),
    );
  });

  it('returns a diagnostic instead of throwing when table bindings are invalid', () => {
    const result = resolveTableRows({
      binding: {
        id: 'too-many-rows',
        maxRows: 9000,
        sourcePath: 'financialRows',
        columns: [
          {
            key: 'account',
            label: 'Account',
            sourcePath: 'account',
            type: 'string',
          },
        ],
      },
      context: sampleContext,
    });

    expect(result.rows).toEqual([]);
    expect(result.diagnostics).toMatchObject([
      {
        bindingId: 'too-many-rows',
        code: 'invalid_table_binding',
        severity: 'error',
        sourcePath: 'financialRows',
      },
    ]);
  });
});
