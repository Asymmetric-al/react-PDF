import { assertDocRaptorServerRuntime } from './server-only';

assertDocRaptorServerRuntime();

export type {
  DocRaptorAsyncCallbackPayload,
  DocRaptorAsyncPollPolicy,
  DocRaptorAsyncRenderAttempt,
  DocRaptorAsyncRenderExecutionResult,
  DocRaptorAsyncRenderExecutionStatus,
  DocRaptorAsyncRenderSummary,
  DocRaptorAsyncRetryPolicy,
  DocRaptorRenderErrorClassification,
  DocRaptorRetryClassification,
  DocRaptorStructuredLogEntry,
  DocRaptorStructuredLogLevel,
  ExecuteDocRaptorAsyncRenderInput,
} from './async-render';
export {
  calculateDocRaptorRetryDelay,
  classifyDocRaptorRenderError,
  executeDocRaptorAsyncRender,
  normalizeDocRaptorAsyncCallbackPayload,
  summarizeDocRaptorAsyncRenderExecutions,
} from './async-render';
export { createDocRaptorClient } from './client';
export {
  DocRaptorClientError,
  type DocRaptorClientErrorCode,
} from './errors';
export type {
  DocRaptorAsyncRenderJob,
  DocRaptorAsyncRenderStatus,
  DocRaptorAsyncRenderStatusValue,
  DocRaptorClient,
  DocRaptorClientBoundary,
  DocRaptorClientConfig,
  DocRaptorClientMaturity,
  DocRaptorClientOwnership,
  DocRaptorClientPackageName,
  DocRaptorClientRuntime,
  DocRaptorFetch,
  DocRaptorIdempotencyMetadata,
  DocRaptorMedia,
  DocRaptorMode,
  DocRaptorPollAsyncRenderStatusOptions,
  DocRaptorRenderRequest,
  DocRaptorRequestMetadata,
  DocRaptorRequestOptions,
  DocRaptorSecretPolicy,
  DocRaptorSyncRenderResult,
} from './types';

export const docraptorClientBoundary = {
  packageName: '@asym/docraptor-client',
  maturity: 'phase-36-accessibility-metadata',
  owns: 'docraptor-client',
  runtime: 'server-only',
  secretPolicy: 'credentials-stay-server-side',
} as const;
