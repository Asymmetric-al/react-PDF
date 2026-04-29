import {
  createScopedRepeaterContext,
  createVariableResolver,
  getValueAtDataPath,
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
      createScopedContextForVariable(input.context, variable),
    ),
  );

  return {
    diagnostics: values.flatMap((value) => value.diagnostics),
    values,
  };
}

function createScopedContextForVariable(
  context: VariableDataContext,
  variable: PdfDocumentVariableUsage,
): VariableDataContext {
  let scopedContext = context;

  for (const scope of variable.scopes ?? []) {
    const source = getValueAtDataPath(scopedContext, scope.sourcePath);

    if (!source.found || !Array.isArray(source.value)) {
      return scopedContext;
    }

    const itemValue = source.value[scope.sourceIndex];

    if (itemValue === undefined) {
      return scopedContext;
    }

    scopedContext = createScopedRepeaterContext({
      context: scopedContext,
      indexAlias: scope.indexAlias,
      itemAlias: scope.itemAlias,
      itemValue,
      renderedIndex: scope.renderedIndex,
    });
  }

  return scopedContext;
}
