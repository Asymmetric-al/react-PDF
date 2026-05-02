const receiptVariables = [
  {
    key: 'organization.name',
    label: 'Organization Name',
    group: 'organization',
    type: 'string',
    sampleValue: 'Asymmetric Giving',
    required: true,
    privacy: 'public',
  },
  {
    key: 'recipient.full_name',
    label: 'Donor Full Name',
    group: 'recipient',
    type: 'string',
    sampleValue: 'Jordan Lee',
    required: true,
    privacy: 'pii',
    sourcePath: 'recipient.fullName',
  },
  {
    key: 'donation.amount',
    label: 'Donation Amount',
    group: 'donation',
    type: 'currency',
    sampleValue: 125,
    required: true,
    formatter: 'currency.usd',
    privacy: 'financial',
    sourcePath: 'donation.amount',
  },
];

export const donationReceiptTemplate = {
  version: 1,
  id: 'template-donation-receipt',
  name: 'Donation Receipt',
  category: 'donation_receipt',
  pageSettings: {},
  theme: {
    name: 'Receipt Brand',
    colors: {
      primary: '#1f2937',
      accent: '#0f766e',
      text: '#111827',
      background: '#ffffff',
    },
  },
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Donation Receipt' }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Thank you, ' },
          {
            type: 'variable',
            attrs: { key: 'recipient.full_name' },
          },
          { type: 'text', text: ', for your gift.' },
        ],
      },
    ],
  },
  variables: receiptVariables,
  dataBindings: [
    {
      id: 'binding-donor-name',
      variableKey: 'recipient.full_name',
      sourcePath: 'recipient.fullName',
      required: true,
    },
  ],
  assets: [
    {
      id: 'asset-logo',
      role: 'logo',
      assetId: 'tenant-logo',
      altText: 'Organization logo',
      mimeType: 'image/png',
      renderSafe: true,
    },
  ],
  metadata: {
    description: 'Single gift receipt fixture.',
    tags: ['receipt'],
    createdAt: '2026-04-25T00:00:00.000Z',
  },
};
