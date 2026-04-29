import {
  type ConditionalEvaluationDiagnostic,
  type ConditionalRule,
  ConditionalRuleSchema,
  evaluateConditionalRule,
  type VariableDataContext,
} from '@asym/pdf-template-schema';
import {
  type JSONContent,
  mergeAttributes,
  Node,
  type RawCommands,
} from '@tiptap/core';

export interface InsertConditionalSectionInput {
  readonly rule: ConditionalRule;
  readonly content?: JSONContent | readonly JSONContent[];
}

export interface ConditionalSectionAttributes {
  readonly rule?: ConditionalRule;
}

export type ConditionalSectionPreviewDiagnostic =
  | ConditionalEvaluationDiagnostic
  | {
      readonly code: 'missing_condition_context';
      readonly severity: 'warning';
      readonly message: string;
      readonly fieldPath: string;
      readonly operator: ConditionalRule['operator'];
    };

export interface ConditionalSectionPreviewInput {
  readonly rule: ConditionalRule;
  readonly context?: VariableDataContext;
}

export interface ConditionalSectionPreviewResult {
  readonly visible: boolean;
  readonly diagnostics: readonly ConditionalSectionPreviewDiagnostic[];
}

export interface ConditionalSectionOptions {
  readonly previewContext?: VariableDataContext;
}

interface ConditionalSectionAttributeSource {
  readonly rule?: unknown;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    conditionalSection: {
      insertConditionalSection: (
        input: InsertConditionalSectionInput,
      ) => ReturnType;
    };
  }
}

const conditionalSectionDataAttribute = 'data-asym-conditional-section';

export function createConditionalSectionExtension(
  options: Partial<ConditionalSectionOptions> = {},
) {
  return Node.create<ConditionalSectionOptions>({
    name: 'conditionalSection',

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
        rule: {
          default: null,
          parseHTML: (element) => readRuleFromElement(element),
        },
      };
    },

    parseHTML() {
      return [{ tag: `section[${conditionalSectionDataAttribute}]` }];
    },

    renderHTML({ HTMLAttributes }) {
      const attrs = normalizeConditionalSectionAttributes(HTMLAttributes);
      const preview = attrs.rule
        ? getConditionalSectionPreview({
            context: this.options.previewContext,
            rule: attrs.rule,
          })
        : undefined;

      return [
        'section',
        mergeAttributes({
          [conditionalSectionDataAttribute]: 'true',
          ...(attrs.rule
            ? {
                'data-condition-field-path': attrs.rule.fieldPath,
                'data-condition-operator': attrs.rule.operator,
                'data-condition-rule': stringifyRule(attrs.rule),
              }
            : {}),
          'data-condition-visible': preview?.visible ? 'true' : 'false',
          class: resolveConditionalSectionClassName(preview),
        }),
        0,
      ];
    },

    addCommands() {
      return {
        insertConditionalSection:
          (input) =>
          ({ commands }) => {
            if (!isValidConditionalRule(input.rule)) {
              return false;
            }

            return commands.insertContent({
              type: this.name,
              attrs: {
                rule: input.rule,
              },
              content: normalizeInsertedContent(input.content),
            });
          },
      } satisfies Partial<RawCommands>;
    },
  });
}

export const ConditionalSection = createConditionalSectionExtension();

export function getConditionalSectionPreview(
  input: ConditionalSectionPreviewInput,
): ConditionalSectionPreviewResult {
  if (!input.context) {
    return {
      diagnostics: [
        {
          code: 'missing_condition_context',
          fieldPath: input.rule.fieldPath,
          message:
            'Phase 16 conditional section preview is visible because no data context was provided.',
          operator: input.rule.operator,
          severity: 'warning',
        },
      ],
      visible: true,
    };
  }

  const result = evaluateConditionalRule({
    context: input.context,
    rule: input.rule,
  });

  return {
    diagnostics: result.diagnostics,
    visible: result.matched,
  };
}

export function isValidConditionalRule(
  value: unknown,
): value is ConditionalRule {
  return ConditionalRuleSchema.safeParse(value).success;
}

function normalizeConditionalSectionAttributes(
  input: ConditionalSectionAttributeSource,
): ConditionalSectionAttributes {
  return {
    rule: readRule(input.rule),
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
      type: 'paragraph',
      content: [],
    },
  ];
}

function readRuleFromElement(
  element: HTMLElement,
): ConditionalRule | undefined {
  const structuredRule = readRule(element.getAttribute('data-condition-rule'));

  if (structuredRule) {
    return structuredRule;
  }

  const fieldPath = element.getAttribute('data-condition-field-path');
  const operator = element.getAttribute('data-condition-operator');

  return readRule({
    fieldPath,
    operator,
  });
}

function readRule(value: unknown): ConditionalRule | undefined {
  const parsedValue =
    typeof value === 'string' ? parseRuleString(value) : value;
  const result = ConditionalRuleSchema.safeParse(parsedValue);

  return result.success ? result.data : undefined;
}

function parseRuleString(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function stringifyRule(rule: ConditionalRule): string {
  return stableStringify(rule) ?? JSON.stringify(rule);
}

function resolveConditionalSectionClassName(
  preview: ConditionalSectionPreviewResult | undefined,
): string {
  const statusClass = preview?.diagnostics.length
    ? 'asym-conditional-section--warning'
    : 'asym-conditional-section--valid';

  return `asym-conditional-section ${statusClass}`;
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
