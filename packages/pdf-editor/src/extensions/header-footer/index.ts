import {
  type DocumentHeaderFooterSettings,
  type DocumentHeaderFooterSettingsInput,
  DocumentHeaderFooterSettingsSchema,
} from '@asym/pdf-template-schema';

export type HeaderFooterPreviewStatus = 'invalid_header_footer' | 'valid';

export type HeaderFooterPreviewDiagnostic = {
  readonly code: 'invalid_header_footer';
  readonly severity: 'error';
  readonly message: string;
  readonly validationError: string;
};

export type HeaderFooterPreviewInput = DocumentHeaderFooterSettingsInput;

export interface HeaderFooterPreviewResult {
  readonly status: HeaderFooterPreviewStatus;
  readonly diagnostics: readonly HeaderFooterPreviewDiagnostic[];
  readonly settings?: DocumentHeaderFooterSettings;
}

export function getHeaderFooterPreview(
  input: HeaderFooterPreviewInput = {},
): HeaderFooterPreviewResult {
  const result = DocumentHeaderFooterSettingsSchema.safeParse(input);

  if (!result.success) {
    return {
      diagnostics: [
        {
          code: 'invalid_header_footer',
          message:
            'Phase 26 header/footer preview requires a valid header/footer contract.',
          severity: 'error',
          validationError: result.error.message,
        },
      ],
      status: 'invalid_header_footer',
    };
  }

  return {
    diagnostics: [],
    settings: result.data,
    status: 'valid',
  };
}

export function isValidDocumentHeaderFooterSettings(
  value: unknown,
): value is DocumentHeaderFooterSettings {
  return DocumentHeaderFooterSettingsSchema.safeParse(value).success;
}
