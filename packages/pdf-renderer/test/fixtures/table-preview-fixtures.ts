import type {
  TableBindingInput,
  VariableDataContext,
} from '@asym/pdf-template-schema';

export interface TablePreviewFixture {
  readonly id: string;
  readonly title: string;
  readonly tableBindingId: string;
  readonly template: Readonly<Record<string, unknown>>;
  readonly dataContext: VariableDataContext;
  readonly expectedRowCount: number;
  readonly expectedCellText: readonly string[];
  readonly expectedPlaceholderText: readonly string[];
  readonly unexpectedCalculatedText: readonly string[];
}

const annualGivingTableBinding = {
  id: 'phase-21-annual-giving-table',
  sourcePath: 'donations',
  emptyState: 'No gifts were recorded for this statement period.',
  repeatHeader: true,
  totals: [
    {
      columnKey: 'amount',
      label: 'Total gifts placeholder',
      operation: 'sum',
    },
  ],
  columns: [
    {
      formatter: 'date.medium',
      key: 'date',
      label: 'Gift date',
      sourcePath: 'date',
      type: 'date',
      width: '1.15in',
    },
    {
      key: 'receipt',
      label: 'Receipt',
      sourcePath: 'receiptNumber',
      type: 'id',
      width: '1in',
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
      width: '1in',
    },
  ],
} satisfies TableBindingInput;

const invoiceTableBinding = {
  id: 'phase-21-invoice-lines-table',
  sourcePath: 'invoice.lineItems',
  emptyState: 'No invoice line items.',
  repeatHeader: true,
  totals: [
    {
      columnKey: 'amount',
      label: 'Amount due placeholder',
      operation: 'sum',
    },
  ],
  columns: [
    {
      key: 'description',
      label: 'Description',
      sourcePath: 'description',
      type: 'string',
      width: '45%',
    },
    {
      align: 'right',
      key: 'quantity',
      label: 'Qty',
      sourcePath: 'quantity',
      type: 'number',
      width: '12%',
    },
    {
      align: 'right',
      formatter: 'currency.usd',
      key: 'rate',
      label: 'Rate',
      sourcePath: 'rate',
      type: 'currency',
      width: '18%',
    },
    {
      align: 'right',
      formatter: 'currency.usd',
      key: 'amount',
      label: 'Amount',
      sourcePath: 'amount',
      type: 'currency',
      width: '25%',
    },
  ],
} satisfies TableBindingInput;

const financialReportTableBinding = {
  id: 'phase-21-financial-report-table',
  sourcePath: 'report.rows',
  emptyState: 'No financial rows for this report period.',
  grouping: {
    fieldPath: 'fund',
    label: 'Fund',
  },
  repeatHeader: true,
  totals: [
    {
      columnKey: 'amount',
      label: 'Net change placeholder',
      operation: 'sum',
    },
  ],
  columns: [
    {
      key: 'fund',
      label: 'Fund',
      sourcePath: 'fund',
      type: 'string',
      width: '24%',
    },
    {
      key: 'account',
      label: 'Account',
      sourcePath: 'account',
      type: 'string',
      width: '36%',
    },
    {
      key: 'category',
      label: 'Category',
      sourcePath: 'category',
      type: 'string',
      width: '20%',
    },
    {
      align: 'right',
      formatter: 'currency.usd',
      key: 'amount',
      label: 'Amount',
      sourcePath: 'amount',
      type: 'currency',
      width: '20%',
    },
  ],
} satisfies TableBindingInput;

export const annualGivingStatementTablePreviewFixture: TablePreviewFixture = {
  id: 'annual-giving-statement',
  title: 'Annual Giving Statement Table Preview',
  tableBindingId: annualGivingTableBinding.id,
  template: {
    version: 1,
    id: 'phase-21-annual-giving-statement',
    name: 'Phase 21 Annual Giving Statement',
    category: 'annual_giving_statement',
    pageSettings: {
      pageSize: 'letter',
      orientation: 'portrait',
    },
    theme: {},
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Annual Giving Statement' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Deterministic Phase 21 statement table fixture.',
            },
          ],
        },
        {
          type: 'dataTable',
          attrs: { bindingId: annualGivingTableBinding.id },
        },
      ],
    },
    variables: [],
    tableBindings: [annualGivingTableBinding],
    metadata: {
      description: 'Phase 21 annual giving statement table preview fixture.',
      tags: ['phase-21', 'table-preview', 'statement'],
    },
  },
  dataContext: {
    donations: [
      {
        amount: 125,
        date: '2026-01-02',
        designation: 'General Fund',
        receiptNumber: 'R-1001',
      },
      {
        amount: 50,
        date: '2026-02-14',
        designation: 'Missions Fund',
        receiptNumber: 'R-1002',
      },
      {
        amount: 75,
        date: '2026-03-30',
        designation: 'Building Fund',
        receiptNumber: 'R-1003',
      },
    ],
  },
  expectedCellText: [
    'Jan 2, 2026',
    'General Fund',
    '$125.00',
    'Missions Fund',
    '$50.00',
    'Building Fund',
    '$75.00',
  ],
  expectedPlaceholderText: ['Total gifts placeholder'],
  expectedRowCount: 3,
  unexpectedCalculatedText: ['$250.00'],
};

export const invoiceTablePreviewFixture: TablePreviewFixture = {
  id: 'invoice',
  title: 'Invoice Table Preview',
  tableBindingId: invoiceTableBinding.id,
  template: {
    version: 1,
    id: 'phase-21-invoice',
    name: 'Phase 21 Invoice',
    category: 'invoice',
    pageSettings: {
      pageSize: 'letter',
      orientation: 'portrait',
    },
    theme: {},
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Invoice' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Deterministic Phase 21 invoice table.' },
          ],
        },
        {
          type: 'dataTable',
          attrs: { bindingId: invoiceTableBinding.id },
        },
      ],
    },
    variables: [],
    tableBindings: [invoiceTableBinding],
    metadata: {
      description: 'Phase 21 invoice line item table preview fixture.',
      tags: ['phase-21', 'table-preview', 'invoice'],
    },
  },
  dataContext: {
    invoice: {
      lineItems: [
        {
          amount: 200,
          description: 'Program design',
          quantity: 2,
          rate: 100,
        },
        {
          amount: 150,
          description: 'Printed packets',
          quantity: 3,
          rate: 50,
        },
      ],
    },
  },
  expectedCellText: [
    'Program design',
    '2',
    '$100.00',
    '$200.00',
    'Printed packets',
    '3',
    '$50.00',
    '$150.00',
  ],
  expectedPlaceholderText: ['Amount due placeholder'],
  expectedRowCount: 2,
  unexpectedCalculatedText: ['$350.00'],
};

export const financialReportTablePreviewFixture: TablePreviewFixture = {
  id: 'financial-report',
  title: 'Financial Report Table Preview',
  tableBindingId: financialReportTableBinding.id,
  template: {
    version: 1,
    id: 'phase-21-financial-report',
    name: 'Phase 21 Financial Report',
    category: 'financial_report',
    pageSettings: {
      pageSize: 'legal',
      orientation: 'landscape',
      margins: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    },
    theme: {},
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Financial Report' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Deterministic Phase 21 financial report table.',
            },
          ],
        },
        {
          type: 'dataTable',
          attrs: { bindingId: financialReportTableBinding.id },
        },
      ],
    },
    variables: [],
    tableBindings: [financialReportTableBinding],
    metadata: {
      description: 'Phase 21 financial report table preview fixture.',
      tags: ['phase-21', 'table-preview', 'financial-report'],
    },
  },
  dataContext: {
    report: {
      rows: [
        {
          account: 'Contributions',
          amount: 1200,
          category: 'Income',
          fund: 'Operating',
        },
        {
          account: 'Outreach supplies',
          amount: -350,
          category: 'Expense',
          fund: 'Outreach',
        },
        {
          account: 'Conference fees',
          amount: 275,
          category: 'Income',
          fund: 'Training',
        },
      ],
    },
  },
  expectedCellText: [
    'Operating',
    'Contributions',
    '$1,200.00',
    'Outreach supplies',
    '-$350.00',
    'Conference fees',
    '$275.00',
  ],
  expectedPlaceholderText: ['Net change placeholder'],
  expectedRowCount: 3,
  unexpectedCalculatedText: ['$1,125.00'],
};

export const tablePreviewFixtures = [
  annualGivingStatementTablePreviewFixture,
  invoiceTablePreviewFixture,
  financialReportTablePreviewFixture,
] as const;
