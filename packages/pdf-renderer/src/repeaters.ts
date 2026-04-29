import {
  type RepeaterBindingInput,
  type ResolvedRepeaterItem,
  resolveRepeaterItems,
  type VariableDataContext,
} from '@asym/pdf-template-schema';
import type { PdfDocumentRenderWarning } from './compose-pdf-document-html';

export interface ResolvePdfDocumentRepeaterItemsInput {
  readonly binding: RepeaterBindingInput;
  readonly context: VariableDataContext;
  readonly path: readonly string[];
  readonly nodeType?: string;
}

export interface ResolvePdfDocumentRepeaterItemsResult {
  readonly items: readonly ResolvedRepeaterItem[];
  readonly warnings: readonly PdfDocumentRenderWarning[];
}

export function resolvePdfDocumentRepeaterItems(
  input: ResolvePdfDocumentRepeaterItemsInput,
): ResolvePdfDocumentRepeaterItemsResult {
  const result = resolveRepeaterItems({
    binding: input.binding,
    context: input.context,
  });

  return {
    items: result.items,
    warnings: result.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      details: {
        bindingId: diagnostic.bindingId,
        itemAlias: diagnostic.itemAlias,
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
