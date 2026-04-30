import {
  resolveTableRows,
  type TableBinding,
  type TableBindingInput,
  TableBindingSchema,
  type TableResolutionDiagnostic,
  type VariableDataContext,
} from '@asym/pdf-template-schema';
import { mergeAttributes, Node, type RawCommands } from '@tiptap/core';

export interface InsertDataTableInput {
  readonly binding?: TableBindingInput;
  readonly bindingId?: string;
}

export interface DataTableAttributes {
  readonly binding?: TableBinding;
  readonly bindingId?: string;
}

export type DataTablePreviewDiagnostic =
  | TableResolutionDiagnostic
  | {
      readonly code: 'missing_table_binding';
      readonly severity: 'error';
      readonly message: string;
      readonly bindingId: string;
      readonly sourcePath: string;
    };

export type DataTablePreviewStatus =
  | 'invalid_binding'
  | 'missing_binding'
  | 'valid';

export interface DataTablePreviewInput {
  readonly binding?: TableBindingInput;
  readonly bindingId?: string;
  readonly context?: VariableDataContext;
}

export interface DataTablePreviewResult {
  readonly status: DataTablePreviewStatus;
  readonly rowCount: number;
  readonly diagnostics: readonly DataTablePreviewDiagnostic[];
  readonly binding?: TableBinding;
  readonly bindingId?: string;
}

export interface DataTableOptions {
  readonly previewContext?: VariableDataContext;
}

interface DataTableAttributeSource {
  readonly binding?: unknown;
  readonly bindingId?: unknown;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dataTable: {
      insertDataTable: (input: InsertDataTableInput) => ReturnType;
    };
  }
}

const dataTableAttribute = 'data-asym-data-table';

export function createDataTableExtension(
  options: Partial<DataTableOptions> = {},
) {
  return Node.create<DataTableOptions>({
    name: 'dataTable',

    atom: true,
    defining: true,
    group: 'block',
    isolating: true,
    selectable: true,

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
        bindingId: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-table-binding-id')),
        },
      };
    },

    parseHTML() {
      return [{ tag: `section[${dataTableAttribute}]` }];
    },

    renderHTML({ HTMLAttributes }) {
      const attrs = normalizeDataTableAttributes(HTMLAttributes);
      const preview = getDataTablePreview({
        binding: attrs.binding,
        bindingId: attrs.bindingId,
        context: this.options.previewContext,
      });
      const binding = attrs.binding;

      return [
        'section',
        mergeAttributes({
          [dataTableAttribute]: 'true',
          ...(binding
            ? {
                'data-table-binding': stringifyBinding(binding),
                'data-table-binding-id': binding.id,
                'data-table-column-count': String(binding.columns.length),
                'data-table-source-path': binding.sourcePath,
              }
            : {}),
          ...(!binding && attrs.bindingId
            ? {
                'data-table-binding-id': attrs.bindingId,
              }
            : {}),
          'data-table-preview-status': preview.status,
          class: resolveDataTableClassName(preview),
          contenteditable: 'false',
        }),
        [
          'span',
          { class: 'asym-data-table-label' },
          binding ? 'Financial data table' : 'Financial data table binding',
        ],
      ];
    },

    addCommands() {
      return {
        insertDataTable:
          (input) =>
          ({ commands }) => {
            const attrs = normalizeInsertedAttributes(input);

            if (!attrs) {
              return false;
            }

            return commands.insertContent({
              attrs,
              type: this.name,
            });
          },
      } satisfies Partial<RawCommands>;
    },
  });
}

export const DataTableBlock = createDataTableExtension();

export function getDataTablePreview(
  input: DataTablePreviewInput,
): DataTablePreviewResult {
  if (!input.binding) {
    return {
      bindingId: input.bindingId,
      diagnostics: [
        {
          bindingId: input.bindingId ?? '',
          code: 'missing_table_binding',
          message:
            'Phase 18 data table preview requires a table binding or binding id.',
          severity: 'error',
          sourcePath: '',
        },
      ],
      rowCount: 0,
      status: 'missing_binding',
    };
  }

  const parseResult = TableBindingSchema.safeParse(input.binding);

  if (!parseResult.success) {
    const result = resolveTableRows({
      binding: input.binding,
      context: input.context ?? {},
    });

    return {
      bindingId: input.bindingId,
      diagnostics: result.diagnostics,
      rowCount: 0,
      status: 'invalid_binding',
    };
  }

  if (!input.context) {
    return {
      binding: parseResult.data,
      diagnostics: [],
      rowCount: 0,
      status: 'valid',
    };
  }

  const result = resolveTableRows({
    binding: parseResult.data,
    context: input.context,
  });

  return {
    binding: parseResult.data,
    diagnostics: result.diagnostics,
    rowCount: result.rows.length,
    status: result.diagnostics.some(
      (diagnostic) => diagnostic.code === 'invalid_table_binding',
    )
      ? 'invalid_binding'
      : 'valid',
  };
}

export function isValidTableBinding(value: unknown): value is TableBinding {
  return TableBindingSchema.safeParse(value).success;
}

function normalizeDataTableAttributes(
  input: DataTableAttributeSource,
): DataTableAttributes {
  return {
    binding: readBinding(input.binding),
    bindingId: readOptionalString(input.bindingId),
  };
}

function normalizeInsertedAttributes(
  input: InsertDataTableInput,
): DataTableAttributes | undefined {
  const binding = readBinding(input.binding);

  if (binding) {
    return {
      binding,
      bindingId: readOptionalString(input.bindingId),
    };
  }

  const bindingId = readOptionalString(input.bindingId);

  return bindingId ? { bindingId } : undefined;
}

function readBindingFromElement(
  element: HTMLElement,
): TableBinding | undefined {
  const structuredBinding = readBinding(
    element.getAttribute('data-table-binding'),
  );

  if (structuredBinding) {
    return structuredBinding;
  }

  return undefined;
}

function readBinding(value: unknown): TableBinding | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsedValue =
    typeof value === 'string' ? parseBindingString(value) : value;
  const result = TableBindingSchema.safeParse(parsedValue);

  return result.success ? result.data : undefined;
}

function parseBindingString(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function stringifyBinding(binding: TableBinding): string {
  return stableStringify(binding) ?? JSON.stringify(binding);
}

function resolveDataTableClassName(preview: DataTablePreviewResult): string {
  const statusClass =
    preview.diagnostics.length > 0
      ? 'asym-data-table--warning'
      : 'asym-data-table--valid';

  return `asym-data-table ${statusClass}`;
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
      compareCodeUnitOrder(leftKey, rightKey),
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

function compareCodeUnitOrder(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
