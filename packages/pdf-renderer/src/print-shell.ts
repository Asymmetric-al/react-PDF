import {
  type DocumentHeaderFooterSettings,
  type DocumentPageSettings,
  type DocumentPageSettingsInput,
  DocumentPageSettingsSchema,
  type DocumentTheme,
  type DocumentThemeInput,
  DocumentThemeSchema,
  type HeaderFooterContentToken,
  type HeaderFooterPlacement,
  type HeaderFooterRegion,
  type HeaderFooterScope,
  type PdfDocumentMetadata,
  type PdfDocumentMetadataInput,
  PdfDocumentMetadataSchema,
} from '@asym/pdf-template-schema';
import type {
  ComposePdfDocumentHtmlResult,
  PdfDocumentAssetReference,
  PdfDocumentCssRequirement,
  PdfDocumentRenderWarning,
  PdfDocumentVariableUsage,
} from './compose-pdf-document-html';

export interface PrintDocumentPageBox {
  readonly pageSize: DocumentPageSettings['pageSize'];
  readonly orientation: DocumentPageSettings['orientation'];
  readonly width: string;
  readonly height: string;
  readonly margins: DocumentPageSettings['margins'];
}

export interface ComposePrintDocumentHtmlInput {
  readonly title: string;
  readonly document: ComposePdfDocumentHtmlResult;
  readonly metadata?: PdfDocumentMetadataInput;
  readonly pageSettings?: DocumentPageSettingsInput;
  readonly theme?: DocumentThemeInput;
}

export interface ComposePrintDocumentHtmlResult {
  readonly html: string;
  readonly css: string;
  readonly cssRequirements: readonly PdfDocumentCssRequirement[];
  readonly warnings: readonly PdfDocumentRenderWarning[];
  readonly assets: readonly PdfDocumentAssetReference[];
  readonly variables: readonly PdfDocumentVariableUsage[];
  readonly page?: PrintDocumentPageBox;
}

const standardPageSizes = {
  letter: { width: '8.5in', height: '11in' },
  a4: { width: '210mm', height: '297mm' },
  legal: { width: '8.5in', height: '14in' },
} as const;

const printShellCssRequirementId = 'phase-10-print-shell';

type PageMarginBox = 'bottom-center' | 'top-center';

interface HeaderFooterRenderContext {
  readonly title: string;
  readonly theme: DocumentTheme;
}

interface HeaderFooterCssConfig {
  readonly pageRule: string;
  readonly firstPageRule?: string;
  readonly regionCss: readonly string[];
}

export function composePrintDocumentHtml(
  input: ComposePrintDocumentHtmlInput,
): ComposePrintDocumentHtmlResult {
  const pageSettingsResult = DocumentPageSettingsSchema.safeParse(
    input.pageSettings ?? {},
  );
  const themeResult = DocumentThemeSchema.safeParse(input.theme ?? {});
  const theme = themeResult.success
    ? themeResult.data
    : DocumentThemeSchema.parse({});
  const metadata = resolvePrintMetadata(input.title, input.metadata);

  if (!pageSettingsResult.success) {
    return {
      html: '',
      css: '',
      cssRequirements: [],
      page: undefined,
      warnings: [
        ...input.document.warnings,
        {
          code: 'invalid_page_settings',
          source: 'print-shell',
          severity: 'error',
          message: 'Phase 10 print shell received invalid page settings.',
          path: ['pageSettings'],
          details: {
            issues: pageSettingsResult.error.issues.map((issue) => ({
              message: issue.message,
              path: issue.path,
            })),
          },
        },
      ],
      assets: input.document.assets,
      variables: input.document.variables,
    };
  }

  const page = resolvePageBox(pageSettingsResult.data);
  const themeWarnings = createThemeWarnings(theme, themeResult);
  const headerFooterWarnings = createHeaderFooterMarginWarnings(
    pageSettingsResult.data.headerFooter,
    pageSettingsResult.data.margins,
  );
  const headerFooterHtml = renderHeaderFooterRegions(
    pageSettingsResult.data.headerFooter,
    {
      theme,
      title: input.title,
    },
  );
  const shellCss = composePrintShellCss(
    page,
    pageSettingsResult.data.headerFooter,
    theme,
  );
  const css = composeFullCss(input.document.cssRequirements, shellCss);
  const cssRequirements: readonly PdfDocumentCssRequirement[] = [
    ...input.document.cssRequirements,
    {
      id: printShellCssRequirementId,
      media: 'print',
      css: shellCss,
    },
  ];
  const escapedTitle = escapeHtml(metadata.title ?? input.title);
  const html = [
    '<!doctype html>',
    `<html lang="${escapeHtml(metadata.language)}">`,
  ];
  html.push(
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapedTitle}</title>`,
    ...renderMetadataElements(metadata),
    `<style>${css}</style>`,
    '</head>',
    renderElement(
      'body',
      createBodyAttributes(theme),
      `${headerFooterHtml}<main class="asym-print-document">${input.document.html}</main>`,
    ),
    '</html>',
  );

  return {
    html: html.join(''),
    css,
    cssRequirements,
    warnings: [
      ...input.document.warnings,
      ...headerFooterWarnings,
      ...themeWarnings,
    ],
    assets: input.document.assets,
    variables: input.document.variables,
    page,
  };
}

function resolvePrintMetadata(
  title: string,
  metadata: PdfDocumentMetadataInput | undefined,
): PdfDocumentMetadata {
  const parsedMetadata = PdfDocumentMetadataSchema.parse(metadata ?? {});

  return {
    ...parsedMetadata,
    title: parsedMetadata.title ?? title,
  };
}

function renderMetadataElements(
  metadata: PdfDocumentMetadata,
): readonly string[] {
  const elements: string[] = [];

  if (metadata.author) {
    elements.push(createMetaElement('author', metadata.author));
  }

  if (metadata.subject) {
    elements.push(createMetaElement('subject', metadata.subject));
  }

  if (metadata.keywords.length > 0) {
    elements.push(createMetaElement('keywords', metadata.keywords.join(', ')));
  }

  if (metadata.organization) {
    elements.push(createMetaElement('organization', metadata.organization));
  }

  elements.push(
    createMetaElement('generator', 'Asymmetric.al PDF Document Builder'),
  );

  return elements;
}

function createMetaElement(name: string, content: string): string {
  return `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`;
}

function resolvePageBox(settings: DocumentPageSettings): PrintDocumentPageBox {
  const size =
    settings.pageSize === 'custom'
      ? resolveCustomPageSize(settings)
      : standardPageSizes[settings.pageSize];
  const dimensions =
    settings.orientation === 'landscape'
      ? { width: size.height, height: size.width }
      : size;

  return {
    pageSize: settings.pageSize,
    orientation: settings.orientation,
    width: dimensions.width,
    height: dimensions.height,
    margins: settings.margins,
  };
}

function resolveCustomPageSize(settings: DocumentPageSettings): {
  readonly width: string;
  readonly height: string;
} {
  const customSize = settings.customSize;

  if (!customSize) {
    // The schema should reject custom page settings without customSize.
    throw new Error(
      'Invariant violation: customSize is required when pageSize is "custom".',
    );
  }

  return {
    width: `${customSize.width}${customSize.unit}`,
    height: `${customSize.height}${customSize.unit}`,
  };
}

function composeFullCss(
  serializerCssRequirements: readonly PdfDocumentCssRequirement[],
  shellCss: string,
): string {
  const serializerCss = serializerCssRequirements
    .map((requirement) => requirement.css.trim())
    .filter((css) => css.length > 0)
    .join('\n');

  return serializerCss ? `${serializerCss}\n${shellCss}` : shellCss;
}

function composePrintShellCss(
  page: PrintDocumentPageBox,
  headerFooter: DocumentHeaderFooterSettings,
  theme: DocumentTheme,
): string {
  const headerFooterCss = createHeaderFooterCss(page, headerFooter);
  const shellCss = [
    headerFooterCss.pageRule,
    ...(headerFooterCss.firstPageRule ? [headerFooterCss.firstPageRule] : []),
    createRootCssVariables(page, theme),
    'html,body{margin:0;padding:0;}',
    'body{background:var(--asym-brand-background);color:var(--asym-brand-text);font-family:var(--asym-font-body);}',
    '.asym-print-document{box-sizing:border-box;}',
    '.asym-print-document h1,.asym-print-document h2,.asym-print-document h3,.asym-print-document h4,.asym-print-document h5,.asym-print-document h6{color:var(--asym-brand-primary);font-family:var(--asym-font-heading);}',
    '.asym-print-document a{color:var(--asym-brand-accent);}',
    '.asym-page-region{box-sizing:border-box;font-size:9pt;line-height:1.3;}',
    '.asym-page-region-content{text-align:center;}',
    '.asym-page-region-token{display:inline;}',
    ...headerFooterCss.regionCss,
    '.asym-page-break{break-after:page;page-break-after:always;}',
    '.asym-page-break-before{break-before:page;page-break-before:always;}',
    '.asym-keep-together{break-inside:avoid;page-break-inside:avoid;}',
    '.asym-avoid-break-after{break-after:avoid;page-break-after:avoid;}',
    'table.asym-repeat-header thead{display:table-header-group;}',
    'table.asym-repeat-header tfoot{display:table-footer-group;}',
    '.asym-page-number::after{content:counter(page);}',
    '.asym-total-pages::after{content:counter(pages);}',
    '@media print{.asym-screen-only{display:none !important;}.asym-print-document{width:100%;}}',
  ].join('\n');

  return shellCss;
}

function createRootCssVariables(
  page: PrintDocumentPageBox,
  theme: DocumentTheme,
): string {
  const bodyFontStack = createFontStack([
    theme.fonts.body,
    ...theme.fonts.fallback,
  ]);
  const headingFontStack = createFontStack([
    theme.fonts.heading,
    ...theme.fonts.fallback,
  ]);

  return [
    ':root{',
    `--asym-page-width:${page.width};`,
    `--asym-page-height:${page.height};`,
    `--asym-page-margin-top:${page.margins.top};`,
    `--asym-page-margin-right:${page.margins.right};`,
    `--asym-page-margin-bottom:${page.margins.bottom};`,
    `--asym-page-margin-left:${page.margins.left};`,
    `--asym-brand-primary:${theme.colors.primary};`,
    `--asym-brand-accent:${theme.colors.accent};`,
    `--asym-brand-text:${theme.colors.text};`,
    `--asym-brand-background:${theme.colors.background};`,
    `--asym-font-body:${bodyFontStack};`,
    `--asym-font-heading:${headingFontStack};`,
    '}',
  ].join('');
}

function createBodyAttributes(
  theme: DocumentTheme,
): Readonly<Record<string, string>> {
  const attributes: Record<string, string> = {
    'data-asym-theme-name': theme.name,
    'data-asym-brand-source': theme.branding.source,
  };

  if (theme.branding.tenantBrandId) {
    attributes['data-asym-tenant-brand-id'] = theme.branding.tenantBrandId;
  }

  if (theme.organization.name) {
    attributes['data-asym-organization-name'] = theme.organization.name;
  }

  return attributes;
}

function createThemeWarnings(
  theme: DocumentTheme,
  themeResult: ReturnType<typeof DocumentThemeSchema.safeParse>,
): readonly PdfDocumentRenderWarning[] {
  const warnings: PdfDocumentRenderWarning[] = [];

  if (!themeResult.success) {
    warnings.push({
      code: 'invalid_theme',
      details: {
        issues: themeResult.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path,
        })),
      },
      message: 'Phase 28 print shell received invalid theme settings.',
      path: ['theme'],
      severity: 'error',
      source: 'print-shell',
    });
  }

  if (
    theme.fonts.fallback.length === 0 &&
    (!isGenericFontFamily(theme.fonts.body) ||
      !isGenericFontFamily(theme.fonts.heading))
  ) {
    warnings.push({
      code: 'missing_theme_font_fallback',
      details: {
        bodyFont: theme.fonts.body,
        headingFont: theme.fonts.heading,
      },
      message:
        'Phase 28 theme uses custom fonts without an approved fallback font stack.',
      path: ['theme', 'fonts', 'fallback'],
      severity: 'warning',
      source: 'print-shell',
    });
  }

  return warnings;
}

const genericFontFamilies: ReadonlySet<string> = new Set([
  'cursive',
  'emoji',
  'fangsong',
  'fantasy',
  'math',
  'monospace',
  'sans-serif',
  'serif',
  'system-ui',
  'ui-monospace',
  'ui-rounded',
  'ui-sans-serif',
  'ui-serif',
]);

function createFontStack(families: readonly string[]): string {
  const uniqueFamilies: string[] = [];

  for (const family of families) {
    const normalized = family.trim();

    if (!normalized || uniqueFamilies.includes(normalized)) {
      continue;
    }

    uniqueFamilies.push(normalized);
  }

  return uniqueFamilies.map(formatFontFamily).join(',');
}

function formatFontFamily(family: string): string {
  return isGenericFontFamily(family) ? family : `"${escapeCssString(family)}"`;
}

function isGenericFontFamily(family: string): boolean {
  return genericFontFamilies.has(family.trim().toLowerCase());
}

function escapeCssString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function renderHeaderFooterRegions(
  headerFooter: DocumentHeaderFooterSettings,
  context: HeaderFooterRenderContext,
): string {
  return headerFooter.regions
    .filter((region) => region.enabled)
    .map((region) => renderHeaderFooterRegion(region, context))
    .join('');
}

function renderHeaderFooterRegion(
  region: HeaderFooterRegion,
  context: HeaderFooterRenderContext,
): string {
  const contentHtml = region.content
    .map((token) => renderHeaderFooterToken(token, context))
    .join('');
  const className = [
    'asym-page-region',
    `asym-page-region-${region.placement}`,
    `asym-page-region-${toCssName(region.placement, region.scope)}`,
  ].join(' ');

  return renderElement(
    'div',
    {
      class: className,
      'data-asym-page-region': `${region.placement}:${region.scope}`,
      'data-page-region-placement': region.placement,
      'data-page-region-scope': region.scope,
    },
    renderElement(
      'div',
      {
        class: 'asym-page-region-content',
        'data-page-region-alignment': region.alignment,
        ...(region.alignment === 'center'
          ? {}
          : { style: `text-align:${region.alignment};` }),
      },
      contentHtml,
    ),
  );
}

function renderHeaderFooterToken(
  token: HeaderFooterContentToken,
  context: HeaderFooterRenderContext,
): string {
  if (token.kind === 'text') {
    return renderElement(
      'span',
      {
        class: 'asym-page-region-token',
        'data-asym-page-token': token.kind,
      },
      escapeHtml(token.text),
    );
  }

  if (token.kind === 'document_title') {
    return renderElement(
      'span',
      {
        class: 'asym-page-region-token',
        'data-asym-page-token': token.kind,
      },
      escapeHtml(context.title),
    );
  }

  if (token.kind === 'organization_footer') {
    return renderElement(
      'span',
      {
        class: 'asym-page-region-token',
        'data-asym-page-token': token.kind,
      },
      escapeHtml(context.theme?.footerText ?? token.fallbackText ?? ''),
    );
  }

  if (token.kind === 'page_number') {
    return renderElement(
      'span',
      {
        class: 'asym-page-region-token asym-page-number',
        'data-asym-page-token': token.kind,
      },
      '',
    );
  }

  return renderElement(
    'span',
    {
      class: 'asym-page-region-token asym-total-pages',
      'data-asym-page-token': token.kind,
    },
    '',
  );
}

function createHeaderFooterCss(
  page: PrintDocumentPageBox,
  headerFooter: DocumentHeaderFooterSettings,
): HeaderFooterCssConfig {
  const repeatingRules = createRepeatingPageRegionRules(headerFooter.regions);
  const firstPageRules = createFirstPageRegionRules(headerFooter.regions);
  const regionCss = createHeaderFooterRegionCss(headerFooter.regions);
  const pageRule = [
    '@page{size:',
    page.width,
    ' ',
    page.height,
    ';margin:',
    page.margins.top,
    ' ',
    page.margins.right,
    ' ',
    page.margins.bottom,
    ' ',
    page.margins.left,
    ';',
    repeatingRules,
    '}',
  ].join('');

  return {
    firstPageRule:
      firstPageRules.length > 0 ? `@page:first{${firstPageRules}}` : undefined,
    pageRule,
    regionCss,
  };
}

function createRepeatingPageRegionRules(
  regions: readonly HeaderFooterRegion[],
): string {
  return regions
    .filter((region) => region.enabled && region.scope === 'repeating')
    .map((region) => createPageRegionRule(region))
    .join('');
}

function createFirstPageRegionRules(
  regions: readonly HeaderFooterRegion[],
): string {
  return regions
    .filter((region) => region.scope === 'first_page')
    .map((region) =>
      region.enabled
        ? createPageRegionRule(region)
        : createDisabledPageRegionRule(region.placement),
    )
    .join('');
}

function createPageRegionRule(region: HeaderFooterRegion): string {
  return `@${getPageMarginBox(region.placement)}{content:element(${getRunningElementName(region.placement, region.scope)});}`;
}

function createDisabledPageRegionRule(
  placement: HeaderFooterPlacement,
): string {
  return `@${getPageMarginBox(placement)}{content:normal;}`;
}

function createHeaderFooterRegionCss(
  regions: readonly HeaderFooterRegion[],
): readonly string[] {
  return regions
    .filter((region) => region.enabled)
    .map(
      (region) =>
        `.asym-page-region-${toCssName(region.placement, region.scope)}{position:running(${getRunningElementName(region.placement, region.scope)});}`,
    );
}

function createHeaderFooterMarginWarnings(
  headerFooter: DocumentHeaderFooterSettings,
  margins: DocumentPageSettings['margins'],
): readonly PdfDocumentRenderWarning[] {
  const warnings: PdfDocumentRenderWarning[] = [];

  for (const [index, region] of headerFooter.regions.entries()) {
    if (!region.enabled) {
      continue;
    }

    const actualMargin =
      region.placement === 'header' ? margins.top : margins.bottom;
    const actualInches = convertLengthToInches(actualMargin);
    const minimumInches = convertLengthToInches(region.minimumMargin);

    if (actualInches === undefined || minimumInches === undefined) {
      continue;
    }

    if (actualInches >= minimumInches) {
      continue;
    }

    warnings.push({
      code: 'header_footer_margin_too_small',
      details: {
        actualMargin,
        minimumMargin: region.minimumMargin,
        placement: region.placement,
        scope: region.scope,
      },
      message:
        'Phase 26 header/footer output may overlap document content because the configured page margin is smaller than the region minimum.',
      path: ['pageSettings', 'headerFooter', 'regions', String(index)],
      severity: 'warning',
      source: 'print-shell',
    });
  }

  return warnings;
}

function convertLengthToInches(value: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)(in|cm|mm|pt|px)$/.exec(value);

  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(amount)) {
    return undefined;
  }

  if (unit === 'in') {
    return amount;
  }

  if (unit === 'cm') {
    return amount / 2.54;
  }

  if (unit === 'mm') {
    return amount / 25.4;
  }

  if (unit === 'pt') {
    return amount / 72;
  }

  return amount / 96;
}

function getPageMarginBox(placement: HeaderFooterPlacement): PageMarginBox {
  return placement === 'header' ? 'top-center' : 'bottom-center';
}

function getRunningElementName(
  placement: HeaderFooterPlacement,
  scope: HeaderFooterScope,
): string {
  if (placement === 'header' && scope === 'first_page') {
    return 'asymHeaderFirstPage';
  }

  if (placement === 'header') {
    return 'asymHeaderRepeating';
  }

  if (scope === 'first_page') {
    return 'asymFooterFirstPage';
  }

  return 'asymFooterRepeating';
}

function toCssName(
  placement: HeaderFooterPlacement,
  scope: HeaderFooterScope,
): string {
  if (scope === 'first_page') {
    return `${placement}-first-page`;
  }

  return `${placement}-repeating`;
}

function renderElement(
  tagName: string,
  attributes: Readonly<Record<string, string>>,
  childrenHtml: string,
): string {
  const attributesHtml = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join('');

  return `<${tagName}${attributesHtml}>${childrenHtml}</${tagName}>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
