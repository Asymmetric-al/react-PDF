import {
  createVariableResolver,
  type ResolvedVariableValue,
  type VariableDataContext,
  type VariableResolutionDiagnostic,
  type VariableResolverOptions,
} from '@asym/pdf-template-schema';
import type { PdfDocumentVariableUsage } from './compose-pdf-document-html';

export interface ResolvePdfDocumentVariablesInput
  extends VariableResolverOptions {
  readonly variables: readonly PdfDocumentVariableUsage[];
  readonly context: VariableDataContext;
}

export interface ResolvePdfDocumentVariablesResult {
  readonly values: readonly ResolvedVariableValue[];
  readonly diagnostics: readonly VariableResolutionDiagnostic[];
}

export function resolvePdfDocumentVariables(
  input: ResolvePdfDocumentVariablesInput,
): ResolvePdfDocumentVariablesResult {
  const resolver = createVariableResolver(input);
  const values = input.variables.map((variable) =>
    resolver.resolve(
      {
        fallback: variable.fallback,
        formatter: variable.formatter,
        key: variable.key,
      },
      input.context,
    ),
  );

  return {
    diagnostics: values.flatMap((value) => value.diagnostics),
    values,
  };
}
