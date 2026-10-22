import type { DocumentAssetReferenceInput } from './assets';
import type {
  DataBinding,
  RepeaterBindingInput,
  TableBindingInput,
} from './bindings';
import type { TemplateCategory } from './categories';
import type { DocumentPlaceholderInput } from './placeholders';
import type {
  DocumentContent,
  DocumentContentNode,
  DocumentPageSettingsInput,
  DocumentTemplateV1,
  DocumentTemplateV1Input,
} from './template';
import { DocumentTemplateV1Schema } from './template';
import type { DocumentThemeInput } from './themes';
import type { VariableDataContext } from './variable-resolution';
import {
  coreVariableRegistry,
  type RegistryVariableDefinition,
  type VariableDefinition,
} from './variables';

export type StarterPdfTemplateCategory = Exclude<TemplateCategory, 'custom'>;

export interface StarterPdfTemplateFixture {
  readonly id: string;
  readonly title: string;
  readonly category: StarterPdfTemplateCategory;
  readonly template: DocumentTemplateV1;
  readonly sampleData: VariableDataContext;
  readonly expectedWarnings: readonly string[];
  readonly expectedHtmlSnippets: readonly string[];
  readonly expectedPrintCssSnippets: readonly string[];
}

const createdAt = '2026-05-15T00:00:00.000Z';
const tenantId = 'tenant-starter';

export const starterPdfTemplateCategories = [
  'donation_receipt',
  'tax_receipt',
  'annual_giving_statement',
  'donor_letter',
  'missionary_report',
  'financial_report',
  'invoice',
  'certificate',
] as const satisfies readonly StarterPdfTemplateCategory[];

const starterLogoAsset = {
  id: 'starter-asset-logo',
  role: 'logo',
  assetId: 'starter-logo',
  renderSafeUrl: 'https://assets.example.test/asym/starter-logo.png',
  mimeType: 'image/png',
  altText: 'Asymmetric Giving logo',
  width: 180,
  height: 54,
  alignment: 'left',
  renderSafe: true,
  tenantId,
  source: {
    provider: 'fixture-adapter',
    sourceId: 'logo-v1',
    version: '2026-05-15',
  },
} as const satisfies DocumentAssetReferenceInput;

const starterSignatureAsset = {
  id: 'starter-asset-signature',
  role: 'signature',
  assetId: 'starter-signature',
  renderSafeUrl: 'https://assets.example.test/asym/starter-signature.png',
  mimeType: 'image/png',
  altText: 'Authorized signature',
  width: 220,
  height: 72,
  alignment: 'left',
  renderSafe: true,
  tenantId,
  source: {
    provider: 'fixture-adapter',
    sourceId: 'signature-v1',
    version: '2026-05-15',
  },
} as const satisfies DocumentAssetReferenceInput;

const starterFieldPhotoAsset = {
  id: 'starter-asset-field-photo',
  role: 'image',
  assetId: 'starter-field-photo',
  renderSafeUrl: 'https://assets.example.test/asym/starter-field-photo.png',
  mimeType: 'image/png',
  altText: 'Field team serving the community',
  width: 320,
  height: 180,
  alignment: 'right',
  renderSafe: true,
  tenantId,
  source: {
    provider: 'fixture-adapter',
    sourceId: 'field-photo-v1',
    version: '2026-05-15',
  },
} as const satisfies DocumentAssetReferenceInput;

const baseTheme = {
  name: 'Starter Nonprofit Brand',
  branding: {
    source: 'template_override',
    tenantBrandId: 'starter-brand',
    overriddenFields: [
      'organization_name',
      'logo_asset',
      'primary_color',
      'accent_color',
      'footer_text',
    ],
  },
  organization: {
    name: 'Asymmetric Giving',
    legalName: 'Asymmetric Giving Foundation',
    websiteUrl: 'https://example.org',
  },
  colors: {
    primary: '#1f2937',
    accent: '#0f766e',
    text: '#111827',
    background: '#ffffff',
  },
  fonts: {
    body: 'Arial',
    heading: 'Georgia',
    fallback: ['Arial', 'sans-serif'],
  },
  logoAsset: starterLogoAsset,
  logoAssetId: starterLogoAsset.assetId,
  footerText: 'Asymmetric Giving Foundation | example.org',
  receiptDefaults: {
    thankYouMessage: 'Thank you for partnering with our mission.',
    taxLanguage:
      'Please retain this receipt with your records for tax reporting.',
    goodsServicesStatement:
      'No goods or services were provided in exchange for this contribution.',
  },
} as const satisfies DocumentThemeInput;

const reportTheme = {
  ...baseTheme,
  name: 'Starter Finance Brand',
  colors: {
    primary: '#263238',
    accent: '#2f6f73',
    text: '#111827',
    background: '#ffffff',
  },
} as const satisfies DocumentThemeInput;

const certificateTheme = {
  ...baseTheme,
  name: 'Starter Certificate Brand',
  colors: {
    primary: '#16324f',
    accent: '#9a6a2f',
    text: '#111827',
    background: '#ffffff',
  },
} as const satisfies DocumentThemeInput;

const basePageSettings = {
  pageSize: 'letter',
  orientation: 'portrait',
  margins: {
    top: '0.75in',
    right: '0.65in',
    bottom: '0.75in',
    left: '0.65in',
  },
  headerFooter: {
    regions: [
      {
        id: 'starter-footer',
        placement: 'footer',
        scope: 'repeating',
        alignment: 'center',
        minimumMargin: '0.5in',
        content: [
          { kind: 'organization_footer' },
          { kind: 'text', text: ' | Page ' },
          { kind: 'page_number' },
          { kind: 'text', text: ' of ' },
          { kind: 'total_pages' },
        ],
      },
    ],
  },
} as const satisfies DocumentPageSettingsInput;

const legalLandscapePageSettings = {
  pageSize: 'legal',
  orientation: 'landscape',
  margins: {
    top: '0.75in',
    right: '0.5in',
    bottom: '0.75in',
    left: '0.5in',
  },
  headerFooter: basePageSettings.headerFooter,
} as const satisfies DocumentPageSettingsInput;

const certificatePageSettings = {
  pageSize: 'letter',
  orientation: 'landscape',
  margins: {
    top: '0.65in',
    right: '0.75in',
    bottom: '0.65in',
    left: '0.75in',
  },
  headerFooter: {
    regions: [
      {
        id: 'certificate-first-page-footer',
        placement: 'footer',
        scope: 'first_page',
        alignment: 'center',
        minimumMargin: '0.5in',
        content: [{ kind: 'organization_footer' }],
      },
    ],
  },
} as const satisfies DocumentPageSettingsInput;

const baseSampleData = {
  organization: {
    name: 'Asymmetric Giving',
    legalName: 'Asymmetric Giving Foundation',
    ein: '12-3456789',
    address: {
      line1: '100 Mission Way',
      city: 'Franklin',
      region: 'TN',
      postalCode: '37064',
      country: 'US',
    },
    website: 'https://example.org',
  },
  recipient: {
    id: 'recipient-1001',
    fullName: 'Jordan Lee',
    email: 'jordan.lee@example.test',
    address: {
      line1: '42 Donor Lane',
      city: 'Austin',
      region: 'TX',
      postalCode: '78701',
      country: 'US',
    },
  },
  donation: {
    id: 'gift-2001',
    date: '2026-04-15',
    amount: 250,
    method: 'Credit card',
    designation: 'General Fund',
    goodsServicesValue: 0,
    receiptNumber: 'REC-2026-0001',
  },
  taxReceipt: {
    taxYear: 2026,
    deductibleAmount: 250,
    goodsServicesStatement:
      'No goods or services were provided in exchange for this contribution.',
    issuedDate: '2026-04-28',
  },
  document: {
    title: 'Starter Document',
    date: '2026-04-28',
    number: 'DOC-2026-0001',
    footerText: 'Asymmetric Giving Foundation | example.org',
    certificateTitle: 'Certificate of Appreciation',
    donorLetterBody:
      'Your generosity helps sustain this work across the communities we serve.',
  },
  asset: {
    logoUrl: starterLogoAsset.renderSafeUrl,
    logoAltText: starterLogoAsset.altText,
    signatureUrl: starterSignatureAsset.renderSafeUrl,
    portalUrl: 'https://example.org/donor-portal',
  },
  computed: {
    currentPage: 1,
    totalPages: 3,
    generatedAt: '2026-04-28T00:00:00.000Z',
    isTaxDeductible: true,
  },
} as const satisfies VariableDataContext;

const donationRows = [
  {
    amount: 250,
    date: '2026-04-15',
    designation: 'General Fund',
    method: 'Credit card',
    receiptNumber: 'REC-2026-0001',
  },
] as const;

const taxReceiptRows = [
  {
    amount: 400,
    date: '2026-01-12',
    deductibleAmount: 400,
    designation: 'General Fund',
    receiptNumber: 'TAX-2026-0001',
  },
  {
    amount: 100,
    date: '2026-02-20',
    deductibleAmount: 100,
    designation: 'Mission Fund',
    receiptNumber: 'TAX-2026-0002',
  },
] as const;

const annualGivingRows = [
  {
    amount: 300,
    date: '2026-01-15',
    designation: 'General Fund',
    fund: 'Operating',
    receiptNumber: 'STMT-2026-0001',
  },
  {
    amount: 175,
    date: '2026-03-22',
    designation: 'Mission Support',
    fund: 'Missions',
    receiptNumber: 'STMT-2026-0002',
  },
  {
    amount: 250,
    date: '2026-05-07',
    designation: 'General Fund',
    fund: 'Operating',
    receiptNumber: 'STMT-2026-0003',
  },
] as const;

const missionarySupportRows = [
  {
    amount: 1500,
    donorCount: 18,
    fund: 'Monthly support',
    receivedThrough: '2026-04-30',
  },
  {
    amount: 750,
    donorCount: 9,
    fund: 'Travel fund',
    receivedThrough: '2026-04-30',
  },
  {
    amount: 250,
    donorCount: 4,
    fund: 'Emergency relief',
    receivedThrough: '2026-04-30',
  },
] as const;

const financialReportRows = [
  {
    account: 'Contributions',
    amount: 6000,
    category: 'Income',
    fund: 'Operating',
  },
  {
    account: 'Mission support',
    amount: 2500,
    category: 'Income',
    fund: 'Missions',
  },
  {
    account: 'Community meals',
    amount: -1200,
    category: 'Expense',
    fund: 'Outreach',
  },
  {
    account: 'Facilities',
    amount: -2000,
    category: 'Expense',
    fund: 'Operating',
  },
] as const;

const invoiceLineItems = [
  {
    amount: 1200,
    description: 'Program strategy workshop',
    quantity: 3,
    rate: 400,
  },
  {
    amount: 350,
    description: 'Printed participant packets',
    quantity: 1,
    rate: 350,
  },
] as const;

const donationReceiptTable = {
  id: 'starter-donation-receipt-table',
  sourcePath: 'donations',
  emptyState: 'No gifts are available for this receipt.',
  repeatHeader: true,
  totals: [
    {
      columnKey: 'amount',
      label: 'Receipt total',
      operation: 'sum',
    },
  ],
  columns: [
    {
      key: 'date',
      label: 'Gift date',
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
      width: '1in',
    },
  ],
} as const satisfies TableBindingInput;

const statementDonationTable = {
  id: 'starter-statement-donation-table',
  sourcePath: 'statement.donations',
  emptyState: 'No gifts were recorded for this statement period.',
  grouping: {
    fieldPath: 'fund',
    label: 'Fund',
  },
  repeatHeader: true,
  totals: [
    {
      columnKey: 'amount',
      label: 'Statement total',
      operation: 'sum',
    },
  ],
  columns: [
    {
      key: 'date',
      label: 'Gift date',
      sourcePath: 'date',
      type: 'date',
      formatter: 'date.medium',
      width: '1.1in',
    },
    {
      key: 'receipt',
      label: 'Receipt',
      sourcePath: 'receiptNumber',
      type: 'id',
      width: '1.1in',
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
      width: '1in',
    },
  ],
} as const satisfies TableBindingInput;

const missionarySupportTable = {
  id: 'starter-missionary-support-table',
  sourcePath: 'missionary.supportRows',
  emptyState: 'No support rows are available for this report.',
  repeatHeader: true,
  totals: [
    {
      columnKey: 'amount',
      label: 'Support received',
      operation: 'sum',
    },
  ],
  columns: [
    {
      key: 'fund',
      label: 'Fund',
      sourcePath: 'fund',
      type: 'string',
      width: '35%',
    },
    {
      key: 'donorCount',
      label: 'Donors',
      sourcePath: 'donorCount',
      type: 'number',
      formatter: 'number.integer',
      align: 'right',
      width: '20%',
    },
    {
      key: 'receivedThrough',
      label: 'Received through',
      sourcePath: 'receivedThrough',
      type: 'date',
      formatter: 'date.medium',
      width: '25%',
    },
    {
      key: 'amount',
      label: 'Amount',
      sourcePath: 'amount',
      type: 'currency',
      formatter: 'currency.usd',
      align: 'right',
      width: '20%',
    },
  ],
} as const satisfies TableBindingInput;

const financialReportTable = {
  id: 'starter-financial-report-table',
  sourcePath: 'financialReport.rows',
  emptyState: 'No financial rows are available for this report period.',
  grouping: {
    fieldPath: 'fund',
    label: 'Fund',
  },
  repeatHeader: true,
  totals: [
    {
      columnKey: 'amount',
      label: 'Net change',
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
      key: 'amount',
      label: 'Amount',
      sourcePath: 'amount',
      type: 'currency',
      formatter: 'currency.usd',
      align: 'right',
      width: '20%',
    },
  ],
} as const satisfies TableBindingInput;

const invoiceLineItemTable = {
  id: 'starter-invoice-line-item-table',
  sourcePath: 'invoice.lineItems',
  emptyState: 'No invoice line items.',
  repeatHeader: true,
  totals: [
    {
      columnKey: 'amount',
      label: 'Line item total',
      operation: 'sum',
    },
  ],
  columns: [
    {
      key: 'description',
      label: 'Description',
      sourcePath: 'description',
      type: 'string',
      width: '44%',
    },
    {
      key: 'quantity',
      label: 'Qty',
      sourcePath: 'quantity',
      type: 'number',
      formatter: 'number.integer',
      align: 'right',
      width: '12%',
    },
    {
      key: 'rate',
      label: 'Rate',
      sourcePath: 'rate',
      type: 'currency',
      formatter: 'currency.usd',
      align: 'right',
      width: '20%',
    },
    {
      key: 'amount',
      label: 'Amount',
      sourcePath: 'amount',
      type: 'currency',
      formatter: 'currency.usd',
      align: 'right',
      width: '24%',
    },
  ],
} as const satisfies TableBindingInput;

const taxReceiptPlaceholder = {
  id: 'starter-tax-receipt-confirmation',
  kind: 'checkbox',
  label: 'Tax language reviewed',
  required: true,
  checkedByDefault: false,
} as const satisfies DocumentPlaceholderInput;

const donorLetterSignaturePlaceholder = {
  id: 'starter-donor-letter-signature',
  kind: 'signature',
  label: 'Donor care signature',
  signerRole: 'staff',
  width: 240,
  height: 72,
} as const satisfies DocumentPlaceholderInput;

const certificateQrPlaceholder = {
  id: 'starter-certificate-qr',
  kind: 'qr',
  label: 'Verify certificate',
  payload: {
    type: 'url',
    value: 'https://example.org/verify/certificate/starter',
  },
  size: 144,
  errorCorrectionLevel: 'medium',
} as const satisfies DocumentPlaceholderInput;

const invoiceApprovalDatePlaceholder = {
  id: 'starter-invoice-approval-date',
  kind: 'date',
  label: 'Approval date',
  dateFormat: 'MM/DD/YYYY',
} as const satisfies DocumentPlaceholderInput;

const missionaryUpdateRepeater = {
  id: 'starter-missionary-updates',
  sourcePath: 'missionary.updates',
  itemAlias: 'update',
  indexAlias: 'updateIndex',
  emptyState: 'No field updates are available.',
  maxItems: 5,
} as const satisfies RepeaterBindingInput;

const donationReceiptVariables = [
  'organization.name',
  'organization.legal_name',
  'organization.ein',
  'organization.address',
  'recipient.full_name',
  'recipient.address',
  'donation.date',
  'donation.amount',
  'donation.method',
  'donation.designation',
  'donation.receipt_number',
  'tax_receipt.goods_services_statement',
  'tax_receipt.issued_date',
  'document.title',
  'document.footer_text',
  'asset.logo_url',
] as const;

const taxReceiptVariables = [
  'organization.name',
  'organization.legal_name',
  'organization.ein',
  'organization.address',
  'recipient.full_name',
  'recipient.address',
  'tax_receipt.tax_year',
  'tax_receipt.deductible_amount',
  'tax_receipt.goods_services_statement',
  'tax_receipt.issued_date',
  'document.title',
  'document.number',
] as const;

const annualGivingVariables = [
  'organization.name',
  'recipient.full_name',
  'recipient.address',
  'statement.period',
  'statement.start_date',
  'statement.end_date',
  'statement.total_contributions',
  'statement.donation_count',
  'tax_receipt.tax_year',
  'document.title',
  'document.footer_text',
] as const;

const donorLetterVariables = [
  'organization.name',
  'recipient.full_name',
  'recipient.email',
  'document.date',
  'document.donor_letter_body',
  'asset.signature_url',
  'asset.portal_url',
] as const;

const missionaryReportVariables = [
  'organization.name',
  'missionary.id',
  'missionary.full_name',
  'missionary.location',
  'missionary.support_goal',
  'missionary.prayer_update',
  'document.title',
  'document.footer_text',
] as const;

const financialReportVariables = [
  'organization.name',
  'financial_report.period',
  'financial_report.fund_name',
  'financial_report.income_total',
  'financial_report.expense_total',
  'financial_report.net_balance',
  'financial_report.row_count',
  'financial_report.variance_percentage',
  'document.title',
  'computed.generated_at',
] as const;

const invoiceVariables = [
  'organization.name',
  'organization.address',
  'recipient.full_name',
  'recipient.email',
  'recipient.address',
  'invoice.number',
  'invoice.due_date',
  'invoice.subtotal',
  'invoice.tax_rate',
  'invoice.total',
  'invoice.paid',
  'document.footer_text',
] as const;

const certificateVariables = [
  'organization.name',
  'recipient.full_name',
  'document.certificate_title',
  'document.date',
  'asset.signature_url',
  'asset.portal_url',
] as const;

const donationReceiptFixture = createStarterFixture({
  id: 'starter-donation-receipt',
  title: 'Donation Receipt Starter',
  category: 'donation_receipt',
  template: {
    version: 1,
    id: 'starter-donation-receipt-template',
    name: 'Starter Donation Receipt',
    category: 'donation_receipt',
    pageSettings: basePageSettings,
    theme: baseTheme,
    content: doc([
      assetImage(starterLogoAsset.assetId),
      heading(1, 'Donation Receipt'),
      paragraph(
        text('Receipt '),
        variable('donation.receipt_number'),
        text(' issued on '),
        variable('tax_receipt.issued_date'),
      ),
      paragraph(
        text('Thank you, '),
        variable('recipient.full_name'),
        text(', for your gift to '),
        variable('organization.name'),
        text('.'),
      ),
      summaryBlock('starter-donation-total-summary'),
      dataTable(donationReceiptTable.id),
      paragraph(variable('tax_receipt.goods_services_statement')),
    ]),
    variables: variablesFor(donationReceiptVariables),
    dataBindings: dataBindingsFor(donationReceiptVariables),
    tableBindings: [donationReceiptTable],
    summaryBlockBindings: [
      {
        id: 'starter-donation-total-summary',
        title: 'Gift Summary',
        calculation: {
          type: 'total_contributions',
          sourcePath: 'donations',
          amountPath: 'amount',
          label: 'Total contribution',
        },
      },
    ],
    assets: [starterLogoAsset],
    metadata: metadata(
      'Starter single-gift donation receipt with branded logo, receipt fields, table total, and tax language.',
      ['donation-receipt', 'receipt'],
    ),
  },
  sampleData: {
    ...baseSampleData,
    document: {
      ...baseSampleData.document,
      title: 'Donation Receipt',
    },
    donations: donationRows,
  },
  expectedHtmlSnippets: [
    'Donation Receipt',
    'data-asym-summary-block="true"',
    'data-table-binding-id="starter-donation-receipt-table"',
    '$250.00',
  ],
  expectedPrintCssSnippets: [
    '@page{size:8.5in 11in;',
    '--asym-brand-primary:#1f2937;',
  ],
});

const taxReceiptFixture = createStarterFixture({
  id: 'starter-tax-receipt',
  title: 'Tax Receipt Starter',
  category: 'tax_receipt',
  template: {
    version: 1,
    id: 'starter-tax-receipt-template',
    name: 'Starter Tax Receipt',
    category: 'tax_receipt',
    pageSettings: basePageSettings,
    theme: baseTheme,
    content: doc([
      assetImage(starterLogoAsset.assetId),
      heading(1, 'Tax Receipt'),
      paragraph(text('Tax year '), variable('tax_receipt.tax_year')),
      paragraph(
        text('Issued to '),
        variable('recipient.full_name'),
        text(' by '),
        variable('organization.legal_name'),
        text('.'),
      ),
      summaryBlock('starter-tax-deductible-summary'),
      dataTable('starter-tax-receipt-table'),
      placeholder(taxReceiptPlaceholder.id),
      paragraph(variable('tax_receipt.goods_services_statement')),
    ]),
    variables: variablesFor(taxReceiptVariables),
    dataBindings: dataBindingsFor(taxReceiptVariables),
    tableBindings: [
      {
        ...donationReceiptTable,
        id: 'starter-tax-receipt-table',
        sourcePath: 'taxReceipt.donations',
        totals: [
          {
            columnKey: 'amount',
            label: 'Deductible total',
            operation: 'sum',
          },
        ],
      },
    ],
    summaryBlockBindings: [
      {
        id: 'starter-tax-deductible-summary',
        title: 'Deductible Giving Summary',
        calculation: {
          type: 'total_contributions',
          sourcePath: 'taxReceipt.donations',
          amountPath: 'deductibleAmount',
          label: 'Tax deductible amount',
        },
      },
    ],
    placeholderBindings: [taxReceiptPlaceholder],
    assets: [starterLogoAsset],
    metadata: metadata(
      'Starter year-end tax receipt with deductible totals, confirmation placeholder, and structured receipt language.',
      ['tax-receipt', 'receipt'],
    ),
  },
  sampleData: {
    ...baseSampleData,
    document: {
      ...baseSampleData.document,
      title: 'Tax Receipt',
      number: 'TAX-2026-0001',
    },
    taxReceipt: {
      ...baseSampleData.taxReceipt,
      deductibleAmount: 500,
      donations: taxReceiptRows,
    },
  },
  expectedHtmlSnippets: [
    'Tax Receipt',
    'Tax deductible amount',
    'Tax language reviewed',
    '$500.00',
  ],
  expectedPrintCssSnippets: [
    '@page{size:8.5in 11in;',
    '--asym-brand-accent:#0f766e;',
  ],
});

const annualGivingStatementFixture = createStarterFixture({
  id: 'starter-annual-giving-statement',
  title: 'Annual Giving Statement Starter',
  category: 'annual_giving_statement',
  template: {
    version: 1,
    id: 'starter-annual-giving-statement-template',
    name: 'Starter Annual Giving Statement',
    category: 'annual_giving_statement',
    pageSettings: basePageSettings,
    theme: baseTheme,
    content: doc([
      assetImage(starterLogoAsset.assetId),
      heading(1, 'Annual Giving Statement'),
      paragraph(
        variable('statement.period'),
        text(' for '),
        variable('recipient.full_name'),
      ),
      summaryBlock('starter-statement-total-summary'),
      dataTable(statementDonationTable.id),
      paragraph(
        text('Statement includes '),
        variable('statement.donation_count'),
        text(' gifts for tax year '),
        variable('tax_receipt.tax_year'),
        text('.'),
      ),
    ]),
    variables: variablesFor(annualGivingVariables),
    dataBindings: dataBindingsFor(annualGivingVariables),
    tableBindings: [statementDonationTable],
    summaryBlockBindings: [
      {
        id: 'starter-statement-total-summary',
        title: 'Statement Summary',
        calculation: {
          type: 'total_contributions',
          sourcePath: 'statement.donations',
          amountPath: 'amount',
          label: 'Total contributions',
        },
      },
    ],
    assets: [starterLogoAsset],
    metadata: metadata(
      'Starter annual giving statement with donation history, grouped subtotals, grand total, footer, and page numbering.',
      ['annual-giving-statement', 'statement'],
    ),
  },
  sampleData: {
    ...baseSampleData,
    document: {
      ...baseSampleData.document,
      title: 'Annual Giving Statement',
    },
    statement: {
      period: '2026 Year to Date',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      totalContributions: 725,
      donationCount: 3,
      donations: annualGivingRows,
    },
    taxReceipt: {
      ...baseSampleData.taxReceipt,
      taxYear: 2026,
    },
  },
  expectedHtmlSnippets: [
    'Annual Giving Statement',
    'Statement Summary',
    'Operating subtotal',
    '$725.00',
  ],
  expectedPrintCssSnippets: ['@page{size:8.5in 11in;', 'counter(page)'],
});

const donorLetterFixture = createStarterFixture({
  id: 'starter-donor-letter',
  title: 'Donor Letter Starter',
  category: 'donor_letter',
  template: {
    version: 1,
    id: 'starter-donor-letter-template',
    name: 'Starter Donor Letter',
    category: 'donor_letter',
    pageSettings: basePageSettings,
    theme: baseTheme,
    content: doc([
      assetImage(starterLogoAsset.assetId),
      paragraph(text('Dear '), variable('recipient.full_name'), text(',')),
      paragraph(variable('document.donor_letter_body')),
      paragraph(
        text('You can manage giving preferences at '),
        variable('asset.portal_url'),
        text('.'),
      ),
      assetImage(starterSignatureAsset.assetId),
      placeholder(donorLetterSignaturePlaceholder.id),
    ]),
    variables: variablesFor(donorLetterVariables),
    dataBindings: dataBindingsFor(donorLetterVariables),
    placeholderBindings: [donorLetterSignaturePlaceholder],
    assets: [starterLogoAsset, starterSignatureAsset],
    metadata: metadata(
      'Starter personalized donor letter with rich body copy, signature asset, and future signature placeholder.',
      ['donor-letter', 'correspondence'],
    ),
  },
  sampleData: {
    ...baseSampleData,
    document: {
      ...baseSampleData.document,
      title: 'Donor Letter',
    },
  },
  expectedHtmlSnippets: [
    'Dear',
    'data-asset-role="signature"',
    'Donor care signature',
    'pdf-document-placeholder--signature',
  ],
  expectedPrintCssSnippets: [
    '@page{size:8.5in 11in;',
    '--asym-font-heading:"Georgia","Arial",sans-serif;',
  ],
});

const missionaryReportFixture = createStarterFixture({
  id: 'starter-missionary-report',
  title: 'Missionary Support Report Starter',
  category: 'missionary_report',
  template: {
    version: 1,
    id: 'starter-missionary-report-template',
    name: 'Starter Missionary Support Report',
    category: 'missionary_report',
    pageSettings: basePageSettings,
    theme: baseTheme,
    content: doc([
      assetImage(starterLogoAsset.assetId),
      heading(1, 'Missionary Support Report'),
      paragraph(
        variable('missionary.full_name'),
        text(' | '),
        variable('missionary.location'),
      ),
      assetImage(starterFieldPhotoAsset.assetId),
      summaryBlock('starter-missionary-support-summary'),
      dataTable(missionarySupportTable.id),
      repeater(missionaryUpdateRepeater.id, [
        paragraph(text('Field update: '), variable('missionary.prayer_update')),
      ]),
    ]),
    variables: variablesFor(missionaryReportVariables),
    dataBindings: dataBindingsFor(missionaryReportVariables),
    repeaterBindings: [missionaryUpdateRepeater],
    tableBindings: [missionarySupportTable],
    summaryBlockBindings: [
      {
        id: 'starter-missionary-support-summary',
        title: 'Support Summary',
        calculation: {
          type: 'grouped_subtotals',
          sourcePath: 'missionary.supportRows',
          groupPath: 'fund',
          valuePath: 'amount',
          includeGrandTotal: true,
          grandTotalLabel: 'Total support received',
        },
      },
    ],
    assets: [starterLogoAsset, starterFieldPhotoAsset],
    metadata: metadata(
      'Starter missionary support report with support rows, image asset, grouped totals, and update sections.',
      ['missionary-report', 'support-report'],
    ),
  },
  sampleData: {
    ...baseSampleData,
    document: {
      ...baseSampleData.document,
      title: 'Missionary Support Report',
    },
    missionary: {
      id: 'missionary-3001',
      fullName: 'Avery Carter',
      location: 'Southeast Asia',
      supportGoal: 5000,
      prayerUpdate:
        'Please pray for continued community partnerships and team health.',
      supportRows: missionarySupportRows,
      updates: [
        {
          title: 'Community partnerships',
        },
      ],
    },
  },
  expectedHtmlSnippets: [
    'Missionary Support Report',
    'Monthly support',
    'Total support received',
    '$2,500.00',
  ],
  expectedPrintCssSnippets: [
    '@page{size:8.5in 11in;',
    '--asym-brand-primary:#1f2937;',
  ],
});

const financialReportFixture = createStarterFixture({
  id: 'starter-financial-report',
  title: 'Financial Report Starter',
  category: 'financial_report',
  template: {
    version: 1,
    id: 'starter-financial-report-template',
    name: 'Starter Financial Report',
    category: 'financial_report',
    pageSettings: legalLandscapePageSettings,
    theme: reportTheme,
    content: doc([
      assetImage(starterLogoAsset.assetId),
      heading(1, 'Financial Report'),
      paragraph(
        variable('financial_report.period'),
        text(' | '),
        variable('financial_report.fund_name'),
      ),
      summaryBlock('starter-financial-report-summary'),
      dataTable(financialReportTable.id),
      pageBreak('starter-financial-report-notes-break'),
      paragraph(
        text('Generated at '),
        variable('computed.generated_at'),
        text(' for audit review.'),
      ),
    ]),
    variables: variablesFor(financialReportVariables),
    dataBindings: dataBindingsFor(financialReportVariables),
    tableBindings: [financialReportTable],
    summaryBlockBindings: [
      {
        id: 'starter-financial-report-summary',
        title: 'Report Summary',
        calculation: {
          type: 'financial_report_totals',
          sourcePath: 'financialReport.rows',
          amountPath: 'amount',
          categoryPath: 'category',
          incomeCategories: ['Income'],
          expenseCategories: ['Expense'],
        },
      },
    ],
    assets: [starterLogoAsset],
    metadata: metadata(
      'Starter grouped financial report with income, expense, net, table subtotals, and deterministic page break.',
      ['financial-report', 'finance'],
    ),
  },
  sampleData: {
    ...baseSampleData,
    document: {
      ...baseSampleData.document,
      title: 'Financial Report',
    },
    financialReport: {
      period: 'Q1 2026',
      fundName: 'All Funds',
      incomeTotal: 8500,
      expenseTotal: 3200,
      netBalance: 5300,
      rowCount: 4,
      variancePercentage: 0.08,
      rows: financialReportRows,
    },
  },
  expectedHtmlSnippets: [
    'Financial Report',
    'Report Summary',
    '<dt>Net</dt><dd>$5,300.00</dd>',
    'data-page-break-id="starter-financial-report-notes-break"',
  ],
  expectedPrintCssSnippets: [
    '@page{size:14in 8.5in;',
    '--asym-brand-accent:#2f6f73;',
  ],
});

const invoiceFixture = createStarterFixture({
  id: 'starter-invoice',
  title: 'Invoice Starter',
  category: 'invoice',
  template: {
    version: 1,
    id: 'starter-invoice-template',
    name: 'Starter Invoice',
    category: 'invoice',
    pageSettings: basePageSettings,
    theme: baseTheme,
    content: doc([
      assetImage(starterLogoAsset.assetId),
      heading(1, 'Invoice'),
      paragraph(text('Invoice '), variable('invoice.number')),
      paragraph(
        text('Bill to '),
        variable('recipient.full_name'),
        text(' | Due '),
        variable('invoice.due_date'),
      ),
      dataTable(invoiceLineItemTable.id),
      summaryBlock('starter-invoice-total-summary'),
      placeholder(invoiceApprovalDatePlaceholder.id),
      paragraph(text('Payment status: '), variable('invoice.paid')),
    ]),
    variables: variablesFor(invoiceVariables),
    dataBindings: dataBindingsFor(invoiceVariables),
    tableBindings: [invoiceLineItemTable],
    summaryBlockBindings: [
      {
        id: 'starter-invoice-total-summary',
        title: 'Invoice Totals',
        calculation: {
          type: 'invoice_totals',
          lineItemsPath: 'invoice.lineItems',
          amountPath: 'amount',
          discountPath: 'invoice.discount',
          taxPath: 'invoice.tax',
        },
      },
    ],
    placeholderBindings: [invoiceApprovalDatePlaceholder],
    assets: [starterLogoAsset],
    metadata: metadata(
      'Starter invoice with line items, subtotal, discount, tax, total, and approval-date placeholder.',
      ['invoice', 'billing'],
    ),
  },
  sampleData: {
    ...baseSampleData,
    document: {
      ...baseSampleData.document,
      title: 'Invoice',
    },
    invoice: {
      number: 'INV-2026-0001',
      dueDate: '2026-05-15',
      subtotal: 1550,
      taxRate: 0.0825,
      tax: 123.75,
      discount: 50,
      total: 1623.75,
      paid: false,
      lineItems: invoiceLineItems,
    },
  },
  expectedHtmlSnippets: [
    'Invoice',
    'Program strategy workshop',
    '<dt>Total</dt><dd>$1,623.75</dd>',
    'Approval date',
  ],
  expectedPrintCssSnippets: [
    '@page{size:8.5in 11in;',
    '--asym-brand-background:#ffffff;',
  ],
});

const certificateFixture = createStarterFixture({
  id: 'starter-certificate',
  title: 'Certificate Starter',
  category: 'certificate',
  template: {
    version: 1,
    id: 'starter-certificate-template',
    name: 'Starter Certificate',
    category: 'certificate',
    pageSettings: certificatePageSettings,
    theme: certificateTheme,
    content: doc([
      assetImage(starterLogoAsset.assetId),
      heading(1, 'Certificate of Appreciation'),
      paragraph(text('Presented to')),
      heading(2, variable('recipient.full_name')),
      paragraph(
        text('In recognition of faithful partnership with '),
        variable('organization.name'),
        text('.'),
      ),
      assetImage(starterSignatureAsset.assetId),
      placeholder(certificateQrPlaceholder.id),
    ]),
    variables: variablesFor(certificateVariables),
    dataBindings: dataBindingsFor(certificateVariables),
    placeholderBindings: [certificateQrPlaceholder],
    assets: [starterLogoAsset, starterSignatureAsset],
    metadata: metadata(
      'Starter landscape certificate with branded layout, signature asset, and verification QR placeholder.',
      ['certificate', 'recognition'],
    ),
  },
  sampleData: {
    ...baseSampleData,
    document: {
      ...baseSampleData.document,
      title: 'Certificate',
      certificateTitle: 'Certificate of Appreciation',
    },
  },
  expectedHtmlSnippets: [
    'Certificate of Appreciation',
    'Presented to',
    'Verify certificate',
    'pdf-document-placeholder--qr',
  ],
  expectedPrintCssSnippets: [
    '@page{size:11in 8.5in;',
    '--asym-brand-accent:#9a6a2f;',
  ],
});

export const starterPdfTemplateFixtures = [
  donationReceiptFixture,
  taxReceiptFixture,
  annualGivingStatementFixture,
  donorLetterFixture,
  missionaryReportFixture,
  financialReportFixture,
  invoiceFixture,
  certificateFixture,
] as const satisfies readonly StarterPdfTemplateFixture[];

export const starterPdfTemplateFixtureByCategory = Object.fromEntries(
  starterPdfTemplateFixtures.map((fixture) => [fixture.category, fixture]),
) as Readonly<Record<StarterPdfTemplateCategory, StarterPdfTemplateFixture>>;

function createStarterFixture(input: {
  readonly id: string;
  readonly title: string;
  readonly category: StarterPdfTemplateCategory;
  readonly template: DocumentTemplateV1Input;
  readonly sampleData: VariableDataContext;
  readonly expectedHtmlSnippets: readonly string[];
  readonly expectedPrintCssSnippets: readonly string[];
}): StarterPdfTemplateFixture {
  return {
    id: input.id,
    title: input.title,
    category: input.category,
    template: DocumentTemplateV1Schema.parse(input.template),
    sampleData: input.sampleData,
    expectedWarnings: [],
    expectedHtmlSnippets: input.expectedHtmlSnippets,
    expectedPrintCssSnippets: input.expectedPrintCssSnippets,
  };
}

function metadata(description: string, tags: readonly string[]) {
  return {
    description,
    tags: ['starter-template', 'phase-29', ...tags],
    createdAt,
    updatedAt: createdAt,
  };
}

function variablesFor(keys: readonly string[]): VariableDefinition[] {
  return keys.map((key) => variableFor(key));
}

function variableFor(key: string): VariableDefinition {
  const definition = coreVariableRegistry.get(key);

  if (!definition) {
    throw new Error(`Unknown starter template variable "${key}".`);
  }

  return toTemplateVariableDefinition(definition);
}

function toTemplateVariableDefinition(
  definition: RegistryVariableDefinition,
): VariableDefinition {
  const { documentCategories: _documentCategories, ...templateDefinition } =
    definition;

  return templateDefinition;
}

function dataBindingsFor(keys: readonly string[]): DataBinding[] {
  return keys.map((key) => {
    const definition = coreVariableRegistry.get(key);

    if (!definition) {
      throw new Error(`Unknown starter template binding variable "${key}".`);
    }

    return {
      id: `starter-binding-${key}`,
      variableKey: definition.key,
      sourcePath: definition.sourcePath,
      required: definition.required,
    };
  });
}

function doc(content: readonly DocumentContentNode[]): DocumentContent {
  return {
    type: 'doc',
    content: [...content],
  };
}

function heading(
  level: number,
  ...content: readonly (DocumentContentNode | string)[]
): DocumentContentNode {
  return {
    type: 'heading',
    attrs: { level },
    content: [...content.map(toContentNode)],
  };
}

function paragraph(
  ...content: readonly (DocumentContentNode | string)[]
): DocumentContentNode {
  return {
    type: 'paragraph',
    content: [...content.map(toContentNode)],
  };
}

function toContentNode(
  value: DocumentContentNode | string,
): DocumentContentNode {
  return typeof value === 'string' ? text(value) : value;
}

function text(value: string): DocumentContentNode {
  return {
    type: 'text',
    text: value,
  };
}

function variable(key: string): DocumentContentNode {
  return {
    type: 'variable',
    attrs: { key },
  };
}

function assetImage(assetId: string): DocumentContentNode {
  return {
    type: 'assetImage',
    attrs: { assetId },
  };
}

function dataTable(bindingId: string): DocumentContentNode {
  return {
    type: 'dataTable',
    attrs: { bindingId },
  };
}

function summaryBlock(bindingId: string): DocumentContentNode {
  return {
    type: 'summaryBlock',
    attrs: { bindingId },
  };
}

function placeholder(placeholderId: string): DocumentContentNode {
  return {
    type: 'documentPlaceholder',
    attrs: { placeholderId },
  };
}

function pageBreak(id: string): DocumentContentNode {
  return {
    type: 'pageBreak',
    attrs: { id, label: 'Notes page break' },
  };
}

function repeater(
  bindingId: string,
  content: readonly DocumentContentNode[],
): DocumentContentNode {
  return {
    type: 'repeater',
    attrs: { bindingId },
    content: [...content],
  };
}
