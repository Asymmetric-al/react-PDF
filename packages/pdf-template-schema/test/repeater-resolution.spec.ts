import {
  createScopedRepeaterContext,
  RepeaterBindingSchema,
  resolveRepeaterItems,
} from '@asym/pdf-template-schema';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sampleContext = {
  donations: [
    { amount: 50, date: '2026-01-15', designation: 'Missions' },
    { amount: 125, date: '2026-01-02', designation: 'General' },
    { amount: 75, date: '2026-01-10', designation: 'Missions' },
  ],
  financialRows: [
    { label: 'Expense', total: -30 },
    { label: 'Income', total: 100 },
  ],
  financialSummary: {
    total: 70,
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Phase 17 repeater binding schema and scoped resolver', () => {
  it('validates repeater aliases, index aliases, filters, and defaults', () => {
    const parsed = RepeaterBindingSchema.parse({
      id: 'financial-rows',
      sourcePath: 'financialRows',
      itemAlias: 'financialReport',
      indexAlias: 'document.rowIndex',
      filters: [
        {
          fieldPath: 'financialReport.total',
          operator: 'greater_than',
          value: 0,
        },
      ],
    });

    expect(parsed).toMatchObject({
      filters: [
        {
          fieldPath: 'financialReport.total',
          operator: 'greater_than',
          value: 0,
        },
      ],
      indexAlias: 'document.rowIndex',
      itemAlias: 'financialReport',
      maxItems: 1000,
    });
  });

  it('resolves array items with deterministic sorting and scoped contexts', () => {
    const result = resolveRepeaterItems({
      binding: {
        id: 'donation-rows',
        sourcePath: 'donations',
        itemAlias: 'donation',
        maxItems: 1000,
        sort: {
          fieldPath: 'date',
          direction: 'asc',
        },
      },
      context: sampleContext,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.items.map((item) => item.sourceIndex)).toEqual([1, 2, 0]);
    expect(
      result.items.map((item) =>
        item.context.donation &&
        typeof item.context.donation === 'object' &&
        'amount' in item.context.donation
          ? item.context.donation.amount
          : undefined,
      ),
    ).toEqual([125, 75, 50]);
  });

  it('filters items with structured conditional rules and no arbitrary JavaScript', () => {
    const result = resolveRepeaterItems({
      binding: {
        filters: [
          {
            fieldPath: 'donation.designation',
            operator: 'equals',
            value: 'globalThis.__phase17Injected = true',
          },
        ],
        id: 'safe-filter',
        itemAlias: 'donation',
        maxItems: 1000,
        sourcePath: 'donations',
      },
      context: sampleContext,
    });

    expect(result.items).toEqual([]);
    expect('__phase17Injected' in globalThis).toBe(false);
  });

  it('returns structured diagnostics for missing and non-array sources', () => {
    expect(
      resolveRepeaterItems({
        binding: {
          id: 'missing',
          itemAlias: 'donation',
          maxItems: 1000,
          sourcePath: 'missingDonations',
        },
        context: sampleContext,
      }).diagnostics,
    ).toMatchObject([
      {
        code: 'missing_repeater_source',
        severity: 'warning',
        sourcePath: 'missingDonations',
      },
    ]);

    expect(
      resolveRepeaterItems({
        binding: {
          id: 'non-array',
          itemAlias: 'donation',
          maxItems: 1000,
          sourcePath: 'financialSummary',
        },
        context: sampleContext,
      }).diagnostics,
    ).toMatchObject([
      {
        code: 'non_array_repeater_source',
        severity: 'warning',
        sourcePath: 'financialSummary',
      },
    ]);
  });

  it('returns a structured diagnostic for invalid repeater bindings', () => {
    const result = resolveRepeaterItems({
      binding: {
        id: 'too-many-items',
        itemAlias: 'donation',
        maxItems: 5000,
        sourcePath: 'donations',
      },
      context: sampleContext,
    });

    expect(result.items).toEqual([]);
    expect(result.diagnostics).toMatchObject([
      {
        bindingId: 'too-many-items',
        code: 'invalid_repeater_binding',
        severity: 'error',
        sourcePath: 'donations',
      },
    ]);
    expect(result.diagnostics[0]?.message).toContain(
      'Repeater binding is invalid:',
    );
  });

  it('sorts strings without locale-dependent lowercasing', () => {
    vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(
      () => 'same-locale-value',
    );

    const result = resolveRepeaterItems({
      binding: {
        id: 'sorted-names',
        itemAlias: 'organization',
        maxItems: 1000,
        sort: {
          direction: 'asc',
          fieldPath: 'name',
        },
        sourcePath: 'organizations',
      },
      context: {
        organizations: [{ name: 'Beta' }, { name: 'alpha' }],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.items.map((item) => item.sourceIndex)).toEqual([1, 0]);
    expect(String.prototype.toLocaleLowerCase).not.toHaveBeenCalled();
  });

  it('sorts informal date strings as deterministic strings, not parsed dates', () => {
    const result = resolveRepeaterItems({
      binding: {
        id: 'informal-date-sort',
        itemAlias: 'donation',
        maxItems: 1000,
        sort: {
          direction: 'asc',
          fieldPath: 'date',
        },
        sourcePath: 'donations',
      },
      context: {
        donations: [{ date: '01/02/2026' }, { date: '12/31/2025' }],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.items.map((item) => item.sourceIndex)).toEqual([0, 1]);
  });

  it('truncates with a max-items warning and keeps output order deterministic', () => {
    const result = resolveRepeaterItems({
      binding: {
        id: 'limited',
        itemAlias: 'donation',
        maxItems: 2,
        sourcePath: 'donations',
      },
      context: sampleContext,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.sourceIndex)).toEqual([0, 1]);
    expect(result.diagnostics).toMatchObject([
      {
        code: 'repeater_max_items_exceeded',
        severity: 'warning',
        details: {
          maxItems: 2,
          totalItems: 3,
        },
      },
    ]);
  });

  it('creates scoped contexts without mutating the root context', () => {
    const donation = { amount: 250 };
    const scopedContext = createScopedRepeaterContext({
      context: sampleContext,
      indexAlias: 'document.rowIndex',
      itemAlias: 'donation',
      itemValue: donation,
      renderedIndex: 4,
    });

    expect(scopedContext).toMatchObject({
      donation,
      document: {
        rowIndex: 4,
      },
    });
    expect(sampleContext).not.toHaveProperty('document');
  });
});
