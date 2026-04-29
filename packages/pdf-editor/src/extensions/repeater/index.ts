import {
  type RepeaterBinding,
  type RepeaterBindingInput,
  RepeaterBindingSchema,
  type RepeaterResolutionDiagnostic,
  resolveRepeaterItems,
  type VariableDataContext,
} from '@asym/pdf-template-schema';
import {
  type JSONContent,
  mergeAttributes,
  Node,
  type RawCommands,
} from '@tiptap/core';

export interface InsertRepeaterSectionInput {
  readonly binding: RepeaterBindingInput;
  readonly content?: JSONContent | readonly JSONContent[];
}

export interface RepeaterSectionAttributes {
  readonly binding?: RepeaterBinding;
}

export type RepeaterSectionPreviewDiagnostic =
  | RepeaterResolutionDiagnostic
  | {
      readonly code: 'missing_repeater_context';
      readonly severity: 'warning';
      readonly message: string;
      readonly bindingId: string;
      readonly sourcePath: string;
      readonly itemAlias: string;
    };

export interface RepeaterSectionPreviewInput {
  readonly binding: RepeaterBindingInput;
  readonly context?: VariableDataContext;
}

export interface RepeaterSectionPreviewResult {
  readonly visible: boolean;
  readonly itemCount: number;
  readonly diagnostics: readonly RepeaterSectionPreviewDiagnostic[];
}

export interface RepeaterSectionOptions {
  readonly previewContext?: VariableDataContext;
}

interface RepeaterSectionAttributeSource {
  readonly binding?: unknown;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    repeaterSection: {
      insertRepeaterSection: (input: InsertRepeaterSectionInput) => ReturnType;
    };
  }
}

const repeaterDataAttribute = 'data-asym-repeater';

export function createRepeaterSectionExtension(
  options: Partial<RepeaterSectionOptions> = {},
) {
  return Node.create<RepeaterSectionOptions>({
    name: 'repeater',

    group: 'block',
    content: 'block+',
    defining: true,
    isolating: true,

    addOptions() {
      return {
        previewContext: options.previewContext,
      };
    },

    addAttributes() {
      return {
        binding: {
          default: null,
          parseHTML: (element) => readBindingFromElement(element),
        },
      };
    },

    parseHTML() {
      return [{ tag: `section[${repeaterDataAttribute}]` }];
    },

    renderHTML({ HTMLAttributes }) {
      const attrs = normalizeRepeaterSectionAttributes(HTMLAttributes);
      const preview = attrs.binding
        ? getRepeaterSectionPreview({
            binding: attrs.binding,
            context: this.options.previewContext,
          })
        : undefined;

      return [
        'section',
        mergeAttributes({
          [repeaterDataAttribute]: 'true',
          ...(attrs.binding
            ? {
                'data-repeater-binding': stringifyBinding(attrs.binding),
                'data-repeater-binding-id': attrs.binding.id,
                'data-repeater-item-alias': attrs.binding.itemAlias,
                'data-repeater-source-path': attrs.binding.sourcePath,
              }
            : {}),
          'data-repeater-item-count': String(preview?.itemCount ?? 0),
          class: resolveRepeaterSectionClassName(preview),
        }),
        0,
      ];
    },

    addCommands() {
      return {
        insertRepeaterSection:
          (input) =>
          ({ commands }) => {
            if (!isValidRepeaterBinding(input.binding)) {
              return false;
            }

            return commands.insertContent({
              attrs: {
                binding: input.binding,
              },
              content: normalizeInsertedContent(input.content),
              type: this.name,
            });
          },
      } satisfies Partial<RawCommands>;
    },
  });
}

export const RepeaterSection = createRepeaterSectionExtension();

export function getRepeaterSectionPreview(
  input: RepeaterSectionPreviewInput,
): RepeaterSectionPreviewResult {
  if (!input.context) {
    return {
      diagnostics: [
        {
          bindingId: input.binding.id,
          code: 'missing_repeater_context',
          itemAlias: input.binding.itemAlias,
          message:
            'Phase 17 repeater preview keeps content visible because no data context was provided.',
          severity: 'warning',
          sourcePath: input.binding.sourcePath,
        },
      ],
      itemCount: 0,
      visible: true,
    };
  }

  const result = resolveRepeaterItems({
    binding: input.binding,
    context: input.context,
  });

  return {
    diagnostics: result.diagnostics,
    itemCount: result.items.length,
    visible: true,
  };
}

export function isValidRepeaterBinding(
  value: unknown,
): value is RepeaterBinding {
  return RepeaterBindingSchema.safeParse(value).success;
}

function normalizeRepeaterSectionAttributes(
  input: RepeaterSectionAttributeSource,
): RepeaterSectionAttributes {
  return {
    binding: readBinding(input.binding),
  };
}

function normalizeInsertedContent(
  content: JSONContent | readonly JSONContent[] | undefined,
): JSONContent[] {
  if (Array.isArray(content)) {
    return [...content];
  }

  if (content) {
    return [content];
  }

  return [
    {
      content: [],
      type: 'paragraph',
    },
  ];
}

function readBindingFromElement(
  element: HTMLElement,
): RepeaterBinding | undefined {
  const structuredBinding = readBinding(
    element.getAttribute('data-repeater-binding'),
  );

  if (structuredBinding) {
    return structuredBinding;
  }

  return readBinding({
    id: element.getAttribute('data-repeater-binding-id'),
    itemAlias: element.getAttribute('data-repeater-item-alias'),
    sourcePath: element.getAttribute('data-repeater-source-path'),
  });
}

function readBinding(value: unknown): RepeaterBinding | undefined {
  const parsedValue =
    typeof value === 'string' ? parseBindingString(value) : value;
  const result = RepeaterBindingSchema.safeParse(parsedValue);

  return result.success ? result.data : undefined;
}

function parseBindingString(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function stringifyBinding(binding: RepeaterBinding): string {
  return stableStringify(binding) ?? JSON.stringify(binding);
}

function resolveRepeaterSectionClassName(
  preview: RepeaterSectionPreviewResult | undefined,
): string {
  const statusClass = preview?.diagnostics.length
    ? 'asym-repeater-section--warning'
    : 'asym-repeater-section--valid';

  return `asym-repeater-section ${statusClass}`;
}

function stableStringify(value: unknown): string | undefined {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? JSON.stringify(value) : undefined;
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item));

    return items.every((item) => item !== undefined)
      ? `[${items.join(',')}]`
      : undefined;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey),
    );
    const items = entries.map(([key, item]) => {
      const serializedValue = stableStringify(item);

      return serializedValue === undefined
        ? undefined
        : `${JSON.stringify(key)}:${serializedValue}`;
    });

    return items.every((item) => item !== undefined)
      ? `{${items.join(',')}}`
      : undefined;
  }

  return undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
