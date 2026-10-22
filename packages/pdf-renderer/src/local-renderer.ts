import {
  type DocumentPageSettings,
  type DocumentPageSettingsInput,
  DocumentPageSettingsSchema,
  type PdfTemplateSchemaBoundary,
} from '@asym/pdf-template-schema';

export type LocalRendererPackageName = '@asym/pdf-renderer/local-renderer';
export type LocalRendererMaturity = 'phase-35-local-renderer';
export type LocalRendererRuntime = 'node-dev-test-only';
export type LocalRendererOwnership = 'playwright-local-renderer';

export interface LocalRendererBoundary {
  readonly packageName: LocalRendererPackageName;
  readonly maturity: LocalRendererMaturity;
  readonly owns: LocalRendererOwnership;
  readonly runtime: LocalRendererRuntime;
  readonly consumes: readonly [PdfTemplateSchemaBoundary['packageName']];
}

export const localRendererBoundary: LocalRendererBoundary = {
  packageName: '@asym/pdf-renderer/local-renderer',
  maturity: 'phase-35-local-renderer',
  owns: 'playwright-local-renderer',
  runtime: 'node-dev-test-only',
  consumes: ['@asym/pdf-template-schema'],
};

export type PlaywrightLocalWaitUntil =
  | 'commit'
  | 'domcontentloaded'
  | 'load'
  | 'networkidle';

export interface PlaywrightLocalLaunchOptions {
  readonly headless?: boolean;
  readonly timeout?: number;
}

export interface PlaywrightLocalSetContentOptions {
  readonly waitUntil?: PlaywrightLocalWaitUntil;
  readonly timeout?: number;
}

export interface PlaywrightLocalPdfMargin {
  readonly top: string;
  readonly right: string;
  readonly bottom: string;
  readonly left: string;
}

export interface PlaywrightLocalPdfOptions {
  readonly width: string;
  readonly height: string;
  readonly margin: PlaywrightLocalPdfMargin;
  readonly printBackground: boolean;
  readonly preferCSSPageSize: boolean;
}

export interface PlaywrightLocalScreenshotOptions {
  readonly fullPage: boolean;
  readonly type: 'png';
}

export interface PlaywrightLocalPage {
  readonly setContent: (
    html: string,
    options: PlaywrightLocalSetContentOptions,
  ) => Promise<void>;
  readonly pdf: (options: PlaywrightLocalPdfOptions) => Promise<Uint8Array>;
  readonly screenshot?: (
    options: PlaywrightLocalScreenshotOptions,
  ) => Promise<Uint8Array>;
  readonly close?: () => Promise<void>;
}

export interface PlaywrightLocalBrowser {
  readonly newPage: () => Promise<PlaywrightLocalPage>;
  readonly close: () => Promise<void>;
}

export interface PlaywrightLocalBrowserLauncher {
  readonly launch: (
    options?: PlaywrightLocalLaunchOptions,
  ) => Promise<PlaywrightLocalBrowser>;
}

export type PlaywrightLocalRenderStatus = 'error' | 'skipped' | 'success';
export type PlaywrightLocalDiagnosticSeverity = 'error' | 'info' | 'warning';
export type PlaywrightLocalArtifactKind = 'pdf-bytes' | 'screenshot-png';

export interface PlaywrightLocalRenderDiagnostic {
  readonly code: string;
  readonly severity: PlaywrightLocalDiagnosticSeverity;
  readonly message: string;
  readonly source: 'local-renderer' | 'page-settings' | 'playwright';
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface PlaywrightLocalRenderArtifact {
  readonly kind: PlaywrightLocalArtifactKind;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
  readonly sizeBytes: number;
}

export interface PlaywrightLocalRenderMetadata {
  readonly renderer: 'playwright-local';
  readonly finalPdfFidelity: false;
  readonly productionRender: false;
  readonly productionRenderer: 'docraptor';
  readonly message: string;
  readonly page: PlaywrightLocalPageBox;
}

export interface PlaywrightLocalRenderResult {
  readonly status: PlaywrightLocalRenderStatus;
  readonly durationMs: number;
  readonly artifacts: readonly PlaywrightLocalRenderArtifact[];
  readonly diagnostics: readonly PlaywrightLocalRenderDiagnostic[];
  readonly warnings: readonly PlaywrightLocalRenderDiagnostic[];
  readonly errors: readonly PlaywrightLocalRenderDiagnostic[];
  readonly metadata: PlaywrightLocalRenderMetadata;
}

export interface PlaywrightLocalPageBox {
  readonly pageSize: DocumentPageSettings['pageSize'];
  readonly orientation: DocumentPageSettings['orientation'];
  readonly width: string;
  readonly height: string;
  readonly margins: DocumentPageSettings['margins'];
}

export interface RenderPlaywrightLocalPdfInput {
  readonly browserLauncher: PlaywrightLocalBrowserLauncher;
  readonly css?: string;
  readonly html: string;
  readonly includeScreenshot?: boolean;
  readonly launchOptions?: PlaywrightLocalLaunchOptions;
  readonly now?: () => number;
  readonly pageSettings?: DocumentPageSettingsInput;
  readonly setContentOptions?: PlaywrightLocalSetContentOptions;
}

const productionFidelityMessage =
  'Local Playwright output is for development smoke tests only. DocRaptor remains the production-fidelity renderer.';

const standardPageSizes = {
  a4: { width: '210mm', height: '297mm' },
  legal: { width: '8.5in', height: '14in' },
  letter: { width: '8.5in', height: '11in' },
} as const;

export async function renderPlaywrightLocalPdf(
  input: RenderPlaywrightLocalPdfInput,
): Promise<PlaywrightLocalRenderResult> {
  const now = input.now ?? defaultNow;
  const startedAt = now();
  const pageSettingsResult = DocumentPageSettingsSchema.safeParse(
    input.pageSettings ?? {},
  );

  if (!pageSettingsResult.success) {
    const page = resolvePageBox(DocumentPageSettingsSchema.parse({}));
    const diagnostics: readonly PlaywrightLocalRenderDiagnostic[] =
      pageSettingsResult.error.issues.map((issue) => ({
        code: 'invalid_page_settings',
        details: {
          issueCode: issue.code,
          path: issue.path.map(String),
        },
        message: issue.message,
        severity: 'error',
        source: 'page-settings',
      }));

    return createResult({
      artifacts: [],
      diagnostics,
      durationMs: measureDuration(startedAt, now),
      page,
      status: 'error',
    });
  }

  const pageBox = resolvePageBox(pageSettingsResult.data);
  const html = composeLocalRendererHtml(input.html, input.css);
  const setContentOptions = input.setContentOptions ?? {
    waitUntil: 'networkidle',
  };
  const launchOptions = input.launchOptions ?? {
    headless: true,
  };
  let browser: PlaywrightLocalBrowser | undefined;
  let page: PlaywrightLocalPage | undefined;

  try {
    browser = await input.browserLauncher.launch(launchOptions);
    page = await browser.newPage();

    await page.setContent(html, setContentOptions);

    const pdfBytes = await page.pdf(createPdfOptions(pageBox));
    const artifacts: PlaywrightLocalRenderArtifact[] = [
      createArtifact('pdf-bytes', 'application/pdf', pdfBytes),
    ];

    if (input.includeScreenshot) {
      if (!page.screenshot) {
        throw new Error(
          'The injected Playwright page does not support screenshot output.',
        );
      }

      const screenshotBytes = await page.screenshot({
        fullPage: true,
        type: 'png',
      });
      artifacts.push(
        createArtifact('screenshot-png', 'image/png', screenshotBytes),
      );
    }

    return createResult({
      artifacts,
      diagnostics: [],
      durationMs: measureDuration(startedAt, now),
      page: pageBox,
      status: 'success',
    });
  } catch (error) {
    const diagnostic = createRenderErrorDiagnostic(error);
    const status =
      diagnostic.code === 'playwright_browser_unavailable'
        ? 'skipped'
        : 'error';

    return createResult({
      artifacts: [],
      diagnostics: [diagnostic],
      durationMs: measureDuration(startedAt, now),
      page: pageBox,
      status,
    });
  } finally {
    await closePlaywrightPage(page);
    await closePlaywrightBrowser(browser);
  }
}

export function isPlaywrightBrowserUnavailable(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return [
    'browser executable',
    "executable doesn't exist",
    'please run playwright install',
    'browser has not been installed',
    'failed to launch',
    'enoent',
  ].some((pattern) => message.includes(pattern));
}

function composeLocalRendererHtml(
  html: string,
  css: string | undefined,
): string {
  const trimmedHtml = html.trim();

  if (isFullHtmlDocument(trimmedHtml)) {
    return css ? injectCssIntoHtmlDocument(trimmedHtml, css) : trimmedHtml;
  }

  const styleTag = css ? `<style>${css}</style>` : '';

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    styleTag,
    '</head>',
    '<body>',
    trimmedHtml,
    '</body>',
    '</html>',
  ].join('');
}

function isFullHtmlDocument(html: string): boolean {
  const normalizedHtml = html.toLowerCase();

  return (
    normalizedHtml.startsWith('<!doctype html') ||
    normalizedHtml.startsWith('<html')
  );
}

function injectCssIntoHtmlDocument(html: string, css: string): string {
  const styleTag = `<style>${css}</style>`;

  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}</head>`);
  }

  return `${styleTag}${html}`;
}

function createPdfOptions(
  page: PlaywrightLocalPageBox,
): PlaywrightLocalPdfOptions {
  return {
    height: page.height,
    margin: {
      bottom: page.margins.bottom,
      left: page.margins.left,
      right: page.margins.right,
      top: page.margins.top,
    },
    preferCSSPageSize: true,
    printBackground: true,
    width: page.width,
  };
}

function resolvePageBox(
  settings: DocumentPageSettings,
): PlaywrightLocalPageBox {
  const baseSize =
    settings.pageSize === 'custom'
      ? resolveCustomPageSize(settings)
      : standardPageSizes[settings.pageSize];
  const dimensions =
    settings.orientation === 'landscape'
      ? { height: baseSize.width, width: baseSize.height }
      : baseSize;

  return {
    height: dimensions.height,
    margins: settings.margins,
    orientation: settings.orientation,
    pageSize: settings.pageSize,
    width: dimensions.width,
  };
}

function resolveCustomPageSize(settings: DocumentPageSettings): {
  readonly height: string;
  readonly width: string;
} {
  const customSize = settings.customSize;

  if (!customSize) {
    throw new Error(
      'Invariant violation: customSize is required when pageSize is "custom".',
    );
  }

  return {
    height: `${customSize.height}${customSize.unit}`,
    width: `${customSize.width}${customSize.unit}`,
  };
}

function createRenderErrorDiagnostic(
  error: unknown,
): PlaywrightLocalRenderDiagnostic {
  const message = getErrorMessage(error);

  if (isPlaywrightBrowserUnavailable(error)) {
    return {
      code: 'playwright_browser_unavailable',
      message:
        'Playwright browser binaries are unavailable. Install browser binaries to enable local PDF smoke rendering.',
      severity: 'warning',
      source: 'playwright',
      details: {
        originalMessage: message,
      },
    };
  }

  return {
    code: 'local_renderer_failed',
    message,
    severity: 'error',
    source: 'local-renderer',
  };
}

function createArtifact(
  kind: PlaywrightLocalArtifactKind,
  mimeType: string,
  bytes: Uint8Array,
): PlaywrightLocalRenderArtifact {
  return {
    bytes,
    kind,
    mimeType,
    sizeBytes: bytes.byteLength,
  };
}

function createResult(input: {
  readonly artifacts: readonly PlaywrightLocalRenderArtifact[];
  readonly diagnostics: readonly PlaywrightLocalRenderDiagnostic[];
  readonly durationMs: number;
  readonly page: PlaywrightLocalPageBox;
  readonly status: PlaywrightLocalRenderStatus;
}): PlaywrightLocalRenderResult {
  return {
    artifacts: input.artifacts,
    diagnostics: input.diagnostics,
    durationMs: input.durationMs,
    errors: input.diagnostics.filter(
      (diagnostic) => diagnostic.severity === 'error',
    ),
    metadata: {
      finalPdfFidelity: false,
      message: productionFidelityMessage,
      page: input.page,
      productionRender: false,
      productionRenderer: 'docraptor',
      renderer: 'playwright-local',
    },
    status: input.status,
    warnings: input.diagnostics.filter(
      (diagnostic) => diagnostic.severity === 'warning',
    ),
  };
}

async function closePlaywrightPage(
  page: PlaywrightLocalPage | undefined,
): Promise<void> {
  if (!page?.close) {
    return;
  }

  await page.close();
}

async function closePlaywrightBrowser(
  browser: PlaywrightLocalBrowser | undefined,
): Promise<void> {
  if (!browser) {
    return;
  }

  await browser.close();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function measureDuration(startedAt: number, now: () => number): number {
  return Math.max(0, now() - startedAt);
}

function defaultNow(): number {
  return Date.now();
}
