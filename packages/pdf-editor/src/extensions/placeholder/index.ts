import {
  type DocumentPlaceholder,
  type DocumentPlaceholderInput,
  DocumentPlaceholderSchema,
} from '@asym/pdf-template-schema';
import { mergeAttributes, Node, type RawCommands } from '@tiptap/core';

export interface InsertDocumentPlaceholderInput {
  readonly placeholder?: DocumentPlaceholderInput;
  readonly placeholderId?: string;
}

export interface DocumentPlaceholderAttributes {
  readonly placeholder?: DocumentPlaceholder;
  readonly placeholderId?: string;
}

export type DocumentPlaceholderPreviewStatus =
  | 'invalid_placeholder'
  | 'missing_label'
  | 'missing_placeholder'
  | 'valid';

export type DocumentPlaceholderPreviewDiagnostic =
  | {
      readonly code: 'invalid_placeholder';
      readonly severity: 'error';
      readonly message: string;
      readonly validationError: string;
    }
  | {
      readonly code: 'missing_placeholder';
      readonly severity: 'error';
      readonly message: string;
      readonly placeholderId?: string;
    }
  | {
      readonly code: 'missing_placeholder_label';
      readonly severity: 'warning';
      readonly message: string;
      readonly placeholderId: string;
      readonly kind: DocumentPlaceholder['kind'];
    };

export interface DocumentPlaceholderPreviewInput {
  readonly placeholder?: DocumentPlaceholderInput;
  readonly placeholderId?: string;
}

export interface DocumentPlaceholderPreviewResult {
  readonly status: DocumentPlaceholderPreviewStatus;
  readonly diagnostics: readonly DocumentPlaceholderPreviewDiagnostic[];
  readonly placeholder?: DocumentPlaceholder;
  readonly placeholderId?: string;
}

export type DocumentPlaceholderOptions = Record<string, never>;

interface DocumentPlaceholderAttributeSource {
  readonly placeholder?: unknown;
  readonly placeholderId?: unknown;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentPlaceholder: {
      insertDocumentPlaceholder: (
        input: InsertDocumentPlaceholderInput,
      ) => ReturnType;
    };
  }
}

const placeholderAttribute = 'data-asym-document-placeholder';

export function createDocumentPlaceholderExtension() {
  return Node.create<DocumentPlaceholderOptions>({
    name: 'documentPlaceholder',

    atom: true,
    defining: true,
    group: 'block',
    isolating: true,
    selectable: true,

    addAttributes() {
      return {
        placeholder: {
          default: null,
          parseHTML: (element) => readPlaceholderFromElement(element),
        },
        placeholderId: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(
              element.getAttribute('data-placeholder-reference-id'),
            ),
        },
      };
    },

    parseHTML() {
      return [{ tag: `span[${placeholderAttribute}]` }];
    },

    renderHTML({ HTMLAttributes }) {
      const attrs = normalizeDocumentPlaceholderAttributes(HTMLAttributes);
      const preview = getDocumentPlaceholderPreview({
        placeholder: attrs.placeholder,
        placeholderId: attrs.placeholderId,
      });
      const placeholder = attrs.placeholder;
      const referenceId = placeholder?.id ?? attrs.placeholderId;

      return [
        'span',
        mergeAttributes({
          [placeholderAttribute]: 'true',
          ...(placeholder
            ? {
                'data-placeholder': stringifyPlaceholder(placeholder),
                'data-placeholder-id': placeholder.id,
                'data-placeholder-kind': placeholder.kind,
              }
            : {}),
          ...(!placeholder && attrs.placeholderId
            ? {
                'data-placeholder-reference-id': attrs.placeholderId,
              }
            : {}),
          ...(referenceId
            ? { 'data-placeholder-preview-id': referenceId }
            : {}),
          'data-placeholder-preview-status': preview.status,
          class: resolveDocumentPlaceholderClassName(preview),
          contenteditable: 'false',
        }),
        resolveDocumentPlaceholderPreviewLabel(preview),
      ];
    },

    addCommands() {
      return {
        insertDocumentPlaceholder:
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

export const DocumentPlaceholderNode = createDocumentPlaceholderExtension();

export function getDocumentPlaceholderPreview(
  input: DocumentPlaceholderPreviewInput,
): DocumentPlaceholderPreviewResult {
  const placeholder = readPlaceholder(input.placeholder);
  const placeholderId = readOptionalString(input.placeholderId);

  if (placeholder) {
    const diagnostics = createPlaceholderDiagnostics(placeholder);

    return {
      diagnostics,
      placeholder,
      placeholderId: placeholder.id,
      status: diagnostics.length > 0 ? 'missing_label' : 'valid',
    };
  }

  if (input.placeholder !== undefined && input.placeholder !== null) {
    const parseResult = DocumentPlaceholderSchema.safeParse(input.placeholder);

    return {
      diagnostics: [
        {
          code: 'invalid_placeholder',
          message:
            'Phase 24 document placeholder preview requires a valid placeholder contract.',
          severity: 'error',
          validationError: parseResult.success
            ? 'Unknown placeholder validation error.'
            : parseResult.error.message,
        },
      ],
      placeholderId,
      status: 'invalid_placeholder',
    };
  }

  if (placeholderId) {
    return {
      diagnostics: [],
      placeholderId,
      status: 'valid',
    };
  }

  return {
    diagnostics: [
      {
        code: 'missing_placeholder',
        message:
          'Phase 24 document placeholder preview requires a placeholder contract or placeholder id.',
        severity: 'error',
      },
    ],
    status: 'missing_placeholder',
  };
}

export function isValidDocumentPlaceholder(
  value: unknown,
): value is DocumentPlaceholder {
  return DocumentPlaceholderSchema.safeParse(value).success;
}

function normalizeDocumentPlaceholderAttributes(
  input: DocumentPlaceholderAttributeSource,
): DocumentPlaceholderAttributes {
  return {
    placeholder: readPlaceholder(input.placeholder),
    placeholderId: readOptionalString(input.placeholderId),
  };
}

function normalizeInsertedAttributes(
  input: InsertDocumentPlaceholderInput,
): DocumentPlaceholderAttributes | undefined {
  const placeholder = readPlaceholder(input.placeholder);

  if (placeholder) {
    return {
      placeholder,
      placeholderId: readOptionalString(input.placeholderId),
    };
  }

  if (input.placeholder !== undefined && input.placeholder !== null) {
    return undefined;
  }

  const placeholderId = readOptionalString(input.placeholderId);

  return placeholderId ? { placeholderId } : undefined;
}

function readPlaceholderFromElement(
  element: HTMLElement,
): DocumentPlaceholder | undefined {
  return readPlaceholder(element.getAttribute('data-placeholder'));
}

function readPlaceholder(value: unknown): DocumentPlaceholder | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsedValue =
    typeof value === 'string' ? parsePlaceholderString(value) : value;
  const result = DocumentPlaceholderSchema.safeParse(parsedValue);

  return result.success ? result.data : undefined;
}

function parsePlaceholderString(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function stringifyPlaceholder(placeholder: DocumentPlaceholder): string {
  return stableStringify(placeholder) ?? JSON.stringify(placeholder);
}

function createPlaceholderDiagnostics(
  placeholder: DocumentPlaceholder,
): readonly DocumentPlaceholderPreviewDiagnostic[] {
  if (placeholder.label) {
    return [];
  }

  return [
    {
      code: 'missing_placeholder_label',
      kind: placeholder.kind,
      message:
        'Phase 24 document placeholder should include a label for print output and future adapters.',
      placeholderId: placeholder.id,
      severity: 'warning',
    },
  ];
}

function resolveDocumentPlaceholderPreviewLabel(
  preview: DocumentPlaceholderPreviewResult,
): string {
  if (preview.placeholder?.label) {
    return preview.placeholder.label;
  }

  if (preview.placeholder) {
    return `${formatPlaceholderKind(preview.placeholder.kind)} placeholder`;
  }

  if (preview.placeholderId) {
    return preview.placeholderId;
  }

  return 'Document placeholder';
}

function resolveDocumentPlaceholderClassName(
  preview: DocumentPlaceholderPreviewResult,
): string {
  const statusClass =
    preview.diagnostics.length > 0
      ? 'asym-document-placeholder--warning'
      : 'asym-document-placeholder--valid';

  return `asym-document-placeholder ${statusClass}`;
}

function formatPlaceholderKind(kind: DocumentPlaceholder['kind']): string {
  return kind
    .replace(/_/g, ' ')
    .replace(/^\w/u, (character) => character.toUpperCase());
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
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

    return items.some((item) => item === undefined)
      ? undefined
      : `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => {
        const serializedValue = stableStringify(entryValue);

        return serializedValue === undefined
          ? undefined
          : `${JSON.stringify(key)}:${serializedValue}`;
      })
      .filter((entry): entry is string => entry !== undefined)
      .sort();

    return `{${entries.join(',')}}`;
  }

  return undefined;
}
