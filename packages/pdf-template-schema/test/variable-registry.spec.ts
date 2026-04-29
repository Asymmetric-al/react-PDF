import { readFileSync } from 'node:fs';
import {
  coreVariableDefinitions,
  coreVariableRegistry,
  createVariableRegistry,
  RegistryVariableDefinitionSchema,
  VariableRegistryError,
} from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

const requiredGroups = [
  'organization',
  'recipient',
  'donation',
  'document',
  'missionary',
  'tax_receipt',
  'financial_report',
  'statement',
  'invoice',
  'asset',
  'computed',
] as const;

const requiredValueTypes = [
  'string',
  'rich_text',
  'date',
  'currency',
  'number',
  'percentage',
  'boolean',
  'address',
  'image_url',
  'url',
  'id',
] as const;

const sampleFixtureCategories = [
  'donation_receipt',
  'tax_receipt',
  'annual_giving_statement',
  'financial_report',
  'invoice',
  'certificate',
] as const;

describe('Phase 13 typed variable registry', () => {
  it('validates every built-in registry variable definition', () => {
    const parsedDefinitions = coreVariableDefinitions.map((definition) =>
      RegistryVariableDefinitionSchema.parse(definition),
    );
    const groups = new Set(
      parsedDefinitions.map((definition) => definition.group),
    );
    const valueTypes = new Set(
      parsedDefinitions.map((definition) => definition.type),
    );

    expect(parsedDefinitions.length).toBeGreaterThan(30);
    expect([...groups].sort()).toEqual([...requiredGroups].sort());
    expect([...valueTypes].sort()).toEqual([...requiredValueTypes].sort());

    for (const definition of parsedDefinitions) {
      expect(definition.description).toBeTruthy();
      expect(definition.formatter).toBeTruthy();
      expect(definition.sourcePath).toBeTruthy();
      expect(definition.documentCategories.length).toBeGreaterThan(0);
    }
  });

  it('requires Phase 13 registry-only metadata', () => {
    const requiredDefinition = coreVariableRegistry.get('organization.name');

    expect(requiredDefinition).toBeDefined();

    const {
      documentCategories,
      fallback,
      required,
      ...definitionWithoutMetadata
    } = requiredDefinition!;

    expect(documentCategories.length).toBeGreaterThan(0);
    expect(fallback.mode).toBe('none');
    expect(required).toBe(true);
    expect(() =>
      RegistryVariableDefinitionSchema.parse(definitionWithoutMetadata),
    ).toThrow();
  });

  it('rejects duplicate variable keys deterministically', () => {
    const [firstDefinition] = coreVariableDefinitions;

    expect(() =>
      createVariableRegistry([
        firstDefinition,
        {
          ...firstDefinition,
          label: 'Duplicate Organization Name',
        },
      ]),
    ).toThrow(VariableRegistryError);

    try {
      createVariableRegistry([
        firstDefinition,
        {
          ...firstDefinition,
          label: 'Duplicate Organization Name',
        },
      ]);
    } catch (error) {
      expect(error).toBeInstanceOf(VariableRegistryError);
      expect((error as VariableRegistryError).code).toBe('duplicate_key');
      expect((error as VariableRegistryError).variableKeys).toEqual([
        firstDefinition.key,
      ]);
    }
  });

  it('supports lookup by key and by group', () => {
    expect(coreVariableRegistry.get('recipient.full_name')?.label).toBe(
      'Recipient Full Name',
    );

    expect(
      coreVariableRegistry
        .listByGroup('donation')
        .map((definition) => definition.key),
    ).toEqual([
      'donation.amount',
      'donation.date',
      'donation.designation',
      'donation.goods_services_value',
      'donation.id',
      'donation.method',
      'donation.receipt_number',
    ]);
  });

  it('identifies required variables for a document category', () => {
    const requiredReceiptKeys = coreVariableRegistry
      .listRequired('donation_receipt')
      .map((definition) => definition.key);

    expect(requiredReceiptKeys).toContain('organization.name');
    expect(requiredReceiptKeys).toContain('recipient.full_name');
    expect(requiredReceiptKeys).toContain('donation.amount');
    expect(requiredReceiptKeys).not.toContain('missionary.support_goal');
  });

  it('generates deterministic sample data for Phase 13 fixture categories', () => {
    for (const category of sampleFixtureCategories) {
      const sampleData = coreVariableRegistry.createSampleData(category);

      expect(sampleData).toMatchSnapshot(category);
    }
  });

  it('detects unknown variable keys with sorted unique output', () => {
    expect(
      coreVariableRegistry.detectUnknownKeys([
        'recipient.full_name',
        'unknown.z',
        'unknown.a',
        'unknown.z',
        'donation.amount',
      ]),
    ).toEqual(['unknown.a', 'unknown.z']);
  });

  it('keeps the schema package free of React dependencies', () => {
    const packageJsonUrl = new URL('../package.json', import.meta.url);
    const packageJson = JSON.parse(readFileSync(packageJsonUrl, 'utf8')) as {
      readonly dependencies?: Readonly<Record<string, string>>;
      readonly devDependencies?: Readonly<Record<string, string>>;
      readonly peerDependencies?: Readonly<Record<string, string>>;
    };

    expect(Object.keys(packageJson.dependencies ?? {})).not.toContain('react');
    expect(Object.keys(packageJson.peerDependencies ?? {})).not.toContain(
      'react',
    );
  });
});
