import {
  composePdfDocumentHtml,
  resolvePdfDocumentVariables,
} from '@asym/pdf-renderer';
import { coreVariableRegistry } from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

describe('Phase 14 renderer variable resolution integration', () => {
  it('resolves serializer-collected variable usages without mutating HTML', () => {
    const serializedDocument = composePdfDocumentHtml({
      document: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Dear ',
              },
              {
                type: 'variable',
                attrs: {
                  variableKey: 'recipient.full_name',
                },
              },
              {
                type: 'text',
                text: ', total: ',
              },
              {
                type: 'variable',
                attrs: {
                  formatter: 'currency.usd',
                  variableKey: 'donation.amount',
                },
              },
            ],
          },
        ],
      },
    });
    const resolvedVariables = resolvePdfDocumentVariables({
      context: coreVariableRegistry.createSampleData('donation_receipt'),
      variables: serializedDocument.variables,
    });

    expect(serializedDocument.html).toContain('data-variable-key');
    expect(resolvedVariables.values).toMatchObject([
      {
        key: 'recipient.full_name',
        formattedValue: 'Jordan Lee',
        status: 'resolved',
      },
      {
        key: 'donation.amount',
        formattedValue: '$125.00',
        status: 'resolved',
      },
    ]);
    expect(resolvedVariables.diagnostics).toEqual([]);
  });

  it('reports unknown serializer variable usages through resolver diagnostics', () => {
    const result = resolvePdfDocumentVariables({
      context: {},
      variables: [
        {
          key: 'unknown.variable',
          path: ['doc', '0'],
        },
      ],
    });

    expect(result.values).toMatchObject([
      {
        key: 'unknown.variable',
        status: 'unknown_variable',
      },
    ]);
    expect(result.diagnostics).toMatchObject([
      {
        code: 'unknown_variable',
        variableKey: 'unknown.variable',
      },
    ]);
  });
});
