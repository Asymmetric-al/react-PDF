import {
  type ConditionalEvaluationDiagnostic,
  type ConditionalRule,
  evaluateConditionalRule,
  type VariableDataContext,
} from '@asym/pdf-template-schema';
import type { PdfDocumentRenderWarning } from './compose-pdf-document-html';

export interface EvaluatePdfDocumentConditionInput {
  readonly rule: ConditionalRule;
  readonly context?: VariableDataContext;
  readonly path: readonly string[];
  readonly nodeType?: string;
}

export interface PdfDocumentConditionEvaluation {
  readonly visible: boolean;
  readonly warnings: readonly PdfDocumentRenderWarning[];
}

export function evaluatePdfDocumentCondition(
  input: EvaluatePdfDocumentConditionInput,
): PdfDocumentConditionEvaluation {
  if (!input.context) {
    return {
      visible: true,
      warnings: [
        {
          code: 'missing_condition_context',
          message:
            'Phase 16 conditional section rendered content because no data context was provided.',
          nodeType: input.nodeType,
          path: input.path,
          severity: 'warning',
        },
      ],
    };
  }

  const evaluation = evaluateConditionalRule({
    context: input.context,
    rule: input.rule,
  });
  const warnings = evaluation.diagnostics.map((diagnostic) =>
    toRenderWarning(diagnostic, input),
  );

  return {
    visible: warnings.length > 0 ? true : evaluation.matched,
    warnings,
  };
}

function toRenderWarning(
  diagnostic: ConditionalEvaluationDiagnostic,
  input: EvaluatePdfDocumentConditionInput,
): PdfDocumentRenderWarning {
  return {
    code:
      diagnostic.severity === 'error'
        ? 'condition_evaluation_error'
        : 'condition_evaluation_warning',
    details: {
      conditionCode: diagnostic.code,
      fieldPath: diagnostic.fieldPath,
      operator: diagnostic.operator,
    },
    message: diagnostic.message,
    nodeType: input.nodeType,
    path: input.path,
    severity: diagnostic.severity,
  };
}
