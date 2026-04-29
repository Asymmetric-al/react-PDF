import {
  ConditionalRuleSchema,
  evaluateConditionalRule,
  evaluateConditionalRules,
} from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

const sampleContext = {
  donation: {
    amount: 125,
    designation: 'Missions Fund',
    goodsServicesValue: 0,
  },
  recipient: {
    country: 'US',
    tags: ['newsletter', 'major-donor'],
  },
  financialReport: {
    rowCount: 12,
  },
  invoice: {
    paymentInstructions: '',
  },
  missionary: {
    fullName: 'Avery Carter',
  },
};

describe('Phase 16 conditional rule schema and evaluator', () => {
  it('validates Phase 16 operators and comparison value requirements', () => {
    expect(
      ConditionalRuleSchema.safeParse({
        fieldPath: 'donation.amount',
        operator: 'greater_than_or_equal',
        value: 125,
      }).success,
    ).toBe(true);
    expect(
      ConditionalRuleSchema.safeParse({
        fieldPath: 'recipient.country',
        operator: 'not_in',
        value: ['CA', 'GB'],
      }).success,
    ).toBe(true);
    expect(
      ConditionalRuleSchema.safeParse({
        fieldPath: 'recipient.country',
        operator: 'equals',
      }).success,
    ).toBe(false);
    expect(
      ConditionalRuleSchema.safeParse({
        fieldPath: 'recipient.country',
        operator: 'exists',
        value: true,
      }).success,
    ).toBe(false);
    expect(
      ConditionalRuleSchema.safeParse({
        fieldPath: 'recipient.country',
        operator: 'in',
        value: 'US',
      }).success,
    ).toBe(false);
  });

  it('evaluates every Phase 16 operator deterministically', () => {
    const cases = [
      ['exists', 'missionary.fullName', undefined],
      ['not_exists', 'missionary.location', undefined],
      ['equals', 'recipient.country', 'US'],
      ['not_equals', 'recipient.country', 'CA'],
      ['greater_than', 'donation.amount', 100],
      ['greater_than_or_equal', 'donation.amount', 125],
      ['less_than', 'donation.goodsServicesValue', 1],
      ['less_than_or_equal', 'donation.goodsServicesValue', 0],
      ['contains', 'donation.designation', 'Missions'],
      ['contains', 'recipient.tags', 'major-donor'],
      ['not_contains', 'recipient.tags', 'lapsed'],
      ['is_empty', 'invoice.paymentInstructions', undefined],
      ['is_not_empty', 'recipient.country', undefined],
      ['in', 'recipient.country', ['US', 'CA']],
      ['not_in', 'recipient.country', ['GB', 'AU']],
    ] as const;

    for (const [operator, fieldPath, value] of cases) {
      const result = evaluateConditionalRule({
        context: sampleContext,
        rule: {
          fieldPath,
          operator,
          ...(value === undefined ? {} : { value }),
        },
      });

      expect(result).toMatchObject({
        fieldPath,
        matched: true,
        operator,
        diagnostics: [],
      });
    }
  });

  it('returns structured diagnostics for missing fields and invalid comparisons', () => {
    const missingField = evaluateConditionalRule({
      context: sampleContext,
      rule: {
        fieldPath: 'recipient.missingCountry',
        operator: 'equals',
        value: 'US',
      },
    });
    const invalidComparison = evaluateConditionalRule({
      context: sampleContext,
      rule: {
        fieldPath: 'recipient.country',
        operator: 'greater_than',
        value: 1,
      },
    });

    expect(missingField).toMatchObject({
      matched: false,
      diagnostics: [
        {
          code: 'missing_condition_field',
          severity: 'warning',
          fieldPath: 'recipient.missingCountry',
        },
      ],
    });
    expect(invalidComparison).toMatchObject({
      matched: false,
      diagnostics: [
        {
          code: 'invalid_condition_value',
          severity: 'error',
          fieldPath: 'recipient.country',
        },
      ],
    });
  });

  it('combines rules with deterministic AND semantics', () => {
    const result = evaluateConditionalRules({
      context: sampleContext,
      rules: [
        {
          fieldPath: 'recipient.country',
          operator: 'equals',
          value: 'US',
        },
        {
          fieldPath: 'financialReport.rowCount',
          operator: 'greater_than',
          value: 0,
        },
      ],
    });

    expect(result).toMatchObject({
      matched: true,
      diagnostics: [],
    });
    expect(result.results.map((item) => item.fieldPath)).toEqual([
      'recipient.country',
      'financialReport.rowCount',
    ]);
  });

  it('treats JavaScript-looking values as inert data', () => {
    expect(() =>
      evaluateConditionalRule({
        context: sampleContext,
        rule: {
          fieldPath: 'recipient.country',
          operator: 'equals',
          value: 'globalThis.__phase16Injected = true',
        },
      }),
    ).not.toThrow();
    expect('__phase16Injected' in globalThis).toBe(false);
  });
});
