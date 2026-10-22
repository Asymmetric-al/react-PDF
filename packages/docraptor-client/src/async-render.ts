import { DocRaptorClientError } from './errors';
import { assertDocRaptorServerRuntime } from './server-only';
import type {
  DocRaptorAsyncRenderJob,
  DocRaptorAsyncRenderStatus,
  DocRaptorAsyncRenderStatusValue,
  DocRaptorClient,
  DocRaptorIdempotencyMetadata,
  DocRaptorPollAsyncRenderStatusOptions,
  DocRaptorRenderRequest,
} from './types';

export type DocRaptorAsyncRenderExecutionStatus =
  | 'succeeded'
  | 'failed'
  | 'canceled';

export type DocRaptorRetryClassification =
  | 'transient'
  | 'permanent'
  | 'canceled';

export type DocRaptorStructuredLogLevel = 'info' | 'warning' | 'error';

export interface DocRaptorAsyncRetryPolicy {
  readonly maxAttempts?: number;
  readonly initialDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly multiplier?: number;
}

export interface DocRaptorAsyncPollPolicy {
  readonly intervalMs?: number;
  readonly maxAttempts?: number;
  readonly timeoutMs?: number;
}

export interface DocRaptorStructuredLogEntry {
  readonly level: DocRaptorStructuredLogLevel;
  readonly event: string;
  readonly message: string;
  readonly at?: string;
  readonly attempt?: number;
  readonly statusId?: string;
  readonly retryable?: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface DocRaptorAsyncRenderAttempt {
  readonly attempt: number;
  readonly status: DocRaptorAsyncRenderExecutionStatus;
  readonly classification?: DocRaptorRetryClassification;
  readonly statusId?: string;
  readonly statusUrl?: string;
  readonly errorCode?: string;
  readonly message?: string;
  readonly retryable: boolean;
  readonly nextRetryDelayMs?: number;
  readonly validationErrors?: readonly string[];
}

export interface DocRaptorAsyncRenderExecutionResult {
  readonly kind: 'async_render_execution';
  readonly status: DocRaptorAsyncRenderExecutionStatus;
  readonly request: DocRaptorRenderRequest;
  readonly idempotency?: DocRaptorIdempotencyMetadata;
  readonly statusId?: string;
  readonly statusUrl?: string;
  readonly downloadUrl?: string;
  readonly numberOfPages?: number;
  readonly validationErrors?: readonly string[];
  readonly attempts: readonly DocRaptorAsyncRenderAttempt[];
  readonly logs: readonly DocRaptorStructuredLogEntry[];
}

export interface ExecuteDocRaptorAsyncRenderInput {
  readonly client: Pick<
    DocRaptorClient,
    'createAsyncRender' | 'pollAsyncRenderStatus'
  >;
  readonly request: DocRaptorRenderRequest;
  readonly retryPolicy?: DocRaptorAsyncRetryPolicy;
  readonly pollPolicy?: DocRaptorAsyncPollPolicy;
  readonly signal?: AbortSignal;
  readonly sleep?: (
    delayMs: number,
    signal?: AbortSignal,
  ) => Promise<void> | void;
  readonly now?: () => string;
  readonly logger?: (entry: DocRaptorStructuredLogEntry) => void;
  readonly redactValues?: readonly string[];
}

export interface DocRaptorAsyncRenderSummary {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly canceled: number;
  readonly partial: boolean;
}

export interface DocRaptorAsyncCallbackPayload {
  readonly statusId?: string;
  readonly status: DocRaptorAsyncRenderStatusValue;
  readonly downloadUrl?: string;
  readonly numberOfPages?: number;
  readonly validationErrors?: readonly string[];
  readonly receivedAt?: string;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface DocRaptorRenderErrorClassification {
  readonly classification: DocRaptorRetryClassification;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

interface NormalizedRetryPolicy {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly multiplier: number;
}

interface NormalizedPollPolicy {
  readonly intervalMs: number;
  readonly maxAttempts: number;
  readonly timeoutMs?: number;
}

const defaultRetryPolicy: NormalizedRetryPolicy = {
  initialDelayMs: 1_000,
  maxAttempts: 1,
  maxDelayMs: 30_000,
  multiplier: 2,
};

const defaultPollPolicy: NormalizedPollPolicy = {
  intervalMs: 1_000,
  maxAttempts: 60,
};

export async function executeDocRaptorAsyncRender(
  input: ExecuteDocRaptorAsyncRenderInput,
): Promise<DocRaptorAsyncRenderExecutionResult> {
  assertDocRaptorServerRuntime();

  const retryPolicy = normalizeRetryPolicy(input.retryPolicy);
  const pollPolicy = normalizePollPolicy(input.pollPolicy);
  const attempts: DocRaptorAsyncRenderAttempt[] = [];
  const logs: DocRaptorStructuredLogEntry[] = [];
  const signal = input.signal ?? input.request.signal;
  const emitLog = createLogEmitter(input, logs);

  for (
    let attemptNumber = 1;
    attemptNumber <= retryPolicy.maxAttempts;
    attemptNumber += 1
  ) {
    emitLog({
      attempt: attemptNumber,
      event: 'docraptor.async.create.started',
      level: 'info',
      message: 'Creating DocRaptor async render job.',
    });

    try {
      throwIfCanceled(signal);

      const asyncJob = await input.client.createAsyncRender({
        ...input.request,
        signal,
      });

      emitLog({
        attempt: attemptNumber,
        event: 'docraptor.async.create.succeeded',
        level: 'info',
        message: 'DocRaptor async render job was created.',
        statusId: asyncJob.statusId,
      });

      const status = await input.client.pollAsyncRenderStatus(
        asyncJob.statusId,
        createPollOptions(pollPolicy, signal),
      );

      if (status.status === 'completed') {
        const successAttempt = createSucceededAttempt(attemptNumber, asyncJob);

        attempts.push(successAttempt);
        emitLog({
          attempt: attemptNumber,
          event: 'docraptor.async.poll.succeeded',
          level: 'info',
          message: 'DocRaptor async render completed.',
          statusId: asyncJob.statusId,
        });

        return createExecutionResult({
          asyncJob,
          attempts,
          downloadUrl: status.downloadUrl,
          logs,
          numberOfPages: status.numberOfPages,
          request: input.request,
          status: 'succeeded',
          validationErrors: status.validationErrors,
        });
      }

      const failedAttempt = createFailedStatusAttempt({
        asyncJob,
        attemptNumber,
        status,
      });

      attempts.push(failedAttempt);
      emitLog({
        attempt: attemptNumber,
        details: {
          errorCode: failedAttempt.errorCode,
          validationErrors: failedAttempt.validationErrors,
        },
        event: 'docraptor.async.poll.failed',
        level: 'error',
        message: failedAttempt.message ?? 'DocRaptor async render failed.',
        retryable: false,
        statusId: asyncJob.statusId,
      });

      return createExecutionResult({
        asyncJob,
        attempts,
        logs,
        request: input.request,
        status: 'failed',
        validationErrors: status.validationErrors,
      });
    } catch (error) {
      const classification = classifyDocRaptorRenderError(error);
      const shouldRetry =
        classification.classification === 'transient' &&
        attemptNumber < retryPolicy.maxAttempts;
      const nextRetryDelayMs = shouldRetry
        ? calculateDocRaptorRetryDelay(attemptNumber, retryPolicy)
        : undefined;
      const failedAttempt = createErrorAttempt({
        attemptNumber,
        classification,
        nextRetryDelayMs,
        retryable: shouldRetry,
      });

      attempts.push(failedAttempt);
      emitLog({
        attempt: attemptNumber,
        details: {
          errorCode: classification.code,
          status: classification.status,
        },
        event:
          classification.classification === 'canceled'
            ? 'docraptor.async.canceled'
            : 'docraptor.async.failed',
        level:
          classification.classification === 'canceled' ? 'warning' : 'error',
        message: classification.message,
        retryable: shouldRetry,
      });

      if (classification.classification === 'canceled') {
        return createExecutionResult({
          attempts,
          logs,
          request: input.request,
          status: 'canceled',
        });
      }

      if (!shouldRetry || nextRetryDelayMs === undefined) {
        return createExecutionResult({
          attempts,
          logs,
          request: input.request,
          status: 'failed',
        });
      }

      emitLog({
        attempt: attemptNumber,
        details: {
          delayMs: nextRetryDelayMs,
        },
        event: 'docraptor.async.retry.scheduled',
        level: 'warning',
        message: 'Retrying DocRaptor async render after transient failure.',
        retryable: true,
      });

      await sleepBeforeRetry(input, nextRetryDelayMs, signal);
    }
  }

  return createExecutionResult({
    attempts,
    logs,
    request: input.request,
    status: 'failed',
  });
}

export function classifyDocRaptorRenderError(
  error: unknown,
): DocRaptorRenderErrorClassification {
  if (error instanceof DocRaptorClientError) {
    if (error.code === 'aborted') {
      return {
        classification: 'canceled',
        code: error.code,
        details: error.details,
        message: error.message,
        retryable: false,
        status: error.status,
      };
    }

    return {
      classification: error.retryable ? 'transient' : 'permanent',
      code: error.code,
      details: error.details,
      message: error.message,
      retryable: error.retryable,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      classification: 'transient',
      code: 'unknown_error',
      message: error.message,
      retryable: true,
    };
  }

  return {
    classification: 'transient',
    code: 'unknown_error',
    message: 'DocRaptor async render failed.',
    retryable: true,
  };
}

export function calculateDocRaptorRetryDelay(
  attemptNumber: number,
  policy: DocRaptorAsyncRetryPolicy = {},
): number {
  const normalized = normalizeRetryPolicy(policy);
  const exponent = Math.max(0, attemptNumber - 1);
  const rawDelay =
    normalized.initialDelayMs * normalized.multiplier ** exponent;

  return Math.min(normalized.maxDelayMs, Math.round(rawDelay));
}

export function summarizeDocRaptorAsyncRenderExecutions(
  results: readonly DocRaptorAsyncRenderExecutionResult[],
): DocRaptorAsyncRenderSummary {
  const summary = {
    canceled: 0,
    failed: 0,
    succeeded: 0,
    total: results.length,
  };

  for (const result of results) {
    if (result.status === 'succeeded') {
      summary.succeeded += 1;
    } else if (result.status === 'failed') {
      summary.failed += 1;
    } else {
      summary.canceled += 1;
    }
  }

  const terminalKinds = [
    summary.succeeded > 0,
    summary.failed > 0,
    summary.canceled > 0,
  ].filter(Boolean).length;

  return {
    ...summary,
    partial: terminalKinds > 1,
  };
}

export function normalizeDocRaptorAsyncCallbackPayload(
  payload: unknown,
  receivedAt?: string,
): DocRaptorAsyncCallbackPayload {
  const raw = isRecord(payload) ? payload : {};

  return {
    downloadUrl: readString(raw, 'download_url'),
    numberOfPages: readNumber(raw, 'number_of_pages'),
    raw,
    receivedAt,
    status: readAsyncStatusValue(raw),
    statusId: readString(raw, 'status_id'),
    validationErrors: normalizeValidationErrors(raw.validation_errors),
  };
}

function createSucceededAttempt(
  attemptNumber: number,
  asyncJob: DocRaptorAsyncRenderJob,
): DocRaptorAsyncRenderAttempt {
  return {
    attempt: attemptNumber,
    retryable: false,
    status: 'succeeded',
    statusId: asyncJob.statusId,
    statusUrl: asyncJob.statusUrl,
  };
}

function createFailedStatusAttempt(input: {
  readonly attemptNumber: number;
  readonly asyncJob: DocRaptorAsyncRenderJob;
  readonly status: DocRaptorAsyncRenderStatus;
}): DocRaptorAsyncRenderAttempt {
  return {
    attempt: input.attemptNumber,
    classification: 'permanent',
    errorCode: 'docraptor_failed_status',
    message: input.status.message ?? 'DocRaptor async render failed.',
    retryable: false,
    status: 'failed',
    statusId: input.asyncJob.statusId,
    statusUrl: input.asyncJob.statusUrl,
    validationErrors: input.status.validationErrors,
  };
}

function createErrorAttempt(input: {
  readonly attemptNumber: number;
  readonly classification: DocRaptorRenderErrorClassification;
  readonly retryable: boolean;
  readonly nextRetryDelayMs?: number;
}): DocRaptorAsyncRenderAttempt {
  return {
    attempt: input.attemptNumber,
    classification: input.classification.classification,
    errorCode: input.classification.code,
    message: input.classification.message,
    nextRetryDelayMs: input.nextRetryDelayMs,
    retryable: input.retryable,
    status:
      input.classification.classification === 'canceled'
        ? 'canceled'
        : 'failed',
  };
}

function createExecutionResult(input: {
  readonly request: DocRaptorRenderRequest;
  readonly status: DocRaptorAsyncRenderExecutionStatus;
  readonly attempts: readonly DocRaptorAsyncRenderAttempt[];
  readonly logs: readonly DocRaptorStructuredLogEntry[];
  readonly asyncJob?: DocRaptorAsyncRenderJob;
  readonly downloadUrl?: string;
  readonly numberOfPages?: number;
  readonly validationErrors?: readonly string[];
}): DocRaptorAsyncRenderExecutionResult {
  return {
    attempts: input.attempts,
    downloadUrl: input.downloadUrl,
    idempotency: input.asyncJob?.idempotency ?? input.request.idempotency,
    kind: 'async_render_execution',
    logs: input.logs,
    numberOfPages: input.numberOfPages,
    request: input.request,
    status: input.status,
    statusId: input.asyncJob?.statusId,
    statusUrl: input.asyncJob?.statusUrl,
    validationErrors: input.validationErrors,
  };
}

function createPollOptions(
  policy: NormalizedPollPolicy,
  signal: AbortSignal | undefined,
): DocRaptorPollAsyncRenderStatusOptions {
  return {
    intervalMs: policy.intervalMs,
    maxAttempts: policy.maxAttempts,
    signal,
    timeoutMs: policy.timeoutMs,
  };
}

function createLogEmitter(
  input: ExecuteDocRaptorAsyncRenderInput,
  logs: DocRaptorStructuredLogEntry[],
): (entry: Omit<DocRaptorStructuredLogEntry, 'at'>) => void {
  return (entry) => {
    const logEntry = redactStructuredLogEntry(
      {
        ...entry,
        at: input.now?.(),
      },
      input.redactValues ?? [],
    );

    logs.push(logEntry);
    input.logger?.(logEntry);
  };
}

function redactStructuredLogEntry(
  entry: DocRaptorStructuredLogEntry,
  redactValues: readonly string[],
): DocRaptorStructuredLogEntry {
  return {
    ...entry,
    details: entry.details
      ? (redactUnknown(entry.details, redactValues) as Readonly<
          Record<string, unknown>
        >)
      : undefined,
    message: redactString(entry.message, redactValues),
  };
}

async function sleepBeforeRetry(
  input: ExecuteDocRaptorAsyncRenderInput,
  delayMs: number,
  signal: AbortSignal | undefined,
): Promise<void> {
  const sleeper = input.sleep ?? defaultSleep;
  await sleeper(delayMs, signal);
}

async function defaultSleep(
  delayMs: number,
  signal: AbortSignal | undefined,
): Promise<void> {
  if (delayMs <= 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs);
    const abort = () => {
      clearTimeout(timeout);
      reject(
        new DocRaptorClientError({
          code: 'aborted',
          message: 'DocRaptor request was aborted.',
          retryable: false,
        }),
      );
    };

    signal?.addEventListener('abort', abort, { once: true });
  });
}

function normalizeRetryPolicy(
  policy: DocRaptorAsyncRetryPolicy = {},
): NormalizedRetryPolicy {
  return {
    initialDelayMs: normalizeNonNegativeInteger(
      policy.initialDelayMs,
      defaultRetryPolicy.initialDelayMs,
    ),
    maxAttempts: Math.max(
      1,
      normalizeNonNegativeInteger(
        policy.maxAttempts,
        defaultRetryPolicy.maxAttempts,
      ),
    ),
    maxDelayMs: normalizeNonNegativeInteger(
      policy.maxDelayMs,
      defaultRetryPolicy.maxDelayMs,
    ),
    multiplier: normalizePositiveNumber(
      policy.multiplier,
      defaultRetryPolicy.multiplier,
    ),
  };
}

function normalizePollPolicy(
  policy: DocRaptorAsyncPollPolicy = {},
): NormalizedPollPolicy {
  return {
    intervalMs: normalizeNonNegativeInteger(
      policy.intervalMs,
      defaultPollPolicy.intervalMs,
    ),
    maxAttempts: Math.max(
      1,
      normalizeNonNegativeInteger(
        policy.maxAttempts,
        defaultPollPolicy.maxAttempts,
      ),
    ),
    timeoutMs: policy.timeoutMs,
  };
}

function normalizeNonNegativeInteger(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function normalizePositiveNumber(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function throwIfCanceled(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) {
    return;
  }

  throw new DocRaptorClientError({
    code: 'aborted',
    message: 'DocRaptor request was aborted.',
    retryable: false,
  });
}

function readAsyncStatusValue(
  value: Readonly<Record<string, unknown>>,
): DocRaptorAsyncRenderStatusValue {
  const status = readString(value, 'status');

  if (
    status === 'queued' ||
    status === 'working' ||
    status === 'completed' ||
    status === 'failed'
  ) {
    return status;
  }

  return 'unknown';
}

function normalizeValidationErrors(
  value: unknown,
): readonly string[] | undefined {
  if (Array.isArray(value)) {
    const errors = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return errors.length > 0 ? errors : undefined;
  }

  if (typeof value === 'string') {
    const errors = value
      .split(/\r?\n/u)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return errors.length > 0 ? errors : undefined;
  }

  return undefined;
}

function readString(
  value: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const candidate = value[key];

  return typeof candidate === 'string' && candidate.length > 0
    ? candidate
    : undefined;
}

function readNumber(
  value: Readonly<Record<string, unknown>>,
  key: string,
): number | undefined {
  const candidate = value[key];

  return typeof candidate === 'number' && Number.isFinite(candidate)
    ? candidate
    : undefined;
}

function redactUnknown(
  value: unknown,
  redactValues: readonly string[],
): unknown {
  if (typeof value === 'string') {
    return redactString(value, redactValues);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item, redactValues));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (isSecretLikeKey(key)) {
          return [key, '[redacted]'];
        }

        return [key, redactUnknown(item, redactValues)];
      }),
    );
  }

  return value;
}

function redactString(value: string, redactValues: readonly string[]): string {
  let redacted = value;

  for (const secret of redactValues) {
    if (secret.length > 0) {
      redacted = redacted.split(secret).join('[redacted]');
    }
  }

  redacted = redacted.replace(
    /\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,
    'Bearer [redacted]',
  );
  redacted = redacted.replace(
    /\b[rs]k_(?:live|test)_[A-Za-z0-9]+/gu,
    '[redacted]',
  );
  redacted = redacted.replace(/\bAKIA[0-9A-Z]{16}\b/gu, '[redacted]');
  redacted = redacted.replace(
    /(api[_-]?key|authorization|cookie|password|secret|token)(\s*[=:]\s*)[^\s,;]+/giu,
    '$1$2[redacted]',
  );
  redacted = redacted.replace(
    /([?&](?:x-amz-signature|x-amz-credential|x-amz-security-token|x-goog-signature|signature|sig|token|access_token|policy|key-pair-id)=)[^&#\s]+/giu,
    '$1[redacted]',
  );

  return redacted;
}

function isSecretLikeKey(key: string): boolean {
  return /api[_-]?key|authorization|cookie|password|secret|token/iu.test(key);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
