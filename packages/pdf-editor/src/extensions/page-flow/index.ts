import {
  type DocumentPageBreakAttributes,
  type DocumentPageBreakAttributesInput,
  DocumentPageBreakAttributesSchema,
  type DocumentPageBreakNode,
  DocumentPageBreakNodeSchema,
} from '@asym/pdf-template-schema';
import { mergeAttributes, Node, type RawCommands } from '@tiptap/core';

export interface InsertPageBreakInput
  extends DocumentPageBreakAttributesInput {}

export interface PageBreakAttributes extends DocumentPageBreakAttributes {}

export type PageBreakPreviewStatus = 'invalid_page_break' | 'valid';

export type PageBreakPreviewDiagnostic = {
  readonly code: 'invalid_page_break';
  readonly severity: 'error';
  readonly message: string;
  readonly validationError: string;
};

export interface PageBreakPreviewInput
  extends DocumentPageBreakAttributesInput {}

export interface PageBreakPreviewResult {
  readonly status: PageBreakPreviewStatus;
  readonly diagnostics: readonly PageBreakPreviewDiagnostic[];
  readonly attrs?: PageBreakAttributes;
}

export type PageBreakOptions = Record<string, never>;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: (input?: InsertPageBreakInput) => ReturnType;
    };
  }
}

const pageBreakAttribute = 'data-asym-page-break';

export function createPageBreakExtension() {
  return Node.create<PageBreakOptions>({
    name: 'pageBreak',

    atom: true,
    defining: true,
    group: 'block',
    isolating: true,
    selectable: true,

    addAttributes() {
      return {
        id: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-page-break-id')),
        },
        label: {
          default: null,
          parseHTML: (element) =>
            readOptionalString(element.getAttribute('data-page-break-label')),
        },
      };
    },

    parseHTML() {
      // Preserve the specific page-break contract before generic horizontal rules.
      return [{ tag: `hr[${pageBreakAttribute}]`, priority: 100 }];
    },

    renderHTML({ HTMLAttributes }) {
      const attrs = normalizePageBreakAttributes(HTMLAttributes) ?? {};
      const preview = getPageBreakPreview(attrs);

      return [
        'hr',
        mergeAttributes({
          [pageBreakAttribute]: 'true',
          ...(attrs.id ? { 'data-page-break-id': attrs.id } : {}),
          ...(attrs.label ? { 'data-page-break-label': attrs.label } : {}),
          'data-page-break-preview-status': preview.status,
          class: resolvePageBreakClassName(preview),
          contenteditable: 'false',
        }),
      ];
    },

    addCommands() {
      return {
        insertPageBreak:
          (input = {}) =>
          ({ commands }) => {
            const attrs = normalizePageBreakAttributes(input);

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

export const PageBreakNode = createPageBreakExtension();

export function getPageBreakPreview(
  input: PageBreakPreviewInput = {},
): PageBreakPreviewResult {
  const result = DocumentPageBreakAttributesSchema.safeParse(input);

  if (!result.success) {
    return {
      diagnostics: [
        {
          code: 'invalid_page_break',
          message:
            'Phase 25 page break preview requires a valid page break contract.',
          severity: 'error',
          validationError: result.error.message,
        },
      ],
      status: 'invalid_page_break',
    };
  }

  return {
    attrs: result.data,
    diagnostics: [],
    status: 'valid',
  };
}

export function isValidDocumentPageBreakNode(
  value: unknown,
): value is DocumentPageBreakNode {
  return DocumentPageBreakNodeSchema.safeParse(value).success;
}

function normalizePageBreakAttributes(
  input: unknown,
): PageBreakAttributes | undefined {
  const source = isRecord(input)
    ? {
        ...(readOptionalString(input.id)
          ? { id: readOptionalString(input.id) }
          : {}),
        ...(readOptionalString(input.label)
          ? { label: readOptionalString(input.label) }
          : {}),
      }
    : {};
  const result = DocumentPageBreakAttributesSchema.safeParse(source);

  return result.success ? result.data : undefined;
}

function resolvePageBreakClassName(preview: PageBreakPreviewResult): string {
  const statusClass =
    preview.status === 'valid'
      ? 'asym-page-break--valid'
      : 'asym-page-break--invalid';

  return `asym-page-break ${statusClass}`;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
