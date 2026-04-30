import type { ConditionalRule } from './bindings';
import { parseDeterministicIsoDate } from './dates';
import type { JsonValue } from './primitives';
import {
  getValueAtDataPath,
  type VariableDataContext,
} from './variable-resolution';

export type ConditionalEvaluationDiagnosticCode =
  | 'invalid_condition_value'
  | 'missing_condition_field';

export type ConditionalEvaluationDiagnosticSeverity = 'error' | 'warning';

export interface ConditionalEvaluationDiagnostic {
  readonly code: ConditionalEvaluationDiagnosticCode;
  readonly severity: ConditionalEvaluationDiagnosticSeverity;
  readonly message: string;
  readonly fieldPath: string;
  readonly operator: ConditionalRule['operator'];
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface EvaluateConditionalRuleInput {
  readonly rule: ConditionalRule;
  readonly context: VariableDataContext;
}

export interface ConditionalRuleEvaluationResult {
  readonly fieldPath: string;
  readonly operator: ConditionalRule['operator'];
  readonly matched: boolean;
  readonly actualValue?: unknown;
  readonly expectedValue?: JsonValue;
  readonly diagnostics: readonly ConditionalEvaluationDiagnostic[];
}

export interface EvaluateConditionalRulesInput {
  readonly rules: readonly ConditionalRule[];
  readonly context: VariableDataContext;
}

export interface ConditionalRulesEvaluationResult {
  readonly matched: boolean;
  readonly results: readonly ConditionalRuleEvaluationResult[];
  readonly diagnostics: readonly ConditionalEvaluationDiagnostic[];
}

type ComparableValue =
  | { readonly kind: 'date'; readonly value: number }
  | { readonly kind: 'number'; readonly value: number };

type RulePredicate = (input: PredicateInput) => ConditionalRuleEvaluationResult;

interface PredicateInput {
  readonly actualValue: unknown;
  readonly fieldPath: string;
  readonly operator: ConditionalRule['operator'];
  readonly expectedValue?: JsonValue;
}

const predicateByOperator: Readonly<
  Record<ConditionalRule['operator'], RulePredicate>
> = {
  contains: evaluateContains,
  equals: evaluateEquals,
  exists: evaluateExists,
  greater_than: evaluateGreaterThan,
  greater_than_or_equal: evaluateGreaterThanOrEqual,
  in: evaluateIn,
  is_empty: evaluateIsEmpty,
  is_not_empty: evaluateIsNotEmpty,
  less_than: evaluateLessThan,
  less_than_or_equal: evaluateLessThanOrEqual,
  not_contains: evaluateNotContains,
  not_equals: evaluateNotEquals,
  not_exists: evaluateNotExists,
  not_in: evaluateNotIn,
};

export function evaluateConditionalRule(
  input: EvaluateConditionalRuleInput,
): ConditionalRuleEvaluationResult {
  const lookup = getValueAtDataPath(input.context, input.rule.fieldPath);
  const actualValue = lookup.found ? lookup.value : undefined;
  const operator = input.rule.operator;

  if (shouldWarnForMissingField(operator, lookup.found, actualValue)) {
    return createResult({
      actualValue,
      diagnostics: [
        createDiagnostic({
          code: 'missing_condition_field',
          fieldPath: input.rule.fieldPath,
          message: `Conditional field "${input.rule.fieldPath}" is missing.`,
          operator,
          severity: 'warning',
        }),
      ],
      expectedValue: input.rule.value,
      fieldPath: input.rule.fieldPath,
      matched: false,
      operator,
    });
  }

  const predicate = predicateByOperator[operator];

  return predicate({
    actualValue,
    expectedValue: input.rule.value,
    fieldPath: input.rule.fieldPath,
    operator,
  });
}

export function evaluateConditionalRules(
  input: EvaluateConditionalRulesInput,
): ConditionalRulesEvaluationResult {
  const results = input.rules.map((rule) =>
    evaluateConditionalRule({
      context: input.context,
      rule,
    }),
  );

  return {
    diagnostics: results.flatMap((result) => result.diagnostics),
    matched: results.every((result) => result.matched),
    results,
  };
}

function evaluateExists(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  return createResult({
    ...input,
    matched: !isMissingValue(input.actualValue),
  });
}

function evaluateNotExists(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  return createResult({
    ...input,
    matched: isMissingValue(input.actualValue),
  });
}

function evaluateEquals(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  const comparison = compareJsonValues(input.actualValue, input.expectedValue);

  if (comparison === undefined) {
    return createInvalidValueResult(input);
  }

  return createResult({
    ...input,
    matched: comparison,
  });
}

function evaluateNotEquals(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  const comparison = compareJsonValues(input.actualValue, input.expectedValue);

  if (comparison === undefined) {
    return createInvalidValueResult(input);
  }

  return createResult({
    ...input,
    matched: !comparison,
  });
}

function evaluateGreaterThan(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  return evaluateOrderedComparison(input, (left, right) => left > right);
}

function evaluateGreaterThanOrEqual(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  return evaluateOrderedComparison(input, (left, right) => left >= right);
}

function evaluateLessThan(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  return evaluateOrderedComparison(input, (left, right) => left < right);
}

function evaluateLessThanOrEqual(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  return evaluateOrderedComparison(input, (left, right) => left <= right);
}

function evaluateContains(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  const contains = evaluateContainment(input.actualValue, input.expectedValue);

  if (contains === undefined) {
    return createInvalidValueResult(input);
  }

  return createResult({
    ...input,
    matched: contains,
  });
}

function evaluateNotContains(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  const contains = evaluateContainment(input.actualValue, input.expectedValue);

  if (contains === undefined) {
    return createInvalidValueResult(input);
  }

  return createResult({
    ...input,
    matched: !contains,
  });
}

function evaluateIsEmpty(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  return createResult({
    ...input,
    matched: isEmptyValue(input.actualValue),
  });
}

function evaluateIsNotEmpty(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  return createResult({
    ...input,
    matched: !isEmptyValue(input.actualValue),
  });
}

function evaluateIn(input: PredicateInput): ConditionalRuleEvaluationResult {
  const contains = evaluateExpectedArrayContainment(input);

  if (contains === undefined) {
    return createInvalidValueResult(input);
  }

  return createResult({
    ...input,
    matched: contains,
  });
}

function evaluateNotIn(input: PredicateInput): ConditionalRuleEvaluationResult {
  const contains = evaluateExpectedArrayContainment(input);

  if (contains === undefined) {
    return createInvalidValueResult(input);
  }

  return createResult({
    ...input,
    matched: !contains,
  });
}

function evaluateOrderedComparison(
  input: PredicateInput,
  predicate: (left: number, right: number) => boolean,
): ConditionalRuleEvaluationResult {
  const actualComparable = toComparableValue(input.actualValue);
  const expectedComparable = toComparableValue(input.expectedValue);

  if (
    actualComparable === undefined ||
    expectedComparable === undefined ||
    actualComparable.kind !== expectedComparable.kind
  ) {
    return createInvalidValueResult(input);
  }

  return createResult({
    ...input,
    matched: predicate(actualComparable.value, expectedComparable.value),
  });
}

function evaluateContainment(
  actualValue: unknown,
  expectedValue: JsonValue | undefined,
): boolean | undefined {
  if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
    return actualValue.includes(expectedValue);
  }

  if (Array.isArray(actualValue)) {
    return actualValue.some((item) => compareJsonValues(item, expectedValue));
  }

  return undefined;
}

function evaluateExpectedArrayContainment(
  input: PredicateInput,
): boolean | undefined {
  if (!Array.isArray(input.expectedValue)) {
    return undefined;
  }

  return input.expectedValue.some((item) =>
    compareJsonValues(input.actualValue, item),
  );
}

function shouldWarnForMissingField(
  operator: ConditionalRule['operator'],
  found: boolean,
  value: unknown,
): boolean {
  if (operator === 'exists' || operator === 'not_exists') {
    return false;
  }

  if (operator === 'is_empty' || operator === 'is_not_empty') {
    return false;
  }

  return !found || isMissingValue(value);
}

function compareJsonValues(
  actualValue: unknown,
  expectedValue: JsonValue | undefined,
): boolean | undefined {
  const actualJson = stableJsonStringify(actualValue);
  const expectedJson = stableJsonStringify(expectedValue);

  if (actualJson === undefined || expectedJson === undefined) {
    return undefined;
  }

  return actualJson === expectedJson;
}

function stableJsonStringify(value: unknown): string | undefined {
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
    const items = value.map((item) => stableJsonStringify(item));

    return items.every((item) => item !== undefined)
      ? `[${items.join(',')}]`
      : undefined;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey),
    );
    const items = entries.map(([key, item]) => {
      const serializedItem = stableJsonStringify(item);

      return serializedItem === undefined
        ? undefined
        : `${JSON.stringify(key)}:${serializedItem}`;
    });

    return items.every((item) => item !== undefined)
      ? `{${items.join(',')}}`
      : undefined;
  }

  return undefined;
}

function toComparableValue(value: unknown): ComparableValue | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'number', value };
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const timestamp = parseDeterministicIsoDate(value);

  return timestamp === undefined
    ? undefined
    : { kind: 'date', value: timestamp };
}

function isEmptyValue(value: unknown): boolean {
  if (isMissingValue(value)) {
    return true;
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }

  if (isRecord(value)) {
    return Object.keys(value).length === 0;
  }

  return false;
}

function isMissingValue(value: unknown): boolean {
  return value === undefined || value === null;
}

function createInvalidValueResult(
  input: PredicateInput,
): ConditionalRuleEvaluationResult {
  return createResult({
    ...input,
    diagnostics: [
      createDiagnostic({
        code: 'invalid_condition_value',
        fieldPath: input.fieldPath,
        message: `Conditional operator "${input.operator}" cannot compare field "${input.fieldPath}" with the provided value.`,
        operator: input.operator,
        severity: 'error',
      }),
    ],
    matched: false,
  });
}

function createResult(
  input: PredicateInput & {
    readonly diagnostics?: readonly ConditionalEvaluationDiagnostic[];
    readonly matched: boolean;
  },
): ConditionalRuleEvaluationResult {
  return {
    actualValue: input.actualValue,
    diagnostics: input.diagnostics ?? [],
    expectedValue: input.expectedValue,
    fieldPath: input.fieldPath,
    matched: input.matched,
    operator: input.operator,
  };
}

function createDiagnostic(
  input: ConditionalEvaluationDiagnostic,
): ConditionalEvaluationDiagnostic {
  return input;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
