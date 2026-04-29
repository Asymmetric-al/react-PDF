import {
  composePdfDocumentHtml,
  evaluatePdfDocumentCondition,
} from '@asym/pdf-renderer';
import { describe, expect, it } from 'vitest';

const context = {
  recipient: {
    country: 'US',
  },
  missionary: {},
};

describe('Phase 16 renderer conditional sections', () => {
  it('renders nested content when the condition matches', () => {
    const result = composePdfDocumentHtml({
      dataContext: context,
      document: {
        type: 'doc',
        content: [
          {
            type: 'conditionalSection',
            attrs: {
              rule: {
                fieldPath: 'recipient.country',
                operator: 'equals',
                value: 'US',
              },
            },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'US donor language' }],
              },
            ],
          },
        ],
      },
    });

    expect(result.html).toContain('data-asym-conditional-section="true"');
    expect(result.html).toContain('US donor language');
    expect(result.warnings).toEqual([]);
  });

  it('omits nested content and nested variable collection when the condition is false', () => {
    const result = composePdfDocumentHtml({
      dataContext: context,
      document: {
        type: 'doc',
        content: [
          {
            type: 'conditionalSection',
            attrs: {
              rule: {
                fieldPath: 'missionary.fullName',
                operator: 'exists',
              },
            },
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Missionary only' },
                  {
                    type: 'variable',
                    attrs: {
                      key: 'missionary.full_name',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(result.html).not.toContain('Missionary only');
    expect(result.variables).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('renders nested content with warnings when context or rules are invalid', () => {
    const noContext = composePdfDocumentHtml({
      document: {
        type: 'doc',
        content: [
          {
            type: 'conditionalSection',
            attrs: {
              rule: {
                fieldPath: 'recipient.country',
                operator: 'equals',
                value: 'US',
              },
            },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Safe fallback content' }],
              },
            ],
          },
        ],
      },
    });
    const invalidRule = composePdfDocumentHtml({
      dataContext: context,
      document: {
        type: 'doc',
        content: [
          {
            type: 'conditionalSection',
            attrs: {},
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Invalid rule fallback' }],
              },
            ],
          },
        ],
      },
    });

    expect(noContext.html).toContain('Safe fallback content');
    expect(noContext.warnings).toMatchObject([
      {
        code: 'missing_condition_context',
        severity: 'warning',
      },
    ]);
    expect(invalidRule.html).toContain('Invalid rule fallback');
    expect(invalidRule.warnings).toMatchObject([
      {
        code: 'invalid_condition_rule',
        severity: 'error',
      },
    ]);
  });

  it('exposes a renderer condition adapter', () => {
    expect(
      evaluatePdfDocumentCondition({
        context,
        path: ['content', '0'],
        rule: {
          fieldPath: 'recipient.country',
          operator: 'equals',
          value: 'US',
        },
      }),
    ).toMatchObject({
      visible: true,
      warnings: [],
    });
  });
});
