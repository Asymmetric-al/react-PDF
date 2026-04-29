import { readFileSync } from 'node:fs';
import {
  coreVariableRegistry,
  createVariableResolver,
  formatVariableValue,
  getValueAtDataPath,
  type RegistryVariableDefinition,
  resolveVariableValue,
  resolveVariableValues,
} from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

function getDefinition(key: string): RegistryVariableDefinition {
  const definition = coreVariableRegistry.get(key);

  if (!definition) {
    throw new Error(`Missing test registry definition for ${key}.`);
  }

  return definition;
}

describe('Phase 14 variable resolution and formatting', () => {
  it('resolves a string variable from a nested source path', () => {
    const data = coreVariableRegistry.createSampleData('donation_receipt');
    const result = resolveVariableValue({
      context: data,
      key: 'recipient.full_name',
    });

    expect(getValueAtDataPath(data, 'recipient.fullName')).toEqual({
      found: true,
      value: 'Jordan Lee',
    });
    expect(result).toMatchObject({
      key: 'recipient.full_name',
      sourcePath: 'recipient.fullName',
      status: 'resolved',
      formattedValue: 'Jordan Lee',
      diagnostics: [],
    });
  });

  it('does not traverse arrays as object records in data paths', () => {
    expect(
      getValueAtDataPath(
        {
          recipient: ['not a recipient record'],
        },
        'recipient.0',
      ),
    ).toEqual({ found: false });
  });

  it('uses fallback values for missing optional variables', () => {
    const data = coreVariableRegistry.createSampleData('donation_receipt');
    delete (data.donation as Record<string, unknown>).designation;

    const result = resolveVariableValue({
      context: data,
      key: 'donation.designation',
    });

    expect(result.status).toBe('fallback');
    expect(result.formattedValue).toBe('General Fund');
    expect(result.diagnostics).toMatchObject([
      {
        code: 'missing_optional_value',
        severity: 'warning',
        variableKey: 'donation.designation',
      },
    ]);
  });

  it('uses request fallback overrides for missing optional variables', () => {
    const data = coreVariableRegistry.createSampleData('donation_receipt');
    delete (data.document as Record<string, unknown>).footerText;

    const result = resolveVariableValue({
      context: data,
      fallback: { mode: 'use_value', value: 'Custom footer fallback' },
      key: 'document.footer_text',
    });

    expect(result.status).toBe('fallback');
    expect(result.formattedValue).toBe('Custom footer fallback');
    expect(result.diagnostics).toMatchObject([
      {
        code: 'missing_optional_value',
        severity: 'warning',
        variableKey: 'document.footer_text',
      },
    ]);
  });

  it('returns structured errors for missing required variables', () => {
    const data = coreVariableRegistry.createSampleData('donation_receipt');
    delete (data.recipient as Record<string, unknown>).fullName;

    const result = resolveVariableValue({
      context: data,
      key: 'recipient.full_name',
    });

    expect(result.status).toBe('missing_required');
    expect(result.formattedValue).toBe('');
    expect(result.diagnostics).toMatchObject([
      {
        code: 'missing_required_value',
        severity: 'error',
        variableKey: 'recipient.full_name',
      },
    ]);
  });

  it('formats currency, date, date range, fiscal period, address, percentage, boolean, and image URLs', () => {
    expect(
      resolveVariableValue({
        context: {
          donation: {
            amount: 125,
          },
        },
        key: 'donation.amount',
      }).formattedValue,
    ).toBe('$125.00');

    expect(
      resolveVariableValue({
        context: {
          donation: {
            date: '2026-04-15',
          },
        },
        key: 'donation.date',
      }).formattedValue,
    ).toBe('Apr 15, 2026');

    expect(
      formatVariableValue({
        definition: getDefinition('statement.period'),
        formatter: 'date_range.medium',
        value: {
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      }).formattedValue,
    ).toBe('Jan 1, 2026 - Dec 31, 2026');

    expect(
      formatVariableValue({
        definition: getDefinition('statement.period'),
        formatter: 'fiscal.year',
        value: 2026,
      }).formattedValue,
    ).toBe('FY 2026');

    expect(
      resolveVariableValue({
        context: {
          organization: {
            address: {
              line1: '100 Mission Way',
              line2: 'Suite 4',
              city: 'Franklin',
              region: 'TN',
              postalCode: '37064',
              country: 'US',
            },
          },
        },
        key: 'organization.address',
      }).formattedValue,
    ).toBe('100 Mission Way\nSuite 4\nFranklin, TN 37064\nUS');

    expect(
      resolveVariableValue({
        context: {
          financialReport: {
            variancePercentage: 0.08,
          },
        },
        key: 'financial_report.variance_percentage',
      }).formattedValue,
    ).toBe('8%');

    expect(
      resolveVariableValue({
        context: {
          invoice: {
            paid: false,
          },
        },
        key: 'invoice.paid',
      }).formattedValue,
    ).toBe('No');

    expect(
      resolveVariableValue({
        context: {
          asset: {
            logoUrl: 'https://assets.example.test/logo.png',
          },
        },
        key: 'asset.logo_url',
      }).formattedValue,
    ).toBe('https://assets.example.test/logo.png');
  });

  it('reports invalid values, unknown variables, and unknown formatters deterministically', () => {
    const invalidType = resolveVariableValue({
      context: {
        donation: {
          amount: '125',
        },
      },
      key: 'donation.amount',
    });
    const unknownVariable = resolveVariableValue({
      context: {},
      key: 'unknown.variable',
    });
    const unknownFormatter = resolveVariableValue({
      context: {
        recipient: {
          fullName: 'Jordan Lee',
        },
      },
      formatter: 'missing.formatter',
      key: 'recipient.full_name',
    });

    expect(invalidType.status).toBe('invalid_type');
    expect(invalidType.diagnostics).toMatchObject([
      {
        code: 'invalid_variable_type',
        severity: 'error',
      },
    ]);
    expect(unknownVariable.status).toBe('unknown_variable');
    expect(unknownVariable.diagnostics).toMatchObject([
      {
        code: 'unknown_variable',
        severity: 'error',
      },
    ]);
    expect(unknownFormatter.status).toBe('unknown_formatter');
    expect(unknownFormatter.diagnostics).toMatchObject([
      {
        code: 'unknown_formatter',
        severity: 'error',
      },
    ]);

    expect(
      resolveVariableValue({
        context: {
          asset: {
            logoUrl: 'blob:https://assets.example.test/logo.png',
          },
        },
        key: 'asset.logo_url',
      }).diagnostics,
    ).toMatchObject([
      {
        code: 'invalid_variable_value',
        severity: 'warning',
      },
    ]);
  });

  it('resolves many variable requests and exposes a reusable resolver', () => {
    const resolver = createVariableResolver();
    const data = coreVariableRegistry.createSampleData('invoice');
    const result = resolver.resolveMany(
      [
        'recipient.full_name',
        { key: 'invoice.total', formatter: 'currency.usd' },
        'unknown.variable',
      ],
      data,
    );

    expect(result.values.map((value) => value.key)).toEqual([
      'recipient.full_name',
      'invoice.total',
      'unknown.variable',
    ]);
    expect(result.diagnostics).toMatchObject([
      {
        code: 'unknown_variable',
        variableKey: 'unknown.variable',
      },
    ]);

    expect(
      resolveVariableValues({
        context: data,
        variables: ['invoice.number', 'invoice.total'],
      }).diagnostics,
    ).toEqual([]);
  });

  it('keeps the resolver package free of React dependencies', () => {
    const packageJsonUrl = new URL('../package.json', import.meta.url);
    const packageJson = JSON.parse(readFileSync(packageJsonUrl, 'utf8')) as {
      readonly dependencies?: Readonly<Record<string, string>>;
      readonly peerDependencies?: Readonly<Record<string, string>>;
    };

    expect(Object.keys(packageJson.dependencies ?? {})).not.toContain('react');
    expect(Object.keys(packageJson.peerDependencies ?? {})).not.toContain(
      'react',
    );
  });
});
