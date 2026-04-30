import { composePdfDocumentHtml } from '@asym/pdf-renderer';
import type {
  DocumentContentNode,
  TableBindingInput,
} from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

const dataContext = {
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
    },
  ],
} satisfies TableBindingInput;

function doc(content: readonly DocumentContentNode[]): DocumentContentNode {
  return {
    content,
    type: 'doc',
  };
}

describe('Phase 18 renderer data tables', () => {
  it('renders a donation table with repeated header markup and formatted cells', () => {
    const result = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            binding: donationTableBinding,
          },
          type: 'dataTable',
        },
      ]),
    });

    expect(result.warnings).toEqual([]);
    expect(result.html).toContain('data-asym-data-table="true"');
    expect(result.html).toContain('<thead class="pdf-data-table-header">');
    expect(result.html).toContain('data-table-repeat-header="true"');
    expect(result.html).toContain('Jan 15, 2026');
    expect(result.html).toContain('Missions');
    expect(result.html).toContain('$50.00');
  });

  it('renders invoice line items through an external table binding id', () => {
    const result = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            bindingId: 'invoice-lines',
          },
          type: 'dataTable',
        },
      ]),
      tableBindings: [
        {
          id: 'invoice-lines',
          sourcePath: 'invoice.lineItems',
          columns: [
            {
              key: 'description',
              label: 'Description',
              sourcePath: 'description',
              type: 'string',
            },
            {
              align: 'right',
              formatter: 'currency.usd',
              key: 'total',
              label: 'Total',
              sourcePath: 'total',
              type: 'currency',
            },
          ],
        },
      ],
    });

    expect(result.warnings).toEqual([]);
    expect(result.html).toContain('Design');
    expect(result.html).toContain('$700.00');
  });

  it('renders financial rows, empty states, and max-row diagnostics deterministically', () => {
    const limited = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            binding: {
              id: 'financial-table',
              maxRows: 1,
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
          },
          type: 'dataTable',
        },
      ]),
    });
    const empty = composePdfDocumentHtml({
      dataContext: {
        donations: [],
      },
      document: doc([
        {
          attrs: {
            binding: donationTableBinding,
          },
          type: 'dataTable',
        },
      ]),
    });

    expect(limited.html).toContain('Income');
    expect(limited.html).not.toContain('Expense');
    expect(limited.warnings).toMatchObject([
      {
        code: 'table_max_rows_exceeded',
        severity: 'warning',
      },
    ]);
    expect(empty.html).toContain('No donations in this period.');
    expect(empty.html).toContain('data-table-empty-state="true"');
  });

  it('reports missing or invalid table bindings without throwing', () => {
    const missing = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {},
          type: 'dataTable',
        },
      ]),
    });
    const invalid = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            bindingId: 'invalid-table',
          },
          type: 'dataTable',
        },
      ]),
      tableBindings: [
        {
          id: 'invalid-table',
          sourcePath: 'financialRows',
          maxRows: 9000,
          columns: [
            {
              key: 'account',
              label: 'Account',
              sourcePath: 'account',
              type: 'string',
            },
          ],
        },
      ],
    });

    expect(missing.warnings).toMatchObject([
      {
        code: 'missing_table_binding',
        severity: 'error',
      },
    ]);
    expect(invalid.warnings).toMatchObject([
      {
        code: 'invalid_table_binding',
        severity: 'error',
      },
    ]);
    expect(invalid.html).toContain('data-asym-data-table="true"');
  });

  it('renders totals placeholders without calculating totals in Phase 18', () => {
    const result = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            binding: donationTableBinding,
          },
          type: 'dataTable',
        },
      ]),
    });

    expect(result.html).toContain('data-table-total-placeholder="true"');
    expect(result.html).toContain('Total gifts');
    expect(result.html).not.toContain('$175.00');
  });
});
