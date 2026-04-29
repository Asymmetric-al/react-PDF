import {
  coreVariableRegistry,
  createVariableResolver,
  type FallbackBehavior,
  type RegistryVariableDefinition,
  type ResolvedVariableValue,
  type VariableDataContext,
  type VariableRegistry,
  type VariableResolutionDiagnostic,
  type VariableResolverOptions,
} from '@asym/pdf-template-schema';
import { mergeAttributes, Node } from '@tiptap/core';

export type VariableChipFallback = string | FallbackBehavior;

export interface InsertVariableChipInput {
  readonly key: string;
  readonly formatter?: string;
  readonly fallback?: VariableChipFallback;
  readonly label?: string;
}

export interface VariableChipAttributes extends InsertVariableChipInput {}

export interface VariableChipPreviewInput
  extends InsertVariableChipInput,
    VariableResolverOptions {
  readonly context?: VariableDataContext;
}

export interface VariableChipPreviewResult {
  readonly key: string;
  readonly displayValue: string;
  readonly status: ResolvedVariableValue['status'];
  readonly diagnostics: readonly VariableResolutionDiagnostic[];
  readonly definition?: RegistryVariableDefinition;
}

export interface VariableChipOptions {
  readonly registry: VariableRegistry;
  readonly previewContext?: VariableDataContext;
}

interface VariableChipAttributeSource {
  readonly fallback?: unknown;
  readonly formatter?: unknown;
  readonly key?: unknown;
  readonly label?: unknown;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variableChip: {
      insertVariableChip: (input: InsertVariableChipInput) => ReturnType;
    };
  }
}

const variableChipDataAttribute = 'data-asym-variable-chip';

export function createVariableChipExtension(
  options: Partial<VariableChipOptions> = {},
) {
  return Node.create<VariableChipOptions>({
    name: 'variable',

    inline: true,
    group: 'inline',
    atom: true,
    selectable: true,

    addOptions() {
      return {
        previewContext: options.previewContext,
        registry: options.registry ?? coreVariableRegistry,
      };
    },

    addAttributes() {
      return {
        fallback: {
          default: null,
          parseHTML: (element) =>
            readFallback(element.getAttribute('data-variable-fallback')),
        },
        formatter: {
          default: null,
          parseHTML: (element) =>
            element.getAttribute('data-variable-formatter'),
        },
        key: {
          default: '',
          parseHTML: (element) => element.getAttribute('data-variable-key'),
        },
        label: {
          default: null,
          parseHTML: (element) => element.getAttribute('data-variable-label'),
        },
      };
    },

    parseHTML() {
      return [{ tag: `span[${variableChipDataAttribute}]` }];
    },

    renderHTML({ HTMLAttributes }) {
      const attrs = normalizeVariableChipAttributes(HTMLAttributes);
      const preview = getVariableChipPreview({
        ...attrs,
        context: this.options.previewContext,
        registry: this.options.registry,
      });

      return [
        'span',
        mergeAttributes({
          [variableChipDataAttribute]: 'true',
          'data-variable-key': attrs.key,
          ...(attrs.formatter
            ? { 'data-variable-formatter': attrs.formatter }
            : {}),
          ...(attrs.fallback !== undefined
            ? { 'data-variable-fallback': stringifyFallback(attrs.fallback) }
            : {}),
          ...(attrs.label ? { 'data-variable-label': attrs.label } : {}),
          class: resolveVariableChipClassName(preview),
          contenteditable: 'false',
        }),
        preview.displayValue,
      ];
    },

    addCommands() {
      return {
        insertVariableChip:
          (input) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: normalizeVariableChipAttributes(input),
            });
          },
      };
    },
  });
}

export const VariableChip = createVariableChipExtension();

export function getVariableChipPreview(
  input: VariableChipPreviewInput,
): VariableChipPreviewResult {
  const registry = input.registry ?? coreVariableRegistry;
  const context = input.context ?? registry.createSampleData();
  const resolver = createVariableResolver({
    ...input,
    registry,
  });
  const resolvedValue = resolver.resolve(
    {
      fallback: normalizeFallback(input.fallback),
      formatter: input.formatter,
      key: input.key,
    },
    context,
  );

  return {
    definition: resolvedValue.definition,
    diagnostics: resolvedValue.diagnostics,
    displayValue: resolveDisplayValue(input, resolvedValue),
    key: input.key,
    status: resolvedValue.status,
  };
}

export function isKnownVariableChipKey(
  key: string,
  registry: VariableRegistry = coreVariableRegistry,
): boolean {
  return registry.get(key) !== undefined;
}

function normalizeVariableChipAttributes(
  input: VariableChipAttributeSource,
): VariableChipAttributes {
  return {
    fallback: readFallback(input.fallback),
    formatter: readOptionalString(input.formatter),
    key: readOptionalString(input.key) ?? '',
    label: readOptionalString(input.label),
  };
}

function resolveDisplayValue(
  input: VariableChipPreviewInput,
  resolvedValue: ResolvedVariableValue,
): string {
  if (resolvedValue.formattedValue) {
    return resolvedValue.formattedValue;
  }

  if (resolvedValue.status === 'unknown_variable') {
    return 'Unknown variable';
  }

  return input.label ?? resolvedValue.definition?.label ?? resolvedValue.key;
}

function resolveVariableChipClassName(
  preview: VariableChipPreviewResult,
): string {
  const statusClass =
    preview.diagnostics.length > 0
      ? 'asym-variable-chip--warning'
      : 'asym-variable-chip--valid';

  return `asym-variable-chip ${statusClass}`;
}

function readFallback(value: unknown): VariableChipFallback | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return parseFallbackBehavior(value) ?? value;
  }

  if (isFallbackBehavior(value)) {
    return value;
  }

  return undefined;
}

function normalizeFallback(
  fallback: VariableChipFallback | undefined,
): FallbackBehavior | undefined {
  if (typeof fallback === 'string') {
    return { mode: 'use_value', value: fallback };
  }

  return fallback;
}

function stringifyFallback(fallback: VariableChipFallback): string {
  return typeof fallback === 'string' ? fallback : JSON.stringify(fallback);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseFallbackBehavior(value: string): FallbackBehavior | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isFallbackBehavior(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isFallbackBehavior(value: unknown): value is FallbackBehavior {
  return (
    typeof value === 'object' &&
    value !== null &&
    'mode' in value &&
    typeof value.mode === 'string'
  );
}
