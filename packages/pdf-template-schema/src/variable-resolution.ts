import {
  defaultVariableFormatters,
  formatVariableValue,
  type VariableFormatterMap,
  type VariableFormatterOptions,
  type VariableResolutionDiagnostic,
} from './formatters';
import {
  coreVariableRegistry,
  type FallbackBehavior,
  type RegistryVariableDefinition,
  type VariableRegistry,
} from './variables';

export type VariableDataContext = Readonly<Record<string, unknown>>;

export type VariableResolutionStatus =
  | 'fallback'
  | 'invalid_type'
  | 'missing_optional'
  | 'missing_required'
  | 'resolved'
  | 'unknown_formatter'
  | 'unknown_variable';

export interface VariablePathLookupResult {
  readonly found: boolean;
  readonly value?: unknown;
}

export interface VariableResolutionRequest {
  readonly key: string;
  readonly formatter?: string;
  readonly fallback?: FallbackBehavior;
}

export type VariableResolutionRequestInput = string | VariableResolutionRequest;

export interface VariableResolverOptions extends VariableFormatterOptions {
  readonly registry?: VariableRegistry;
  readonly formatters?: VariableFormatterMap;
}

export interface ResolveVariableValueInput extends VariableResolverOptions {
  readonly key: string;
  readonly context: VariableDataContext;
  readonly formatter?: string;
  readonly fallback?: FallbackBehavior;
}

export interface ResolveVariableValuesInput extends VariableResolverOptions {
  readonly context: VariableDataContext;
  readonly variables: readonly VariableResolutionRequestInput[];
}

export interface ResolvedVariableValue {
  readonly key: string;
  readonly sourcePath?: string;
  readonly formatter?: string;
  readonly status: VariableResolutionStatus;
  readonly rawValue?: unknown;
  readonly formattedValue: string;
  readonly definition?: RegistryVariableDefinition;
  readonly diagnostics: readonly VariableResolutionDiagnostic[];
}

export interface ResolveVariableValuesResult {
  readonly values: readonly ResolvedVariableValue[];
  readonly diagnostics: readonly VariableResolutionDiagnostic[];
}

export interface VariableResolver {
  resolve(
    variable: VariableResolutionRequestInput,
    context: VariableDataContext,
  ): ResolvedVariableValue;
  resolveMany(
    variables: readonly VariableResolutionRequestInput[],
    context: VariableDataContext,
  ): ResolveVariableValuesResult;
}

export function createVariableResolver(
  options: VariableResolverOptions = {},
): VariableResolver {
  const registry = options.registry ?? coreVariableRegistry;
  const formatters = options.formatters ?? defaultVariableFormatters;

  return {
    resolve(variable, context): ResolvedVariableValue {
      return resolveWithOptions(variable, context, {
        ...options,
        formatters,
        registry,
      });
    },

    resolveMany(variables, context): ResolveVariableValuesResult {
      const values = variables.map((variable) =>
        resolveWithOptions(variable, context, {
          ...options,
          formatters,
          registry,
        }),
      );

      return {
        diagnostics: values.flatMap((value) => value.diagnostics),
        values,
      };
    },
  };
}

export function resolveVariableValue(
  input: ResolveVariableValueInput,
): ResolvedVariableValue {
  const resolver = createVariableResolver(input);

  return resolver.resolve(
    {
      fallback: input.fallback,
      formatter: input.formatter,
      key: input.key,
    },
    input.context,
  );
}

export function resolveVariableValues(
  input: ResolveVariableValuesInput,
): ResolveVariableValuesResult {
  const resolver = createVariableResolver(input);

  return resolver.resolveMany(input.variables, input.context);
}

export function getValueAtDataPath(
  context: VariableDataContext,
  sourcePath: string,
): VariablePathLookupResult {
  let current: unknown = context;

  for (const segment of sourcePath.split('.')) {
    if (!isRecord(current) || !hasOwn(current, segment)) {
      return { found: false };
    }

    current = current[segment];
  }

  return { found: true, value: current };
}

function resolveWithOptions(
  variable: VariableResolutionRequestInput,
  context: VariableDataContext,
  options: Required<Pick<VariableResolverOptions, 'registry' | 'formatters'>> &
    VariableFormatterOptions,
): ResolvedVariableValue {
  const request = normalizeVariableRequest(variable);
  const definition = options.registry.get(request.key);

  if (!definition) {
    return createUnknownVariableResult(request.key);
  }

  const lookup = getValueAtDataPath(context, definition.sourcePath);

  if (!lookup.found || isMissingValue(lookup.value)) {
    return resolveMissingValue(
      definition,
      request.formatter,
      request.fallback,
      options,
    );
  }

  return resolvePresentValue(
    definition,
    request.formatter,
    lookup.value,
    options,
  );
}

function resolvePresentValue(
  definition: RegistryVariableDefinition,
  formatter: string | undefined,
  value: unknown,
  options: VariableResolverOptions,
): ResolvedVariableValue {
  const formatted = formatVariableValue({
    ...options,
    definition,
    formatter,
    value,
  });
  const status = resolveStatusFromDiagnostics(formatted.diagnostics);

  return {
    definition,
    diagnostics: formatted.diagnostics,
    formattedValue: formatted.formattedValue,
    formatter: formatter ?? definition.formatter,
    key: definition.key,
    rawValue: value,
    sourcePath: definition.sourcePath,
    status,
  };
}

function resolveMissingValue(
  definition: RegistryVariableDefinition,
  formatter: string | undefined,
  fallbackOverride: FallbackBehavior | undefined,
  options: VariableResolverOptions,
): ResolvedVariableValue {
  if (definition.required) {
    return {
      definition,
      diagnostics: [
        {
          code: 'missing_required_value',
          message: `Required variable "${definition.key}" is missing.`,
          severity: 'error',
          sourcePath: definition.sourcePath,
          variableKey: definition.key,
        },
      ],
      formattedValue: '',
      formatter: formatter ?? definition.formatter,
      key: definition.key,
      sourcePath: definition.sourcePath,
      status: 'missing_required',
    };
  }

  const missingDiagnostic: VariableResolutionDiagnostic = {
    code: 'missing_optional_value',
    message: `Optional variable "${definition.key}" is missing.`,
    severity: 'warning',
    sourcePath: definition.sourcePath,
    variableKey: definition.key,
  };

  const fallback = fallbackOverride ?? definition.fallback;

  if (fallback.mode !== 'use_value') {
    return {
      definition,
      diagnostics: [missingDiagnostic],
      formattedValue: '',
      formatter: formatter ?? definition.formatter,
      key: definition.key,
      sourcePath: definition.sourcePath,
      status: 'missing_optional',
    };
  }

  const formatted = formatVariableValue({
    ...options,
    definition,
    formatter,
    value: fallback.value,
  });

  return {
    definition,
    diagnostics: [missingDiagnostic, ...formatted.diagnostics],
    formattedValue: formatted.formattedValue,
    formatter: formatter ?? definition.formatter,
    key: definition.key,
    rawValue: fallback.value,
    sourcePath: definition.sourcePath,
    status:
      formatted.diagnostics.length > 0
        ? resolveStatusFromDiagnostics(formatted.diagnostics)
        : 'fallback',
  };
}

function createUnknownVariableResult(key: string): ResolvedVariableValue {
  return {
    diagnostics: [
      {
        code: 'unknown_variable',
        message: `Unknown variable "${key}".`,
        severity: 'error',
        variableKey: key,
      },
    ],
    formattedValue: '',
    key,
    status: 'unknown_variable',
  };
}

function resolveStatusFromDiagnostics(
  diagnostics: readonly VariableResolutionDiagnostic[],
): VariableResolutionStatus {
  if (
    diagnostics.some((diagnostic) => diagnostic.code === 'unknown_formatter')
  ) {
    return 'unknown_formatter';
  }

  if (
    diagnostics.some(
      (diagnostic) =>
        diagnostic.code === 'invalid_variable_type' ||
        diagnostic.code === 'invalid_variable_value',
    )
  ) {
    return 'invalid_type';
  }

  return 'resolved';
}

function normalizeVariableRequest(
  variable: VariableResolutionRequestInput,
): VariableResolutionRequest {
  return typeof variable === 'string' ? { key: variable } : variable;
}

function isMissingValue(value: unknown): boolean {
  return value === undefined || value === null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(
  value: Readonly<Record<string, unknown>>,
  key: string,
): boolean {
  return Object.hasOwn(value, key);
}
