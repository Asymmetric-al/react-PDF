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

  it('passes variable fallback overrides through resolver diagnostics without mutating HTML', () => {
    const serializedDocument = composePdfDocumentHtml({
      document: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'variable',
                attrs: {
                  fallback: 'Friend',
                  variableKey: 'document.footer_text',
                },
              },
            ],
          },
        ],
      },
    });
    const resolvedVariables = resolvePdfDocumentVariables({
      context: {},
      variables: serializedDocument.variables,
    });

    expect(serializedDocument.html).toContain('data-variable-key');
    expect(serializedDocument.html).toContain('data-variable-fallback');
    expect(resolvedVariables.values).toMatchObject([
      {
        key: 'document.footer_text',
        formattedValue: 'Friend',
        status: 'fallback',
      },
    ]);
  });

  it('preserves structured variable fallback overrides from serializer input', () => {
    const serializedDocument = composePdfDocumentHtml({
      document: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'variable',
                attrs: {
                  fallback: { mode: 'use_value', value: 'Friend' },
                  key: 'document.footer_text',
                },
              },
            ],
          },
        ],
      },
    });
    const resolvedVariables = resolvePdfDocumentVariables({
      context: {},
      variables: serializedDocument.variables,
    });

    expect(serializedDocument.variables).toMatchObject([
      {
        fallback: { mode: 'use_value', value: 'Friend' },
        key: 'document.footer_text',
      },
    ]);
    expect(resolvedVariables.values).toMatchObject([
      {
        formattedValue: 'Friend',
        key: 'document.footer_text',
        status: 'fallback',
      },
    ]);
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
