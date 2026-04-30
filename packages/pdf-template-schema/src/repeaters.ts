import {
  type RepeaterBinding,
  type RepeaterBindingInput,
  RepeaterBindingSchema,
} from './bindings';
import type { ConditionalEvaluationDiagnostic } from './conditions';
import { evaluateConditionalRules } from './conditions';
import { parseDeterministicIsoDate } from './dates';
import type { VariableDataContext } from './variable-resolution';
import { getValueAtDataPath } from './variable-resolution';

export type RepeaterResolutionDiagnosticCode =
  | 'invalid_repeater_binding'
  | 'missing_repeater_source'
  | 'non_array_repeater_source'
  | 'repeater_filter_error'
  | 'repeater_filter_warning'
  | 'repeater_max_items_exceeded';

export type RepeaterResolutionDiagnosticSeverity = 'error' | 'warning';

export interface RepeaterResolutionDiagnostic {
  readonly code: RepeaterResolutionDiagnosticCode;
  readonly severity: RepeaterResolutionDiagnosticSeverity;
  readonly message: string;
  readonly bindingId: string;
  readonly sourcePath: string;
  readonly itemAlias?: string;
  readonly sourceIndex?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface ResolvedRepeaterItem {
  readonly value: unknown;
  readonly sourceIndex: number;
  readonly renderedIndex: number;
  readonly context: VariableDataContext;
}

export interface ResolveRepeaterItemsInput {
  readonly binding: RepeaterBindingInput;
  readonly context: VariableDataContext;
}

export interface ResolveRepeaterItemsResult {
  readonly items: readonly ResolvedRepeaterItem[];
  readonly diagnostics: readonly RepeaterResolutionDiagnostic[];
}

export interface CreateScopedRepeaterContextInput {
  readonly context: VariableDataContext;
  readonly itemAlias: string;
  readonly itemValue: unknown;
  readonly indexAlias?: string;
  readonly renderedIndex?: number;
}

interface RepeaterCandidateItem {
  readonly value: unknown;
  readonly sourceIndex: number;
}

interface NormalizedResolveRepeaterItemsInput {
  readonly binding: RepeaterBinding;
  readonly context: VariableDataContext;
}

export function resolveRepeaterItems(
  input: ResolveRepeaterItemsInput,
): ResolveRepeaterItemsResult {
  const parseResult = RepeaterBindingSchema.safeParse(input.binding);

  if (!parseResult.success) {
    return {
      diagnostics: [
        createInvalidBindingDiagnostic(
          input.binding,
          parseResult.error.message,
        ),
      ],
      items: [],
    };
  }

  const binding = parseResult.data;
  const source = getValueAtDataPath(input.context, binding.sourcePath);

  if (!source.found || source.value === undefined || source.value === null) {
    return {
      diagnostics: [
        createDiagnostic({
          binding,
          code: 'missing_repeater_source',
          message: `Repeater source "${binding.sourcePath}" is missing.`,
          severity: 'warning',
        }),
      ],
      items: [],
    };
  }

  if (!Array.isArray(source.value)) {
    return {
      diagnostics: [
        createDiagnostic({
          binding,
          code: 'non_array_repeater_source',
          message: `Repeater source "${binding.sourcePath}" must resolve to an array.`,
          severity: 'warning',
          details: { actualType: typeof source.value },
        }),
      ],
      items: [],
    };
  }

  const diagnostics: RepeaterResolutionDiagnostic[] = [];
  const candidates = source.value.map((value, sourceIndex) => ({
    sourceIndex,
    value,
  }));
  const filteredCandidates = filterCandidates(
    {
      binding,
      context: input.context,
    },
    candidates,
    diagnostics,
  );
  const sortedCandidates = sortCandidates(binding, filteredCandidates);
  const limitedCandidates = limitCandidates(
    binding,
    sortedCandidates,
    diagnostics,
  );

  return {
    diagnostics,
    items: limitedCandidates.map((candidate, renderedIndex) => ({
      context: createScopedRepeaterContext({
        context: input.context,
        indexAlias: binding.indexAlias,
        itemAlias: binding.itemAlias,
        itemValue: candidate.value,
        renderedIndex,
      }),
      renderedIndex,
      sourceIndex: candidate.sourceIndex,
      value: candidate.value,
    })),
  };
}

export function createScopedRepeaterContext(
  input: CreateScopedRepeaterContextInput,
): VariableDataContext {
  const withItem = setValueAtDataPath(
    input.context,
    input.itemAlias,
    input.itemValue,
  );

  if (input.indexAlias === undefined) {
    return withItem;
  }

  return setValueAtDataPath(
    withItem,
    input.indexAlias,
    input.renderedIndex ?? 0,
  );
}

function filterCandidates(
  input: NormalizedResolveRepeaterItemsInput,
  candidates: readonly RepeaterCandidateItem[],
  diagnostics: RepeaterResolutionDiagnostic[],
): readonly RepeaterCandidateItem[] {
  const filters = input.binding.filters;

  if (filters.length === 0) {
    return candidates;
  }

  return candidates.filter((candidate) => {
    const context = createScopedRepeaterContext({
      context: input.context,
      indexAlias: input.binding.indexAlias,
      itemAlias: input.binding.itemAlias,
      itemValue: candidate.value,
      renderedIndex: candidate.sourceIndex,
    });
    const result = evaluateConditionalRules({
      context,
      rules: filters,
    });

    diagnostics.push(
      ...result.diagnostics.map((diagnostic) =>
        toRepeaterDiagnostic(input.binding, candidate.sourceIndex, diagnostic),
      ),
    );

    return result.matched;
  });
}

function sortCandidates(
  binding: RepeaterBinding,
  candidates: readonly RepeaterCandidateItem[],
): readonly RepeaterCandidateItem[] {
  if (!binding.sort) {
    return candidates;
  }

  const directionMultiplier = binding.sort.direction === 'desc' ? -1 : 1;

  return [...candidates].sort((left, right) => {
    const comparison = compareSortValues(
      readSortValue(left.value, binding),
      readSortValue(right.value, binding),
    );

    if (comparison !== 0) {
      return comparison * directionMultiplier;
    }

    return left.sourceIndex - right.sourceIndex;
  });
}

function limitCandidates(
  binding: RepeaterBinding,
  candidates: readonly RepeaterCandidateItem[],
  diagnostics: RepeaterResolutionDiagnostic[],
): readonly RepeaterCandidateItem[] {
  if (candidates.length <= binding.maxItems) {
    return candidates;
  }

  diagnostics.push(
    createDiagnostic({
      binding,
      code: 'repeater_max_items_exceeded',
      details: {
        maxItems: binding.maxItems,
        totalItems: candidates.length,
      },
      message: `Repeater "${binding.id}" limited ${candidates.length} items to ${binding.maxItems}.`,
      severity: 'warning',
    }),
  );

  return candidates.slice(0, binding.maxItems);
}

function readSortValue(value: unknown, binding: RepeaterBinding): unknown {
  if (!binding.sort) {
    return undefined;
  }

  const itemValue = isRecord(value) ? value : {};
  const itemLookup = getValueAtDataPath(itemValue, binding.sort.fieldPath);

  if (itemLookup.found) {
    return itemLookup.value;
  }

  const scopedContext = createScopedRepeaterContext({
    context: {},
    itemAlias: binding.itemAlias,
    itemValue: value,
  });
  const scopedLookup = getValueAtDataPath(
    scopedContext,
    binding.sort.fieldPath,
  );

  return scopedLookup.found ? scopedLookup.value : undefined;
}

function compareSortValues(left: unknown, right: unknown): number {
  const leftValue = normalizeSortValue(left);
  const rightValue = normalizeSortValue(right);

  if (!leftValue && !rightValue) {
    return 0;
  }

  if (!leftValue) {
    return 1;
  }

  if (!rightValue) {
    return -1;
  }

  if (leftValue.kind !== rightValue.kind) {
    return leftValue.kind.localeCompare(rightValue.kind);
  }

  if (leftValue.value < rightValue.value) {
    return -1;
  }

  if (leftValue.value > rightValue.value) {
    return 1;
  }

  return 0;
}

function normalizeSortValue(value: unknown):
  | {
      readonly kind: 'boolean' | 'number' | 'string';
      readonly value: number | string;
    }
  | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'number', value };
  }

  if (typeof value === 'boolean') {
    return { kind: 'boolean', value: value ? 1 : 0 };
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const timestamp = parseDeterministicIsoDate(value);

  return timestamp === undefined
    ? { kind: 'string', value: value.toLowerCase() }
    : { kind: 'number', value: timestamp };
}

function setValueAtDataPath(
  context: VariableDataContext,
  path: string,
  value: unknown,
): VariableDataContext {
  const [head, ...tail] = path.split('.');
  const base = { ...context };

  if (tail.length === 0) {
    return {
      ...base,
      [head]: value,
    };
  }

  const existing = base[head];
  const nested = isRecord(existing) ? existing : {};

  return {
    ...base,
    [head]: setValueAtDataPath(nested, tail.join('.'), value),
  };
}

function toRepeaterDiagnostic(
  binding: RepeaterBinding,
  sourceIndex: number,
  diagnostic: ConditionalEvaluationDiagnostic,
): RepeaterResolutionDiagnostic {
  return createDiagnostic({
    binding,
    code:
      diagnostic.severity === 'error'
        ? 'repeater_filter_error'
        : 'repeater_filter_warning',
    details: {
      conditionCode: diagnostic.code,
      fieldPath: diagnostic.fieldPath,
      operator: diagnostic.operator,
    },
    message: diagnostic.message,
    severity: diagnostic.severity,
    sourceIndex,
  });
}

function createDiagnostic(input: {
  readonly binding: RepeaterBinding;
  readonly code: RepeaterResolutionDiagnosticCode;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly message: string;
  readonly severity: RepeaterResolutionDiagnosticSeverity;
  readonly sourceIndex?: number;
}): RepeaterResolutionDiagnostic {
  return {
    bindingId: input.binding.id,
    code: input.code,
    details: input.details,
    itemAlias: input.binding.itemAlias,
    message: input.message,
    severity: input.severity,
    sourceIndex: input.sourceIndex,
    sourcePath: input.binding.sourcePath,
  };
}

function createInvalidBindingDiagnostic(
  binding: RepeaterBindingInput,
  message: string,
): RepeaterResolutionDiagnostic {
  const bindingRecord: Readonly<Record<string, unknown>> = isRecord(binding)
    ? binding
    : {};
  const bindingId = readDiagnosticString(bindingRecord.id);
  const itemAlias = readDiagnosticString(bindingRecord.itemAlias);
  const sourcePath = readDiagnosticString(bindingRecord.sourcePath);

  return {
    bindingId,
    code: 'invalid_repeater_binding',
    details: {
      validationError: message,
    },
    itemAlias: itemAlias || undefined,
    message: `Repeater binding is invalid: ${message}`,
    severity: 'error',
    sourcePath,
  };
}

function readDiagnosticString(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

function isRecord(value: unknown): value is VariableDataContext {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
