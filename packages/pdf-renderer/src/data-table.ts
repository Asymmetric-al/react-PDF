import {
  type ResolvedTableRow,
  type ResolveTableRowsInput,
  resolveTableRows,
  type TableBinding,
} from '@asym/pdf-template-schema';
import type { PdfDocumentRenderWarning } from './compose-pdf-document-html';

export interface ResolvePdfDocumentTableRowsInput
  extends ResolveTableRowsInput {
  readonly path: readonly string[];
  readonly nodeType?: string;
}

export interface ResolvePdfDocumentTableRowsResult {
  readonly binding?: TableBinding;
  readonly rows: readonly ResolvedTableRow[];
  readonly warnings: readonly PdfDocumentRenderWarning[];
}

export function resolvePdfDocumentTableRows(
  input: ResolvePdfDocumentTableRowsInput,
): ResolvePdfDocumentTableRowsResult {
  const result = resolveTableRows(input);

  return {
    binding: result.binding,
    rows: result.rows,
    warnings: result.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      details: {
        bindingId: diagnostic.bindingId,
        columnKey: diagnostic.columnKey,
        sourceIndex: diagnostic.sourceIndex,
        sourcePath: diagnostic.sourcePath,
        ...diagnostic.details,
      },
      message: diagnostic.message,
      nodeType: input.nodeType,
      path: input.path,
      severity: diagnostic.severity,
    })),
  };
}
