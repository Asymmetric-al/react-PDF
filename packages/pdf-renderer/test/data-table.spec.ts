import { readFileSync } from 'node:fs';
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
    { account: 'Income', amount: 1200, fund: 'General' },
    { account: 'Expense', amount: -350, fund: 'Outreach' },
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
      label: 'Total gifts',
      operation: 'sum',
    },
  ],
  columns: [
    {
      formatter: 'date.medium',
      key: 'date',
      label: 'Date',
      sourcePath: 'date',
      type: 'date',
    },
    {
      key: 'designation',
      label: 'Designation',
      sourcePath: 'designation',
      type: 'string',
    },
    {
      align: 'right',
      formatter: 'currency.usd',
      key: 'amount',
      label: 'Amount',
      sourcePath: 'amount',
      type: 'currency',
    },
  ],
} satisfies TableBindingInput;

const invoiceTableBinding = {
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
} satisfies TableBindingInput;

const financialReportTableBinding = {
  id: 'financial-report',
  sourcePath: 'financialRows',
  grouping: {
    fieldPath: 'fund',
    label: 'Fund',
  },
  columns: [
    {
      key: 'fund',
      label: 'Fund',
      sourcePath: 'fund',
      type: 'string',
      width: '25%',
    },
    {
      key: 'account',
      label: 'Account',
      sourcePath: 'account',
      type: 'string',
      width: '45%',
    },
    {
      align: 'right',
      formatter: 'currency.usd',
      key: 'amount',
      label: 'Amount',
      sourcePath: 'amount',
      type: 'currency',
      width: '30%',
    },
  ],
} satisfies TableBindingInput;

const oneColumnTableBinding = {
  id: 'one-column',
  sourcePath: 'donations',
  emptyState: 'No rows.',
  columns: [
    {
      formatter: 'currency.usd',
      key: 'amount',
      label: 'Amount',
      sourcePath: 'amount',
      type: 'currency',
    },
  ],
} satisfies TableBindingInput;

const expectedDonationTableHtml = [
  '<table class="pdf-data-table" data-asym-data-table="true" data-data-table-path="content.0" data-table-binding-id="donation-table" data-table-repeat-header="true" data-table-source-path="donations">',
  '<thead class="pdf-data-table-header"><tr>',
  '<th class="pdf-data-table-heading" data-table-column-key="date" scope="col" style="text-align:left">Date</th>',
  '<th class="pdf-data-table-heading" data-table-column-key="designation" scope="col" style="text-align:left">Designation</th>',
  '<th class="pdf-data-table-heading" data-table-column-key="amount" scope="col" style="text-align:right">Amount</th>',
  '</tr></thead>',
  '<tbody class="pdf-data-table-body">',
  '<tr class="pdf-data-table-row" data-table-rendered-index="0" data-table-source-index="0">',
  '<td class="pdf-data-table-cell" data-table-column-key="date" style="text-align:left">Jan 15, 2026</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="designation" style="text-align:left">Missions</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="amount" style="text-align:right">$50.00</td>',
  '</tr>',
  '<tr class="pdf-data-table-row" data-table-rendered-index="1" data-table-source-index="1">',
  '<td class="pdf-data-table-cell" data-table-column-key="date" style="text-align:left">Jan 2, 2026</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="designation" style="text-align:left">General</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="amount" style="text-align:right">$125.00</td>',
  '</tr>',
  '</tbody>',
  '<tfoot class="pdf-data-table-footer">',
  '<tr class="pdf-data-table-total-placeholder" data-table-total-column-key="amount" data-table-total-operation="sum" data-table-total-placeholder="true">',
  '<td colspan="3">Total gifts</td>',
  '</tr>',
  '</tfoot>',
  '</table>',
].join('');

const expectedInvoiceTableHtml = [
  '<table class="pdf-data-table" data-asym-data-table="true" data-data-table-path="content.0" data-table-binding-id="invoice-lines" data-table-repeat-header="true" data-table-source-path="invoice.lineItems">',
  '<thead class="pdf-data-table-header"><tr>',
  '<th class="pdf-data-table-heading" data-table-column-key="description" scope="col" style="text-align:left">Description</th>',
  '<th class="pdf-data-table-heading" data-table-column-key="total" scope="col" style="text-align:right">Total</th>',
  '</tr></thead>',
  '<tbody class="pdf-data-table-body">',
  '<tr class="pdf-data-table-row" data-table-rendered-index="0" data-table-source-index="0">',
  '<td class="pdf-data-table-cell" data-table-column-key="description" style="text-align:left">Design</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="total" style="text-align:right">$700.00</td>',
  '</tr>',
  '<tr class="pdf-data-table-row" data-table-rendered-index="1" data-table-source-index="1">',
  '<td class="pdf-data-table-cell" data-table-column-key="description" style="text-align:left">Print</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="total" style="text-align:right">$300.00</td>',
  '</tr>',
  '</tbody>',
  '</table>',
].join('');

const expectedFinancialReportTableHtml = [
  '<table class="pdf-data-table" data-asym-data-table="true" data-data-table-path="content.0" data-table-binding-id="financial-report" data-table-repeat-header="true" data-table-source-path="financialRows">',
  '<thead class="pdf-data-table-header"><tr>',
  '<th class="pdf-data-table-heading" data-table-column-key="fund" scope="col" style="text-align:left;width:25%">Fund</th>',
  '<th class="pdf-data-table-heading" data-table-column-key="account" scope="col" style="text-align:left;width:45%">Account</th>',
  '<th class="pdf-data-table-heading" data-table-column-key="amount" scope="col" style="text-align:right;width:30%">Amount</th>',
  '</tr></thead>',
  '<tbody class="pdf-data-table-body">',
  '<tr class="pdf-data-table-row" data-table-rendered-index="0" data-table-source-index="0">',
  '<td class="pdf-data-table-cell" data-table-column-key="fund" style="text-align:left;width:25%">General</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="account" style="text-align:left;width:45%">Income</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="amount" style="text-align:right;width:30%">$1,200.00</td>',
  '</tr>',
  '<tr class="pdf-data-table-row" data-table-rendered-index="1" data-table-source-index="1">',
  '<td class="pdf-data-table-cell" data-table-column-key="fund" style="text-align:left;width:25%">Outreach</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="account" style="text-align:left;width:45%">Expense</td>',
  '<td class="pdf-data-table-cell" data-table-column-key="amount" style="text-align:right;width:30%">-$350.00</td>',
  '</tr>',
  '</tbody>',
  '</table>',
].join('');

function doc(content: readonly DocumentContentNode[]): DocumentContentNode {
  return {
    content,
    type: 'doc',
  };
}

function dataTable(attrs: Record<string, unknown>): DocumentContentNode {
  return {
    attrs,
    type: 'dataTable',
  };
}

function renderInlineTable(binding: TableBindingInput) {
  return composePdfDocumentHtml({
    dataContext,
    document: doc([
      dataTable({
        binding,
      }),
    ]),
  });
}

describe('Phase 20 renderer data tables', () => {
  it('renders a deterministic donation table with repeated header markup and total placeholders', () => {
    const firstResult = renderInlineTable(donationTableBinding);
    const secondResult = renderInlineTable(donationTableBinding);
    const tableCss = firstResult.cssRequirements[0]?.css;

    expect(firstResult.warnings).toEqual([]);
    expect(firstResult.html).toBe(expectedDonationTableHtml);
    expect(secondResult.html).toBe(expectedDonationTableHtml);
    expect(tableCss).toContain(
      '.pdf-data-table-header{display:table-header-group;}',
    );
    expect(tableCss).toContain(
      '.pdf-data-table-footer{display:table-footer-group;}',
    );
    expect(firstResult.html).not.toContain('$175.00');
  });

  it('renders invoice line items through an external table binding id', () => {
    const result = composePdfDocumentHtml({
      dataContext,
      document: doc([
        dataTable({
          bindingId: 'invoice-lines',
        }),
      ]),
      tableBindings: [invoiceTableBinding],
    });

    expect(result.warnings).toEqual([]);
    expect(result.html).toBe(expectedInvoiceTableHtml);
  });

  it('renders a deterministic financial report table without grouped subtotal computation', () => {
    const result = renderInlineTable(financialReportTableBinding);

    expect(result.warnings).toEqual([]);
    expect(result.html).toBe(expectedFinancialReportTableHtml);
    expect(result.html).not.toContain('subtotal');
    expect(result.html).not.toContain('grand total');
  });

  it('renders empty states and max-row diagnostics deterministically', () => {
    const limited = composePdfDocumentHtml({
      dataContext,
      document: doc([
        dataTable({
          binding: {
            id: 'limited-financial-table',
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
        }),
      ]),
    });
    const empty = composePdfDocumentHtml({
      dataContext: {
        donations: [],
      },
      document: doc([
        dataTable({
          binding: donationTableBinding,
        }),
      ]),
    });

    expect(limited.html).toContain('Income');
    expect(limited.html).not.toContain('Expense');
    expect(limited.warnings).toEqual([
      expect.objectContaining({
        code: 'table_max_rows_exceeded',
        details: expect.objectContaining({
          bindingId: 'limited-financial-table',
          maxRows: 1,
          sourcePath: 'financialRows',
          totalRows: 2,
        }),
        severity: 'warning',
      }),
    ]);
    expect(empty.html).toContain('No donations in this period.');
    expect(empty.html).toContain('data-table-empty-state="true"');
  });

  it('reports missing or invalid table bindings without throwing', () => {
    const missing = composePdfDocumentHtml({
      dataContext,
      document: doc([dataTable({})]),
    });
    const invalid = composePdfDocumentHtml({
      dataContext,
      document: doc([
        dataTable({
          bindingId: 'invalid-table',
        }),
      ]),
      tableBindings: [
        {
          id: 'invalid-table',
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
      ],
    });

    expect(missing.warnings).toEqual([
      expect.objectContaining({
        code: 'missing_table_binding',
        message:
          'Phase 20 data table renderer emitted a diagnostic placeholder because the binding is missing or invalid.',
        severity: 'error',
      }),
    ]);
    expect(invalid.warnings).toEqual([
      expect.objectContaining({
        code: 'invalid_table_binding',
        details: expect.objectContaining({
          bindingId: 'invalid-table',
          sourcePath: 'financialRows',
        }),
        message:
          'Phase 20 data table renderer emitted a diagnostic placeholder because the referenced binding is invalid.',
        severity: 'error',
      }),
    ]);
    expect(invalid.html).toContain('data-asym-data-table="true"');
  });

  it('renders empty states with missing and non-array source diagnostics', () => {
    const missing = composePdfDocumentHtml({
      dataContext: {},
      document: doc([
        dataTable({
          binding: {
            ...oneColumnTableBinding,
            id: 'missing-source',
          },
        }),
      ]),
    });
    const nonArray = composePdfDocumentHtml({
      dataContext: {
        donations: { amount: 1 },
      },
      document: doc([
        dataTable({
          binding: {
            ...oneColumnTableBinding,
            id: 'non-array-source',
          },
        }),
      ]),
    });

    expect(missing.html).toContain(
      '<tr class="pdf-data-table-empty" data-table-empty-state="true"><td colspan="1">No rows.</td></tr>',
    );
    expect(missing.warnings).toEqual([
      expect.objectContaining({
        code: 'missing_table_source',
        details: expect.objectContaining({
          bindingId: 'missing-source',
          sourcePath: 'donations',
        }),
        severity: 'warning',
      }),
    ]);
    expect(nonArray.html).toContain('data-table-empty-state="true"');
    expect(nonArray.warnings).toEqual([
      expect.objectContaining({
        code: 'non_array_table_source',
        details: expect.objectContaining({
          actualType: 'object',
          bindingId: 'non-array-source',
          sourcePath: 'donations',
        }),
        severity: 'warning',
      }),
    ]);
  });

  it('emits unsupported formatter diagnostics without unsafe cell output', () => {
    const result = composePdfDocumentHtml({
      dataContext: {
        donations: [{ amount: 50 }],
      },
      document: doc([
        dataTable({
          binding: {
            ...oneColumnTableBinding,
            id: 'unsupported-formatter',
            columns: [
              {
                formatter: 'currency.not-supported',
                key: 'amount',
                label: 'Amount',
                sourcePath: 'amount',
                type: 'currency',
              },
            ],
          },
        }),
      ]),
    });

    expect(result.html).toContain(
      '<td class="pdf-data-table-cell" data-table-column-key="amount" style="text-align:left"></td>',
    );
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'unsupported_table_column_value',
        details: expect.objectContaining({
          bindingId: 'unsupported-formatter',
          columnKey: 'amount',
          formatterDiagnostics: [
            {
              code: 'unknown_formatter',
              severity: 'error',
            },
          ],
          sourceIndex: 0,
          sourcePath: 'donations',
        }),
        severity: 'warning',
      }),
    ]);
  });

  it('keeps the browser-safe renderer path free of DocRaptor and calculation imports', () => {
    const rendererSourceFiles = [
      new URL('../src/compose-pdf-document-html.ts', import.meta.url),
      new URL('../src/data-table.ts', import.meta.url),
      new URL('../src/index.ts', import.meta.url),
    ];
    const source = rendererSourceFiles
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(source).not.toMatch(/@asym\/docraptor-client/);
    expect(source).not.toMatch(/docraptor/i);
    expect(source).not.toMatch(/calculate|aggregate|subtotal/i);
  });
});
