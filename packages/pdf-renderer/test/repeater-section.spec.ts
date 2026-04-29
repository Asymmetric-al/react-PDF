import {
  composePdfDocumentHtml,
  resolvePdfDocumentVariables,
} from '@asym/pdf-renderer';
import type { DocumentContentNode } from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

const dataContext = {
  donations: [
    { amount: 50, date: '2026-01-15', designation: 'Missions' },
    { amount: 125, date: '2026-01-02', designation: 'General' },
  ],
  invoice: {
    lineItems: [
      { description: 'Design', total: 700 },
      { description: 'Print', total: 300 },
    ],
  },
  financialRows: [
    { label: 'Expense', total: -30 },
    { label: 'Income', total: 100 },
  ],
};

function doc(content: readonly DocumentContentNode[]): DocumentContentNode {
  return {
    content,
    type: 'doc',
  };
}

describe('Phase 17 renderer repeater sections', () => {
  it('renders repeated donation rows with scoped variable metadata', () => {
    const result = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            binding: {
              id: 'donation-rows',
              sourcePath: 'donations',
              itemAlias: 'donation',
              maxItems: 1000,
            },
          },
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'variable', attrs: { key: 'donation.amount' } },
                { type: 'text', text: ' for ' },
                { type: 'variable', attrs: { key: 'donation.designation' } },
              ],
            },
          ],
          type: 'repeater',
        },
      ]),
    });

    expect(result.html).toContain('data-asym-repeater="true"');
    expect(result.html).toContain('data-repeater-rendered-index="0"');
    expect(result.html).toContain('data-repeater-rendered-index="1"');
    expect(result.variables).toHaveLength(4);
    expect(result.variables.slice(0, 2)).toMatchObject([
      {
        key: 'donation.amount',
        scopes: [
          {
            itemAlias: 'donation',
            sourceIndex: 0,
            sourcePath: 'donations',
          },
        ],
      },
      {
        key: 'donation.designation',
        scopes: [
          {
            itemAlias: 'donation',
            sourceIndex: 0,
            sourcePath: 'donations',
          },
        ],
      },
    ]);
  });

  it('resolves repeated invoice line item variables from scoped metadata', () => {
    const rendered = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            bindingId: 'invoice-lines',
          },
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  attrs: {
                    formatter: 'currency.usd',
                    key: 'invoice.total',
                  },
                  type: 'variable',
                },
              ],
            },
          ],
          type: 'repeater',
        },
      ]),
      repeaterBindings: [
        {
          id: 'invoice-lines',
          itemAlias: 'invoice',
          maxItems: 1000,
          sourcePath: 'invoice.lineItems',
        },
      ],
    });
    const resolved = resolvePdfDocumentVariables({
      context: dataContext,
      variables: rendered.variables,
    });

    expect(resolved.values.map((value) => value.formattedValue)).toEqual([
      '$700.00',
      '$300.00',
    ]);
  });

  it('renders empty state and structured warnings for missing and non-array sources', () => {
    const missing = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            binding: {
              emptyState: 'No donations yet.',
              id: 'missing-donations',
              itemAlias: 'donation',
              maxItems: 1000,
              sourcePath: 'missingDonations',
            },
          },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'x' }] },
          ],
          type: 'repeater',
        },
      ]),
    });
    const nonArray = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            binding: {
              emptyState: 'No rows.',
              id: 'non-array',
              itemAlias: 'row',
              maxItems: 1000,
              sourcePath: 'invoice',
            },
          },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'x' }] },
          ],
          type: 'repeater',
        },
      ]),
    });

    expect(missing.html).toContain('No donations yet.');
    expect(missing.warnings).toMatchObject([
      {
        code: 'missing_repeater_source',
        severity: 'warning',
      },
    ]);
    expect(nonArray.html).toContain('No rows.');
    expect(nonArray.warnings).toMatchObject([
      {
        code: 'non_array_repeater_source',
        severity: 'warning',
      },
    ]);
  });

  it('applies filters, sorting, max guard, and nested scoped conditionals deterministically', () => {
    const result = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {
            binding: {
              filters: [
                {
                  fieldPath: 'financialReport.total',
                  operator: 'greater_than',
                  value: 0,
                },
              ],
              id: 'financial-rows',
              itemAlias: 'financialReport',
              maxItems: 1,
              sort: {
                direction: 'desc',
                fieldPath: 'total',
              },
              sourcePath: 'financialRows',
            },
          },
          content: [
            {
              attrs: {
                rule: {
                  fieldPath: 'financialReport.total',
                  operator: 'greater_than',
                  value: 0,
                },
              },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'variable',
                      attrs: { key: 'financial_report.fund_name' },
                    },
                  ],
                },
              ],
              type: 'conditionalSection',
            },
          ],
          type: 'repeater',
        },
      ]),
    });

    expect(result.variables).toHaveLength(1);
    expect(result.variables[0]).toMatchObject({
      key: 'financial_report.fund_name',
      scopes: [
        {
          itemAlias: 'financialReport',
          sourceIndex: 1,
          sourcePath: 'financialRows',
        },
      ],
    });
    expect(result.html).not.toContain('Expense');
    expect(result.warnings).toEqual([]);
  });

  it('renders author content once with an error when a repeater binding is invalid', () => {
    const result = composePdfDocumentHtml({
      dataContext,
      document: doc([
        {
          attrs: {},
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Author fallback content' }],
            },
          ],
          type: 'repeater',
        },
      ]),
    });

    expect(result.html).toContain('Author fallback content');
    expect(result.warnings).toMatchObject([
      {
        code: 'missing_repeater_binding',
        severity: 'error',
      },
    ]);
  });
});
