import type {
  CalculatedTableTotal,
  CalculationDecimalValue,
  CalculationDiagnostic,
  ConditionalRule,
  DocumentAssetReference,
  DocumentAssetReferenceInput,
  DocumentAssetRole,
  DocumentAssetSourceMetadata,
  DocumentContentNode,
  DocumentPageBreakAttributes,
  DocumentPlaceholder,
  DocumentPlaceholderInput,
  FallbackBehavior,
  PageFlowControlAttributes,
  QrPlaceholderPayload,
  RegistryVariableDefinition,
  RepeaterBinding,
  RepeaterBindingInput,
  ResolvedTableCell,
  ResolvedTableRow,
  SummaryBlockBinding,
  SummaryBlockBindingInput,
  SummaryCalculationReference,
  TableBinding,
  TableBindingInput,
  TableColumnBinding,
  TableTotalBinding,
  VariableDataContext,
} from '@asym/pdf-template-schema';
import {
  ConditionalRuleSchema,
  calculateFinancialTotals,
  calculateGroupedTableTotals,
  calculateInvoiceTotals,
  calculateNumericAggregate,
  calculateTableTotals,
  DocumentAssetReferenceSchema,
  DocumentPageBreakAttributesSchema,
  DocumentPlaceholderSchema,
  formatVariableValue,
  getValueAtDataPath,
  PageFlowControlAttributesSchema,
  RepeaterBindingSchema,
  SummaryBlockBindingSchema,
  TableBindingSchema,
} from '@asym/pdf-template-schema';
import { evaluatePdfDocumentCondition } from './conditions';
import { resolvePdfDocumentTableRows } from './data-table';
import { resolvePdfDocumentRepeaterItems } from './repeaters';

export type PdfDocumentCssMedia = 'all' | 'print';

export interface PdfDocumentCssRequirement {
  readonly id: string;
  readonly media: PdfDocumentCssMedia;
  readonly css: string;
}

export type PdfDocumentRenderWarningCode =
  | 'empty_document'
  | 'invalid_page_settings'
  | 'invalid_theme'
  | 'invalid_document'
  | 'header_footer_margin_too_small'
  | 'invalid_page_break'
  | 'invalid_page_flow_placement'
  | 'invalid_placeholder'
  | 'missing_attribute'
  | 'invalid_asset_reference'
  | 'invalid_calculation_reference'
  | 'invalid_repeater_binding'
  | 'invalid_summary_block_binding'
  | 'invalid_table_binding'
  | 'asset_not_render_safe'
  | 'unsafe_url'
  | 'unsafe_asset_url'
  | 'unknown_mark'
  | 'unknown_node'
  | 'unsupported_mark'
  | 'unsupported_node'
  | 'condition_evaluation_error'
  | 'condition_evaluation_warning'
  | 'invalid_condition_rule'
  | 'missing_asset'
  | 'missing_asset_alt_text'
  | 'missing_condition_context'
  | 'missing_placeholder'
  | 'missing_placeholder_label'
  | 'missing_repeater_binding'
  | 'missing_repeater_context'
  | 'missing_repeater_source'
  | 'missing_summary_block_binding'
  | 'missing_summary_block_context'
  | 'missing_table_binding'
  | 'missing_table_context'
  | 'missing_table_source'
  | 'missing_theme_font_fallback'
  | 'non_array_repeater_source'
  | 'non_array_table_source'
  | 'pagination_hint_not_guaranteed'
  | 'repeater_filter_error'
  | 'repeater_filter_warning'
  | 'repeater_max_items_exceeded'
  | 'table_max_rows_exceeded'
  | 'unsupported_table_column_value';

export type PdfDocumentRenderWarningSeverity = 'warning' | 'error';
export type PdfDocumentRenderWarningSource = 'serializer' | 'print-shell';

export interface PdfDocumentRenderWarning {
  readonly source?: PdfDocumentRenderWarningSource;
  readonly code: PdfDocumentRenderWarningCode;
  readonly severity: PdfDocumentRenderWarningSeverity;
  readonly message: string;
  readonly path: readonly string[];
  readonly nodeType?: string;
  readonly markType?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface PdfDocumentAssetReference {
  readonly id?: string;
  readonly assetId?: string;
  readonly src: string;
  readonly altText?: string;
  readonly role?: string;
  readonly mimeType?: string;
  readonly width?: string;
  readonly height?: string;
  readonly alignment?: string;
  readonly linkUrl?: string;
  readonly renderSafe?: boolean;
  readonly tenantId?: string;
  readonly source?: DocumentAssetSourceMetadata;
  readonly path: readonly string[];
}

export interface PdfDocumentVariableUsage {
  readonly key: string;
  readonly formatter?: string;
  readonly fallback?: FallbackBehavior;
  readonly scopes?: readonly PdfDocumentVariableScope[];
  readonly path: readonly string[];
}

export interface PdfDocumentVariableScope {
  readonly sourcePath: string;
  readonly itemAlias: string;
  readonly sourceIndex: number;
  readonly renderedIndex: number;
  readonly indexAlias?: string;
}

export interface PdfDocumentMark {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
}

export interface PdfDocumentNodeRendererContext {
  readonly node: DocumentContentNode;
  readonly path: readonly string[];
  readonly childrenHtml: string;
  readonly assetRenderMode: PdfDocumentAssetRenderMode;
  readonly resolveAssetReference: (
    reference: PdfDocumentAssetLookupReference,
  ) => DocumentAssetReference | undefined;
  readonly renderChildren: (
    children: readonly unknown[] | undefined,
    path: readonly string[],
  ) => string;
  readonly addWarning: (warning: PdfDocumentRenderWarning) => void;
  readonly addAsset: (asset: PdfDocumentAssetReference) => void;
  readonly addVariable: (usage: PdfDocumentVariableUsage) => void;
}

export interface PdfDocumentAssetLookupReference {
  readonly assetId?: string;
  readonly referenceId?: string;
}

export interface PdfDocumentNodeRenderer {
  readonly type: string;
  readonly render: (context: PdfDocumentNodeRendererContext) => string;
}

export interface PdfDocumentMarkRendererContext {
  readonly mark: PdfDocumentMark;
  readonly node: DocumentContentNode;
  readonly path: readonly string[];
  readonly childrenHtml: string;
  readonly addWarning: (warning: PdfDocumentRenderWarning) => void;
}

export interface PdfDocumentMarkRenderer {
  readonly type: string;
  readonly render: (context: PdfDocumentMarkRendererContext) => string;
}

export interface ComposePdfDocumentHtmlInput {
  readonly document: DocumentContentNode;
  readonly assetReferences?: readonly DocumentAssetReferenceInput[];
  readonly assetRenderMode?: PdfDocumentAssetRenderMode;
  readonly dataContext?: VariableDataContext;
  readonly repeaterBindings?: readonly RepeaterBindingInput[];
  readonly tableBindings?: readonly TableBindingInput[];
  readonly summaryBlockBindings?: readonly SummaryBlockBindingInput[];
  readonly placeholderBindings?: readonly DocumentPlaceholderInput[];
  readonly nodeRenderers?: readonly PdfDocumentNodeRenderer[];
  readonly markRenderers?: readonly PdfDocumentMarkRenderer[];
}

export type PdfDocumentAssetRenderMode =
  | 'browser_preview'
  | 'production_render';

export type PdfDocumentAssetDiagnosticCode =
  | 'invalid_asset_reference'
  | 'missing_asset'
  | 'missing_asset_alt_text'
  | 'asset_not_render_safe'
  | 'unsafe_asset_url';

export type PdfDocumentAssetDiagnosticSeverity = 'warning' | 'error';

export interface PdfDocumentAssetDiagnostic {
  readonly code: PdfDocumentAssetDiagnosticCode;
  readonly severity: PdfDocumentAssetDiagnosticSeverity;
  readonly message: string;
  readonly path: readonly string[];
  readonly referenceId?: string;
  readonly assetId?: string;
  readonly role?: DocumentAssetRole;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface PreflightPdfDocumentAssetsInput {
  readonly assets?: readonly DocumentAssetReferenceInput[];
  readonly mode?: PdfDocumentAssetRenderMode;
}

export interface PreflightPdfDocumentAssetsResult {
  readonly diagnostics: readonly PdfDocumentAssetDiagnostic[];
  readonly assets: readonly DocumentAssetReference[];
}

export interface ComposePdfDocumentHtmlResult {
  readonly html: string;
  readonly cssRequirements: readonly PdfDocumentCssRequirement[];
  readonly warnings: readonly PdfDocumentRenderWarning[];
  readonly assets: readonly PdfDocumentAssetReference[];
  readonly variables: readonly PdfDocumentVariableUsage[];
}

type AttributeMap = Record<string, string>;
type StyleMap = Record<string, string>;

interface InvalidRepeaterBindingReference {
  readonly bindingId: string;
  readonly sourcePath: string;
  readonly validationError: string;
}

interface RepeaterBindingRegistry {
  readonly bindings: ReadonlyMap<string, RepeaterBinding>;
  readonly invalidBindings: ReadonlyMap<
    string,
    InvalidRepeaterBindingReference
  >;
}

type RepeaterBindingReadResult =
  | { readonly status: 'valid'; readonly binding: RepeaterBinding }
  | {
      readonly status: 'invalid';
      readonly reference: InvalidRepeaterBindingReference;
    }
  | { readonly status: 'missing' };

interface InvalidTableBindingReference {
  readonly bindingId: string;
  readonly sourcePath: string;
  readonly validationError: string;
}

interface TableBindingRegistry {
  readonly bindings: ReadonlyMap<string, TableBinding>;
  readonly invalidBindings: ReadonlyMap<string, InvalidTableBindingReference>;
}

type TableBindingReadResult =
  | { readonly status: 'valid'; readonly binding: TableBinding }
  | {
      readonly status: 'invalid';
      readonly reference: InvalidTableBindingReference;
    }
  | { readonly status: 'missing' };

interface InvalidSummaryBlockBindingReference {
  readonly bindingId: string;
  readonly validationError: string;
}

interface SummaryBlockBindingRegistry {
  readonly bindings: ReadonlyMap<string, SummaryBlockBinding>;
  readonly invalidBindings: ReadonlyMap<
    string,
    InvalidSummaryBlockBindingReference
  >;
}

type SummaryBlockBindingReadResult =
  | { readonly status: 'valid'; readonly binding: SummaryBlockBinding }
  | {
      readonly status: 'invalid';
      readonly reference: InvalidSummaryBlockBindingReference;
    }
  | { readonly status: 'missing' };

interface InvalidPlaceholderReference {
  readonly placeholderId: string;
  readonly validationError: string;
}

interface PlaceholderRegistry {
  readonly bindings: ReadonlyMap<string, DocumentPlaceholder>;
  readonly invalidBindings: ReadonlyMap<string, InvalidPlaceholderReference>;
}

type PlaceholderReadResult =
  | { readonly status: 'valid'; readonly placeholder: DocumentPlaceholder }
  | {
      readonly status: 'invalid';
      readonly reference: InvalidPlaceholderReference;
    }
  | { readonly status: 'missing' };

interface InvalidAssetReference {
  readonly referenceId: string;
  readonly assetId?: string;
  readonly role?: DocumentAssetRole;
  readonly validationError: string;
}

interface AssetReferenceRegistry {
  readonly byReferenceId: ReadonlyMap<string, DocumentAssetReference>;
  readonly byAssetId: ReadonlyMap<string, DocumentAssetReference>;
  readonly invalidReferences: readonly InvalidAssetReference[];
}

interface RenderState {
  readonly nodeRenderers: ReadonlyMap<string, PdfDocumentNodeRenderer>;
  readonly markRenderers: ReadonlyMap<string, PdfDocumentMarkRenderer>;
  readonly assetReferences: AssetReferenceRegistry;
  readonly assetRenderMode: PdfDocumentAssetRenderMode;
  readonly repeaterBindings: RepeaterBindingRegistry;
  readonly tableBindings: TableBindingRegistry;
  readonly summaryBlockBindings: SummaryBlockBindingRegistry;
  readonly placeholderBindings: PlaceholderRegistry;
  readonly ancestors: readonly string[];
  readonly dataContext?: VariableDataContext;
  readonly scopes: readonly PdfDocumentVariableScope[];
  readonly warnings: PdfDocumentRenderWarning[];
  readonly assets: PdfDocumentAssetReference[];
  readonly variables: PdfDocumentVariableUsage[];
}

const phase09Css = [
  '.pdf-button{display:inline-block;text-decoration:none;}',
  '.pdf-column{box-sizing:border-box;display:table-cell;vertical-align:top;width:50%;}',
  '.pdf-columns{box-sizing:border-box;display:table;width:100%;}',
  '.pdf-conditional-section{display:block;}',
  '.pdf-image{max-width:100%;}',
  '.pdf-asset-image--center{display:block;margin-left:auto;margin-right:auto;}',
  '.pdf-asset-image--full_width{display:block;width:100%;}',
  '.pdf-asset-image--right{display:block;margin-left:auto;}',
  '.pdf-repeater{display:block;}',
  '.pdf-repeater-empty{display:block;}',
  '.pdf-repeater-item{display:block;}',
  '.pdf-data-table{border-collapse:collapse;width:100%;}',
  '.pdf-data-table-empty{display:block;}',
  '.pdf-data-table-footer{display:table-footer-group;}',
  '.pdf-data-table-group-subtotal{font-weight:600;}',
  '.pdf-data-table-header{display:table-header-group;}',
  '.pdf-data-table-total-row{font-weight:700;}',
  '.pdf-document-placeholder{border:1px solid #6b7280;box-sizing:border-box;display:inline-flex;gap:0.375rem;padding:0.25rem 0.5rem;vertical-align:middle;}',
  '.pdf-document-placeholder-box{border:1px solid #111827;display:inline-block;height:0.8rem;width:0.8rem;}',
  '.pdf-document-placeholder-control{color:#6b7280;}',
  '.pdf-document-placeholder-label{font-weight:600;}',
  '.pdf-document-placeholder-line{border-bottom:1px solid #111827;display:inline-block;min-width:8rem;}',
  '.pdf-document-placeholder-qr-box{align-items:center;border:1px solid #111827;display:inline-flex;height:4rem;justify-content:center;width:4rem;}',
  '.pdf-avoid-break-after-heading{break-after:avoid;page-break-after:avoid;}',
  '.pdf-keep-together{break-inside:avoid;page-break-inside:avoid;}',
  '.pdf-page-break{break-after:page;height:0;page-break-after:always;}',
  '.pdf-start-on-new-page{break-before:page;page-break-before:always;}',
  '.pdf-summary-block{display:block;}',
  '.pdf-summary-list{margin:0;}',
  '.pdf-summary-item{display:grid;grid-template-columns:1fr auto;}',
  '.pdf-table{border-collapse:collapse;width:100%;}',
  '.pdf-table-row-avoid-break{break-inside:avoid;page-break-inside:avoid;}',
  '.pdf-variable{white-space:nowrap;}',
].join('\n');

const phase09CssRequirement: PdfDocumentCssRequirement = {
  id: 'phase-09-document-serializer',
  media: 'all',
  css: phase09Css,
};

const safeAlignmentValues: ReadonlySet<string> = new Set([
  'left',
  'center',
  'right',
  'justify',
]);

const safeHrefSchemes: ReadonlySet<string> = new Set([
  'http',
  'https',
  'mailto',
  'tel',
]);

export function composePdfDocumentHtml(
  input: ComposePdfDocumentHtmlInput,
): ComposePdfDocumentHtmlResult {
  const warnings: PdfDocumentRenderWarning[] = [];
  const assets: PdfDocumentAssetReference[] = [];
  const variables: PdfDocumentVariableUsage[] = [];
  const nodeRenderers = createNodeRendererMap(input.nodeRenderers);
  const markRenderers = createMarkRendererMap(input.markRenderers);
  const assetReferences = createAssetReferenceRegistry(input.assetReferences);
  const repeaterBindings = createRepeaterBindingRegistry(
    input.repeaterBindings,
  );
  const tableBindings = createTableBindingRegistry(input.tableBindings);
  const summaryBlockBindings = createSummaryBlockBindingRegistry(
    input.summaryBlockBindings,
  );
  const placeholderBindings = createPlaceholderRegistry(
    input.placeholderBindings,
  );
  const state: RenderState = {
    dataContext: input.dataContext,
    nodeRenderers,
    markRenderers,
    assetReferences,
    assetRenderMode: input.assetRenderMode ?? 'browser_preview',
    repeaterBindings,
    summaryBlockBindings,
    tableBindings,
    placeholderBindings,
    ancestors: [],
    scopes: [],
    warnings,
    assets,
    variables,
  };

  if (!isDocumentNode(input.document)) {
    warnings.push({
      code: 'invalid_document',
      severity: 'error',
      message:
        'Phase 09 composePdfDocumentHtml requires a structured document node.',
      path: [],
    });

    return {
      html: '',
      cssRequirements: [],
      warnings,
      assets,
      variables,
    };
  }

  if (isDocumentEmpty(input.document)) {
    warnings.push({
      code: 'empty_document',
      severity: 'warning',
      message: 'Phase 09 composePdfDocumentHtml received an empty document.',
      path: [],
      nodeType: input.document.type,
    });
  }

  for (const invalidReference of assetReferences.invalidReferences) {
    warnings.push({
      code: 'invalid_asset_reference',
      details: {
        validationError: invalidReference.validationError,
      },
      message: 'Phase 27 asset reference failed schema validation.',
      path: ['assetReferences', invalidReference.referenceId],
      severity: 'error',
    });
  }

  const html = renderNode(input.document, [], state);

  return {
    html,
    cssRequirements: [phase09CssRequirement],
    warnings,
    assets,
    variables,
  };
}

function createNodeRendererMap(
  customRenderers: readonly PdfDocumentNodeRenderer[] | undefined,
): ReadonlyMap<string, PdfDocumentNodeRenderer> {
  const renderers = new Map<string, PdfDocumentNodeRenderer>();

  for (const renderer of builtInNodeRenderers) {
    renderers.set(renderer.type, renderer);
  }

  for (const renderer of customRenderers ?? []) {
    renderers.set(renderer.type, renderer);
  }

  return renderers;
}

function createMarkRendererMap(
  customRenderers: readonly PdfDocumentMarkRenderer[] | undefined,
): ReadonlyMap<string, PdfDocumentMarkRenderer> {
  const renderers = new Map<string, PdfDocumentMarkRenderer>();

  for (const renderer of builtInMarkRenderers) {
    renderers.set(renderer.type, renderer);
  }

  for (const renderer of customRenderers ?? []) {
    renderers.set(renderer.type, renderer);
  }

  return renderers;
}

function createAssetReferenceRegistry(
  inputs: readonly DocumentAssetReferenceInput[] | undefined,
): AssetReferenceRegistry {
  const byReferenceId = new Map<string, DocumentAssetReference>();
  const byAssetId = new Map<string, DocumentAssetReference>();
  const invalidReferences: InvalidAssetReference[] = [];

  for (const [index, input] of (inputs ?? []).entries()) {
    const parseResult = DocumentAssetReferenceSchema.safeParse(input);

    if (!parseResult.success) {
      invalidReferences.push({
        assetId: typeof input.assetId === 'string' ? input.assetId : undefined,
        referenceId:
          typeof input.id === 'string' && input.id.length > 0
            ? input.id
            : String(index),
        role: isDocumentAssetRole(input.role) ? input.role : undefined,
        validationError:
          parseResult.error.issues[0]?.message ??
          'Unknown asset reference validation error.',
      });
      continue;
    }

    const asset = parseResult.data;
    byReferenceId.set(asset.id, asset);

    if (asset.assetId) {
      byAssetId.set(asset.assetId, asset);
    }
  }

  return {
    byAssetId,
    byReferenceId,
    invalidReferences,
  };
}

export function preflightPdfDocumentAssets(
  input: PreflightPdfDocumentAssetsInput,
): PreflightPdfDocumentAssetsResult {
  const mode = input.mode ?? 'browser_preview';
  const diagnostics: PdfDocumentAssetDiagnostic[] = [];
  const assets: DocumentAssetReference[] = [];

  for (const [index, assetInput] of (input.assets ?? []).entries()) {
    const path = ['assets', String(index)];
    const parseResult = DocumentAssetReferenceSchema.safeParse(assetInput);

    if (!parseResult.success) {
      diagnostics.push({
        code: 'invalid_asset_reference',
        message:
          parseResult.error.issues[0]?.message ??
          'Phase 27 asset preflight found an invalid asset reference.',
        path,
        severity: 'error',
      });
      continue;
    }

    const asset = parseResult.data;
    assets.push(asset);
    const src = resolveAssetSource(asset);

    if (mode === 'production_render') {
      if (!src) {
        diagnostics.push({
          assetId: asset.assetId,
          code: 'missing_asset',
          message:
            'Phase 27 asset preflight requires a render-safe URL before production rendering.',
          path,
          referenceId: asset.id,
          role: asset.role,
          severity: 'error',
        });
        continue;
      }
      if (isUnsafeProductionAssetUrl(src)) {
        diagnostics.push({
          code: 'unsafe_asset_url',
          message:
            'Phase 27 asset preflight rejected a blob URL for production rendering.',
          path: [
            ...path,
            src === asset.renderSafeUrl ? 'renderSafeUrl' : 'url',
          ],
          referenceId: asset.id,
          role: asset.role,
          severity: 'error',
        });
      } else if (!asset.renderSafe && !asset.renderSafeUrl) {
        diagnostics.push({
          assetId: asset.assetId,
          code: 'asset_not_render_safe',
          message:
            'Phase 27 asset preflight received a production asset that is not marked render-safe.',
          path,
          referenceId: asset.id,
          role: asset.role,
          severity: 'warning',
        });
      }
    }

    if (requiresAssetAltText(asset.role) && !hasNonEmptyString(asset.altText)) {
      diagnostics.push({
        assetId: asset.assetId,
        code: 'missing_asset_alt_text',
        message:
          'Phase 27 asset preflight recommends alt text for meaningful images.',
        path: [...path, 'altText'],
        referenceId: asset.id,
        role: asset.role,
        severity: 'warning',
      });
    }
  }

  return {
    assets,
    diagnostics,
  };
}

function createRepeaterBindingRegistry(
  bindings: readonly RepeaterBindingInput[] | undefined,
): RepeaterBindingRegistry {
  const bindingMap = new Map<string, RepeaterBinding>();
  const invalidBindings = new Map<string, InvalidRepeaterBindingReference>();

  for (const binding of bindings ?? []) {
    const result = RepeaterBindingSchema.safeParse(binding);

    if (result.success) {
      bindingMap.set(result.data.id, result.data);
      continue;
    }

    const reference = createInvalidRepeaterBindingReference(
      binding,
      result.error.message,
    );

    if (reference.bindingId) {
      invalidBindings.set(reference.bindingId, reference);
    }
  }

  return {
    bindings: bindingMap,
    invalidBindings,
  };
}

function createInvalidRepeaterBindingReference(
  binding: unknown,
  validationError: string,
): InvalidRepeaterBindingReference {
  const bindingRecord = isRecord(binding) ? binding : {};

  return {
    bindingId: readDiagnosticString(bindingRecord.id),
    sourcePath: readDiagnosticString(bindingRecord.sourcePath),
    validationError,
  };
}

function createTableBindingRegistry(
  bindings: readonly TableBindingInput[] | undefined,
): TableBindingRegistry {
  const bindingMap = new Map<string, TableBinding>();
  const invalidBindings = new Map<string, InvalidTableBindingReference>();

  for (const binding of bindings ?? []) {
    const result = TableBindingSchema.safeParse(binding);

    if (result.success) {
      bindingMap.set(result.data.id, result.data);
      continue;
    }

    const reference = createInvalidTableBindingReference(
      binding,
      result.error.message,
    );

    if (reference.bindingId) {
      invalidBindings.set(reference.bindingId, reference);
    }
  }

  return {
    bindings: bindingMap,
    invalidBindings,
  };
}

function createInvalidTableBindingReference(
  binding: unknown,
  validationError: string,
): InvalidTableBindingReference {
  const bindingRecord = isRecord(binding) ? binding : {};

  return {
    bindingId: readDiagnosticString(bindingRecord.id),
    sourcePath: readDiagnosticString(bindingRecord.sourcePath),
    validationError,
  };
}

function createSummaryBlockBindingRegistry(
  bindings: readonly SummaryBlockBindingInput[] | undefined,
): SummaryBlockBindingRegistry {
  const bindingMap = new Map<string, SummaryBlockBinding>();
  const invalidBindings = new Map<
    string,
    InvalidSummaryBlockBindingReference
  >();

  for (const binding of bindings ?? []) {
    const result = SummaryBlockBindingSchema.safeParse(binding);

    if (result.success) {
      bindingMap.set(result.data.id, result.data);
      continue;
    }

    const reference = createInvalidSummaryBlockBindingReference(
      binding,
      result.error.message,
    );

    if (reference.bindingId) {
      invalidBindings.set(reference.bindingId, reference);
    }
  }

  return {
    bindings: bindingMap,
    invalidBindings,
  };
}

function createInvalidSummaryBlockBindingReference(
  binding: unknown,
  validationError: string,
): InvalidSummaryBlockBindingReference {
  const bindingRecord = isRecord(binding) ? binding : {};

  return {
    bindingId: readDiagnosticString(bindingRecord.id),
    validationError,
  };
}

function createPlaceholderRegistry(
  placeholders: readonly DocumentPlaceholderInput[] | undefined,
): PlaceholderRegistry {
  const bindingMap = new Map<string, DocumentPlaceholder>();
  const invalidBindings = new Map<string, InvalidPlaceholderReference>();

  for (const placeholder of placeholders ?? []) {
    const result = DocumentPlaceholderSchema.safeParse(placeholder);

    if (result.success) {
      bindingMap.set(result.data.id, result.data);
      continue;
    }

    const reference = createInvalidPlaceholderReference(
      placeholder,
      result.error.message,
    );

    if (reference.placeholderId) {
      invalidBindings.set(reference.placeholderId, reference);
    }
  }

  return {
    bindings: bindingMap,
    invalidBindings,
  };
}

function createInvalidPlaceholderReference(
  placeholder: unknown,
  validationError: string,
): InvalidPlaceholderReference {
  const placeholderRecord = isRecord(placeholder) ? placeholder : {};

  return {
    placeholderId: readDiagnosticString(placeholderRecord.id),
    validationError,
  };
}

function renderNode(
  value: unknown,
  path: readonly string[],
  state: RenderState,
): string {
  if (!isDocumentNode(value)) {
    state.warnings.push({
      code: 'invalid_document',
      severity: 'error',
      message: 'Phase 09 serializer skipped an invalid document node.',
      path,
    });
    return '';
  }

  if (value.type === 'text') {
    return renderTextNode(value, path, state);
  }

  if (value.type === 'conditionalSection') {
    return renderConditionalSection(value, path, state);
  }

  if (value.type === 'repeater') {
    return renderRepeater(value, path, state);
  }

  if (value.type === 'dataTable') {
    return renderDataTable(value, path, state);
  }

  if (value.type === 'summaryBlock') {
    return renderSummaryBlock(value, path, state);
  }

  if (value.type === 'documentPlaceholder') {
    return renderDocumentPlaceholder(value, path, state);
  }

  if (value.type === 'pageBreak') {
    return renderPageBreak(value, path, state);
  }

  const childrenHtml = renderChildren(value.content, path, state, value.type);
  const renderer = state.nodeRenderers.get(value.type);

  if (renderer) {
    return renderer.render({
      node: value,
      path,
      childrenHtml,
      assetRenderMode: state.assetRenderMode,
      resolveAssetReference: (reference) =>
        resolveAssetReference(reference, state.assetReferences),
      renderChildren: (children, childPath) =>
        renderChildren(children, childPath, state, value.type),
      addWarning: (warning) => {
        state.warnings.push(warning);
      },
      addAsset: (asset) => {
        state.assets.push(asset);
      },
      addVariable: (usage) => {
        addVariableUsage(state, usage);
      },
    });
  }

  if (hasRenderableChildren(value)) {
    state.warnings.push({
      code: 'unknown_node',
      severity: 'warning',
      message: `Phase 09 serializer rendered children for unknown node "${value.type}".`,
      path,
      nodeType: value.type,
    });
    return childrenHtml;
  }

  state.warnings.push({
    code: 'unsupported_node',
    severity: 'warning',
    message: `Phase 09 serializer omitted unsupported leaf node "${value.type}".`,
    path,
    nodeType: value.type,
  });
  return '';
}

function renderRepeater(
  node: DocumentContentNode,
  path: readonly string[],
  state: RenderState,
): string {
  const bindingResult = readRepeaterBinding(node.attrs, state.repeaterBindings);

  if (bindingResult.status === 'invalid') {
    state.warnings.push({
      code: 'invalid_repeater_binding',
      details: {
        bindingId: bindingResult.reference.bindingId,
        sourcePath: bindingResult.reference.sourcePath,
        validationError: bindingResult.reference.validationError,
      },
      message:
        'Phase 17 repeater rendered author content once because the referenced binding is invalid.',
      nodeType: node.type,
      path,
      severity: 'error',
    });

    return renderRepeaterElement({
      binding: undefined,
      childrenHtml: renderChildren(node.content, path, state, node.type),
      node,
      path,
    });
  }

  if (bindingResult.status === 'missing') {
    state.warnings.push({
      code: 'missing_repeater_binding',
      message:
        'Phase 17 repeater rendered author content once because the binding is missing or invalid.',
      nodeType: node.type,
      path,
      severity: 'error',
    });

    return renderRepeaterElement({
      binding: undefined,
      childrenHtml: renderChildren(node.content, path, state, node.type),
      node,
      path,
    });
  }

  const binding = bindingResult.binding;

  if (!state.dataContext) {
    state.warnings.push({
      code: 'missing_repeater_context',
      message:
        'Phase 17 repeater rendered author content once because no data context was provided.',
      nodeType: node.type,
      path,
      severity: 'warning',
    });

    return renderRepeaterElement({
      binding,
      childrenHtml: renderChildren(node.content, path, state, node.type),
      node,
      path,
    });
  }

  const result = resolvePdfDocumentRepeaterItems({
    binding,
    context: state.dataContext,
    nodeType: node.type,
    path,
  });
  state.warnings.push(...result.warnings);

  if (result.items.length === 0) {
    return renderRepeaterElement({
      binding,
      childrenHtml: renderRepeaterEmptyState(binding),
      node,
      path,
    });
  }

  const childrenHtml = result.items
    .map((item) => {
      const scope: PdfDocumentVariableScope = {
        itemAlias: binding.itemAlias,
        renderedIndex: item.renderedIndex,
        sourceIndex: item.sourceIndex,
        sourcePath: binding.sourcePath,
        ...(binding.indexAlias ? { indexAlias: binding.indexAlias } : {}),
      };
      const itemState: RenderState = {
        ...state,
        dataContext: item.context,
        scopes: [...state.scopes, scope],
      };
      const itemHtml = renderChildren(
        node.content,
        [...path, 'items', String(item.renderedIndex)],
        itemState,
        node.type,
      );

      return renderElement(
        'div',
        {
          class: 'pdf-repeater-item',
          'data-repeater-rendered-index': String(item.renderedIndex),
          'data-repeater-source-index': String(item.sourceIndex),
        },
        itemHtml,
      );
    })
    .join('');

  return renderRepeaterElement({
    binding,
    childrenHtml,
    node,
    path,
  });
}

function renderRepeaterElement(input: {
  readonly binding: RepeaterBinding | undefined;
  readonly childrenHtml: string;
  readonly node: DocumentContentNode;
  readonly path: readonly string[];
}): string {
  return renderElement(
    'section',
    {
      ...getElementAttributes(input.node, {
        className: 'pdf-repeater',
        excludedAttributeNames: ['binding', 'bindingId'],
      }),
      'data-asym-repeater': 'true',
      'data-repeater-path': input.path.join('.'),
      ...(input.binding
        ? {
            'data-repeater-binding-id': input.binding.id,
            'data-repeater-item-alias': input.binding.itemAlias,
            'data-repeater-source-path': input.binding.sourcePath,
          }
        : {}),
    },
    input.childrenHtml,
  );
}

function renderRepeaterEmptyState(binding: RepeaterBinding): string {
  if (!binding.emptyState) {
    return '';
  }

  return renderElement(
    'div',
    {
      class: 'pdf-repeater-empty',
      'data-repeater-empty-state': 'true',
    },
    escapeHtml(binding.emptyState),
  );
}

function renderDataTable(
  node: DocumentContentNode,
  path: readonly string[],
  state: RenderState,
): string {
  const bindingResult = readTableBinding(node.attrs, state.tableBindings);

  if (bindingResult.status === 'invalid') {
    state.warnings.push({
      code: 'invalid_table_binding',
      details: {
        bindingId: bindingResult.reference.bindingId,
        sourcePath: bindingResult.reference.sourcePath,
        validationError: bindingResult.reference.validationError,
      },
      message:
        'Phase 20 data table renderer emitted a diagnostic placeholder because the referenced binding is invalid.',
      nodeType: node.type,
      path,
      severity: 'error',
    });

    return renderDataTableShell({
      binding: undefined,
      bodyHtml: '',
      node,
      path,
      totalPlaceholdersHtml: '',
    });
  }

  if (bindingResult.status === 'missing') {
    state.warnings.push({
      code: 'missing_table_binding',
      message:
        'Phase 20 data table renderer emitted a diagnostic placeholder because the binding is missing or invalid.',
      nodeType: node.type,
      path,
      severity: 'error',
    });

    return renderDataTableShell({
      binding: undefined,
      bodyHtml: '',
      node,
      path,
      totalPlaceholdersHtml: '',
    });
  }

  const binding = bindingResult.binding;

  if (!state.dataContext) {
    state.warnings.push({
      code: 'missing_table_context',
      message:
        'Phase 20 data table renderer emitted headers and placeholders because no data context was provided.',
      nodeType: node.type,
      path,
      severity: 'warning',
    });

    return renderDataTableShell({
      binding,
      bodyHtml: renderDataTableEmptyState(binding),
      node,
      path,
      totalPlaceholdersHtml: renderDataTableTotalPlaceholders(binding),
    });
  }

  const result = resolvePdfDocumentTableRows({
    binding,
    context: state.dataContext,
    nodeType: node.type,
    path,
  });
  state.warnings.push(...result.warnings);

  const totals = canCalculateDataTableTotals(result.warnings)
    ? resolveRenderedTableTotals({
        binding,
        context: state.dataContext,
        nodeType: node.type,
        path,
        state,
      })
    : [];
  const bodyHtml =
    result.rows.length === 0
      ? renderDataTableEmptyState(binding)
      : renderDataTableBodyRows({
          binding,
          nodeType: node.type,
          path,
          rows: result.rows,
          state,
          totals,
        });

  return renderDataTableShell({
    binding,
    bodyHtml,
    node,
    path,
    totalPlaceholdersHtml: totals.length
      ? renderDataTableTotalRows(binding, totals)
      : renderDataTableTotalPlaceholders(binding),
  });
}

interface RenderedTableTotal {
  readonly column: TableColumnBinding;
  readonly total: CalculatedTableTotal;
  readonly displayValue: string;
}

interface RenderedSummaryItem {
  readonly key: string;
  readonly label: string;
  readonly value: CalculationDecimalValue;
  readonly displayValue: string;
  readonly sourcePath?: string;
  readonly fieldPath?: string;
  readonly groupKey?: string;
}

function canCalculateDataTableTotals(
  warnings: readonly PdfDocumentRenderWarning[],
): boolean {
  return !warnings.some(
    (warning) =>
      warning.code === 'missing_table_source' ||
      warning.code === 'non_array_table_source' ||
      warning.code === 'invalid_table_binding',
  );
}

function resolveRenderedTableTotals(input: {
  readonly binding: TableBinding;
  readonly context: VariableDataContext;
  readonly nodeType: string;
  readonly path: readonly string[];
  readonly state: RenderState;
}): readonly RenderedTableTotal[] {
  if (input.binding.totals.length === 0) {
    return [];
  }

  const result = calculateTableTotals({
    context: input.context,
    tableBinding: input.binding,
  });
  pushCalculationDiagnostics({
    bindingId: input.binding.id,
    diagnostics: result.diagnostics,
    nodeType: input.nodeType,
    path: input.path,
    state: input.state,
  });

  return result.totals.flatMap((total) => {
    if (!total.value) {
      return [];
    }

    const column = input.binding.columns.find(
      (candidate) => candidate.key === total.columnKey,
    );

    if (!column) {
      return [];
    }

    return [
      {
        column,
        displayValue: formatCalculationValue({
          formatter: resolveCalculationFormatter(column, total.operation),
          key: `table.${input.binding.id}.${total.columnKey}.${total.operation}`,
          label: total.label ?? column.label,
          path: input.path,
          sourcePath: input.binding.sourcePath,
          state: input.state,
          value: total.value,
        }),
        total,
      },
    ];
  });
}

function renderDataTableBodyRows(input: {
  readonly binding: TableBinding;
  readonly rows: readonly ResolvedTableRow[];
  readonly totals: readonly RenderedTableTotal[];
  readonly state: RenderState;
  readonly path: readonly string[];
  readonly nodeType: string;
}): string {
  if (!input.binding.grouping || input.totals.length === 0) {
    return renderDataTableRows(input.rows, input.binding.avoidRowSplit);
  }

  return renderDataTableGroupedRows(input);
}

function renderDataTableGroupedRows(input: {
  readonly binding: TableBinding;
  readonly rows: readonly ResolvedTableRow[];
  readonly totals: readonly RenderedTableTotal[];
  readonly state: RenderState;
  readonly path: readonly string[];
  readonly nodeType: string;
}): string {
  const grouping = input.binding.grouping;

  if (!grouping || !input.state.dataContext) {
    return renderDataTableRows(input.rows, input.binding.avoidRowSplit);
  }

  const groups = groupRows(input.rows, grouping.fieldPath);
  const subtotalByColumn = createGroupedSubtotalMap({
    binding: input.binding,
    context: input.state.dataContext,
    nodeType: input.nodeType,
    path: input.path,
    state: input.state,
    totals: input.totals,
  });

  return groups
    .map((group) => {
      const rowsHtml = renderDataTableRows(
        group.rows,
        input.binding.avoidRowSplit,
      );
      const subtotalRowsHtml = input.totals
        .flatMap((renderedTotal) => {
          const subtotal = subtotalByColumn
            .get(renderedTotal.total.columnKey)
            ?.get(group.key);

          if (!subtotal) {
            return [];
          }

          const label = `${group.label} subtotal`;
          const displayValue = formatCalculationValue({
            formatter: resolveCalculationFormatter(
              renderedTotal.column,
              renderedTotal.total.operation,
            ),
            key: `table.${input.binding.id}.${renderedTotal.total.columnKey}.${group.key}.subtotal`,
            label,
            path: input.path,
            sourcePath: input.binding.sourcePath,
            state: input.state,
            value: subtotal.total,
          });

          return [
            renderDataTableTotalRow({
              binding: input.binding,
              className: 'pdf-data-table-group-subtotal',
              column: renderedTotal.column,
              avoidRowSplit: input.binding.avoidRowSplit,
              extraAttributes: {
                'data-table-group-key': group.key,
                'data-table-total-decimal': subtotal.total.decimal,
                'data-table-total-minor-units': subtotal.total.minorUnits,
                'data-table-total-scale': String(subtotal.total.scale),
              },
              label,
              value: displayValue,
            }),
          ];
        })
        .join('');

      return `${rowsHtml}${subtotalRowsHtml}`;
    })
    .join('');
}

function createGroupedSubtotalMap(input: {
  readonly binding: TableBinding;
  readonly totals: readonly RenderedTableTotal[];
  readonly context: VariableDataContext;
  readonly state: RenderState;
  readonly path: readonly string[];
  readonly nodeType: string;
}): ReadonlyMap<
  string,
  ReadonlyMap<string, { readonly total: CalculationDecimalValue }>
> {
  const grouping = input.binding.grouping;
  const groupedTotals = new Map<
    string,
    ReadonlyMap<string, { readonly total: CalculationDecimalValue }>
  >();

  if (!grouping) {
    return groupedTotals;
  }

  for (const renderedTotal of input.totals) {
    const result = calculateGroupedTableTotals({
      context: input.context,
      groupPath: grouping.fieldPath,
      sourcePath: input.binding.sourcePath,
      valuePath: renderedTotal.column.sourcePath,
    });
    pushCalculationDiagnostics({
      bindingId: input.binding.id,
      diagnostics: result.diagnostics,
      nodeType: input.nodeType,
      path: input.path,
      state: input.state,
    });
    const groupTotals = new Map(
      result.groups.map((group) => [
        group.key,
        {
          total: group.total,
        },
      ]),
    );

    groupedTotals.set(renderedTotal.total.columnKey, groupTotals);
  }

  return groupedTotals;
}

function groupRows(
  rows: readonly ResolvedTableRow[],
  groupPath: string,
): readonly {
  readonly key: string;
  readonly label: string;
  readonly rows: readonly ResolvedTableRow[];
}[] {
  const order: string[] = [];
  const groups = new Map<string, ResolvedTableRow[]>();

  for (const row of rows) {
    const lookup = getValueAtDataPath(
      isRecord(row.value) ? row.value : {},
      groupPath,
    );
    const key =
      lookup.found && lookup.value !== undefined && lookup.value !== null
        ? String(lookup.value)
        : '';

    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }

    groups.get(key)?.push(row);
  }

  return order.map((key) => ({
    key,
    label: key || 'Ungrouped',
    rows: groups.get(key) ?? [],
  }));
}

function renderSummaryBlock(
  node: DocumentContentNode,
  path: readonly string[],
  state: RenderState,
): string {
  const bindingResult = readSummaryBlockBinding(
    node.attrs,
    state.summaryBlockBindings,
  );

  if (bindingResult.status === 'invalid') {
    state.warnings.push({
      code: 'invalid_summary_block_binding',
      details: {
        bindingId: bindingResult.reference.bindingId,
        validationError: bindingResult.reference.validationError,
      },
      message:
        'Phase 23 summary block rendered without values because the referenced binding is invalid.',
      nodeType: node.type,
      path,
      severity: 'error',
    });

    return renderSummaryBlockShell({
      binding: undefined,
      items: [],
      node,
      path,
    });
  }

  if (bindingResult.status === 'missing') {
    state.warnings.push({
      code: 'missing_summary_block_binding',
      message:
        'Phase 23 summary block rendered without values because the binding is missing or invalid.',
      nodeType: node.type,
      path,
      severity: 'error',
    });

    return renderSummaryBlockShell({
      binding: undefined,
      items: [],
      node,
      path,
    });
  }

  const binding = bindingResult.binding;

  if (!state.dataContext) {
    state.warnings.push({
      code: 'missing_summary_block_context',
      message:
        'Phase 23 summary block rendered without values because no data context was provided.',
      nodeType: node.type,
      path,
      severity: 'warning',
    });

    return renderSummaryBlockShell({
      binding,
      items: [],
      node,
      path,
    });
  }

  return renderSummaryBlockShell({
    binding,
    items: resolveSummaryBlockItems({
      binding,
      context: state.dataContext,
      nodeType: node.type,
      path,
      state,
    }),
    node,
    path,
  });
}

function renderDocumentPlaceholder(
  node: DocumentContentNode,
  path: readonly string[],
  state: RenderState,
): string {
  const placeholderResult = readDocumentPlaceholder(
    node.attrs,
    state.placeholderBindings,
  );

  if (placeholderResult.status === 'invalid') {
    state.warnings.push({
      code: 'invalid_placeholder',
      details: {
        placeholderId: placeholderResult.reference.placeholderId,
        validationError: placeholderResult.reference.validationError,
      },
      message:
        'Phase 24 document placeholder was omitted because the referenced placeholder contract is invalid.',
      nodeType: node.type,
      path,
      severity: 'error',
    });

    return '';
  }

  if (placeholderResult.status === 'missing') {
    state.warnings.push({
      code: 'missing_placeholder',
      message:
        'Phase 24 document placeholder was omitted because the placeholder contract is missing or invalid.',
      nodeType: node.type,
      path,
      severity: 'error',
    });

    return '';
  }

  const placeholder = placeholderResult.placeholder;

  if (!placeholder.label) {
    state.warnings.push({
      code: 'missing_placeholder_label',
      details: {
        kind: placeholder.kind,
        placeholderId: placeholder.id,
      },
      message:
        'Phase 24 document placeholder rendered with a fallback label because no label was provided.',
      nodeType: node.type,
      path,
      severity: 'warning',
    });
  }

  return renderDocumentPlaceholderElement(placeholder);
}

function renderPageBreak(
  node: DocumentContentNode,
  path: readonly string[],
  state: RenderState,
): string {
  const result = DocumentPageBreakAttributesSchema.safeParse(node.attrs ?? {});

  if (!result.success) {
    state.warnings.push({
      code: 'invalid_page_break',
      details: {
        validationError: result.error.message,
      },
      message:
        'Phase 25 page break was omitted because its structured attributes are invalid.',
      nodeType: node.type,
      path,
      severity: 'error',
    });

    return '';
  }

  if (isInvalidPageBreakPlacement(state.ancestors)) {
    state.warnings.push({
      code: 'invalid_page_flow_placement',
      details: {
        ancestors: state.ancestors,
      },
      message:
        'Phase 25 page break is nested inside content that may not honor block pagination.',
      nodeType: node.type,
      path,
      severity: 'warning',
    });
  }

  return renderPageBreakElement(result.data);
}

function renderPageBreakElement(attrs: DocumentPageBreakAttributes): string {
  return renderElement(
    'div',
    {
      'aria-hidden': 'true',
      class: 'pdf-page-break',
      'data-asym-page-break': 'true',
      ...(attrs.id ? { 'data-page-break-id': attrs.id } : {}),
      ...(attrs.label ? { 'data-page-break-label': attrs.label } : {}),
    },
    '',
  );
}

function resolveSummaryBlockItems(input: {
  readonly binding: SummaryBlockBinding;
  readonly context: VariableDataContext;
  readonly state: RenderState;
  readonly path: readonly string[];
  readonly nodeType: string;
}): readonly RenderedSummaryItem[] {
  const calculation = input.binding.calculation;

  switch (calculation.type) {
    case 'total_contributions':
      return resolveTotalContributionsSummary(input, calculation);
    case 'invoice_totals':
      return resolveInvoiceSummary(input, calculation);
    case 'financial_report_totals':
      return resolveFinancialReportSummary(input, calculation);
    case 'grouped_subtotals':
      return resolveGroupedSubtotalSummary(input, calculation);
    case 'grand_total':
      return resolveGrandTotalSummary(input, calculation);
    case 'table_total':
      return resolveTableTotalSummary(input, calculation);
  }
}

function resolveTotalContributionsSummary(
  input: {
    readonly binding: SummaryBlockBinding;
    readonly context: VariableDataContext;
    readonly state: RenderState;
    readonly path: readonly string[];
    readonly nodeType: string;
  },
  calculation: Extract<
    SummaryCalculationReference,
    { readonly type: 'total_contributions' }
  >,
): readonly RenderedSummaryItem[] {
  const result = calculateNumericAggregate({
    context: input.context,
    operation: 'sum',
    precision: input.binding.precision,
    sourcePath: calculation.sourcePath,
    valuePath: calculation.amountPath,
  });
  pushCalculationDiagnostics({
    bindingId: input.binding.id,
    diagnostics: result.diagnostics,
    nodeType: input.nodeType,
    path: input.path,
    state: input.state,
  });

  if (!result.value) {
    return [];
  }

  return [
    createRenderedSummaryItem({
      binding: input.binding,
      fieldPath: calculation.amountPath,
      key: 'total_contributions',
      label: calculation.label ?? 'Total contributions',
      path: input.path,
      sourcePath: calculation.sourcePath,
      state: input.state,
      value: result.value,
    }),
  ];
}

function resolveInvoiceSummary(
  input: {
    readonly binding: SummaryBlockBinding;
    readonly context: VariableDataContext;
    readonly state: RenderState;
    readonly path: readonly string[];
    readonly nodeType: string;
  },
  calculation: Extract<
    SummaryCalculationReference,
    { readonly type: 'invoice_totals' }
  >,
): readonly RenderedSummaryItem[] {
  const result = calculateInvoiceTotals({
    amountPath: calculation.amountPath,
    context: input.context,
    discountPath: calculation.discountPath,
    lineItemsPath: calculation.lineItemsPath,
    precision: input.binding.precision,
    quantityPath: calculation.quantityPath,
    ratePath: calculation.ratePath,
    taxPath: calculation.taxPath,
  });
  pushCalculationDiagnostics({
    bindingId: input.binding.id,
    diagnostics: result.diagnostics,
    nodeType: input.nodeType,
    path: input.path,
    state: input.state,
  });

  const values = {
    discounts: result.discounts,
    subtotal: result.subtotal,
    taxes: result.taxes,
    total: result.total,
  } as const;
  const defaultLabels = {
    discounts: 'Discount',
    subtotal: 'Subtotal',
    taxes: 'Tax',
    total: 'Total',
  } as const;

  return calculation.fields.map((field) =>
    createRenderedSummaryItem({
      binding: input.binding,
      fieldPath: field,
      key: field,
      label: calculation.labels?.[field] ?? defaultLabels[field],
      path: input.path,
      sourcePath: calculation.lineItemsPath,
      state: input.state,
      value: values[field],
    }),
  );
}

function resolveFinancialReportSummary(
  input: {
    readonly binding: SummaryBlockBinding;
    readonly context: VariableDataContext;
    readonly state: RenderState;
    readonly path: readonly string[];
    readonly nodeType: string;
  },
  calculation: Extract<
    SummaryCalculationReference,
    { readonly type: 'financial_report_totals' }
  >,
): readonly RenderedSummaryItem[] {
  const result = calculateFinancialTotals({
    amountPath: calculation.amountPath,
    categoryPath: calculation.categoryPath,
    context: input.context,
    expenseCategories: calculation.expenseCategories,
    incomeCategories: calculation.incomeCategories,
    precision: input.binding.precision,
    sourcePath: calculation.sourcePath,
  });
  pushCalculationDiagnostics({
    bindingId: input.binding.id,
    diagnostics: result.diagnostics,
    nodeType: input.nodeType,
    path: input.path,
    state: input.state,
  });

  const values = {
    expense: result.expense,
    income: result.income,
    net: result.net,
  } as const;
  const defaultLabels = {
    expense: 'Expense',
    income: 'Income',
    net: 'Net',
  } as const;

  return calculation.fields.map((field) =>
    createRenderedSummaryItem({
      binding: input.binding,
      fieldPath: field,
      key: field,
      label: calculation.labels?.[field] ?? defaultLabels[field],
      path: input.path,
      sourcePath: calculation.sourcePath,
      state: input.state,
      value: values[field],
    }),
  );
}

function resolveGroupedSubtotalSummary(
  input: {
    readonly binding: SummaryBlockBinding;
    readonly context: VariableDataContext;
    readonly state: RenderState;
    readonly path: readonly string[];
    readonly nodeType: string;
  },
  calculation: Extract<
    SummaryCalculationReference,
    { readonly type: 'grouped_subtotals' }
  >,
): readonly RenderedSummaryItem[] {
  const result = calculateGroupedTableTotals({
    context: input.context,
    groupPath: calculation.groupPath,
    precision: input.binding.precision,
    sourcePath: calculation.sourcePath,
    valuePath: calculation.valuePath,
  });
  pushCalculationDiagnostics({
    bindingId: input.binding.id,
    diagnostics: result.diagnostics,
    nodeType: input.nodeType,
    path: input.path,
    state: input.state,
  });
  const groupItems = result.groups.map((group) =>
    createRenderedSummaryItem({
      binding: input.binding,
      fieldPath: calculation.valuePath,
      groupKey: group.key,
      key: `group.${group.key}`,
      label: calculation.labels?.[group.key] ?? group.label,
      path: input.path,
      sourcePath: calculation.sourcePath,
      state: input.state,
      value: group.total,
    }),
  );

  if (!calculation.includeGrandTotal) {
    return groupItems;
  }

  return [
    ...groupItems,
    createRenderedSummaryItem({
      binding: input.binding,
      fieldPath: calculation.valuePath,
      key: 'grand_total',
      label: calculation.grandTotalLabel ?? 'Grand total',
      path: input.path,
      sourcePath: calculation.sourcePath,
      state: input.state,
      value: result.grandTotal,
    }),
  ];
}

function resolveGrandTotalSummary(
  input: {
    readonly binding: SummaryBlockBinding;
    readonly context: VariableDataContext;
    readonly state: RenderState;
    readonly path: readonly string[];
    readonly nodeType: string;
  },
  calculation: Extract<
    SummaryCalculationReference,
    { readonly type: 'grand_total' }
  >,
): readonly RenderedSummaryItem[] {
  const result = calculateGroupedTableTotals({
    context: input.context,
    groupPath: calculation.groupPath,
    precision: input.binding.precision,
    sourcePath: calculation.sourcePath,
    valuePath: calculation.valuePath,
  });
  pushCalculationDiagnostics({
    bindingId: input.binding.id,
    diagnostics: result.diagnostics,
    nodeType: input.nodeType,
    path: input.path,
    state: input.state,
  });

  return [
    createRenderedSummaryItem({
      binding: input.binding,
      fieldPath: calculation.valuePath,
      key: 'grand_total',
      label: calculation.label ?? 'Grand total',
      path: input.path,
      sourcePath: calculation.sourcePath,
      state: input.state,
      value: result.grandTotal,
    }),
  ];
}

function resolveTableTotalSummary(
  input: {
    readonly binding: SummaryBlockBinding;
    readonly context: VariableDataContext;
    readonly state: RenderState;
    readonly path: readonly string[];
    readonly nodeType: string;
  },
  calculation: Extract<
    SummaryCalculationReference,
    { readonly type: 'table_total' }
  >,
): readonly RenderedSummaryItem[] {
  const tableBinding = input.state.tableBindings.bindings.get(
    calculation.tableBindingId,
  );

  if (!tableBinding) {
    input.state.warnings.push({
      code: 'invalid_calculation_reference',
      details: {
        tableBindingId: calculation.tableBindingId,
      },
      message: `Summary block references unknown table binding "${calculation.tableBindingId}".`,
      nodeType: input.nodeType,
      path: input.path,
      severity: 'error',
    });

    return [];
  }

  const column = tableBinding.columns.find(
    (candidate) => candidate.key === calculation.columnKey,
  );
  const operation =
    calculation.operation ??
    tableBinding.totals.find(
      (total) => total.columnKey === calculation.columnKey,
    )?.operation ??
    'sum';
  const totalBinding: TableTotalBinding = {
    columnKey: calculation.columnKey,
    label: calculation.label,
    operation,
  };
  const result = calculateTableTotals({
    context: input.context,
    tableBinding: {
      ...tableBinding,
      totals: [totalBinding],
    },
  });
  pushCalculationDiagnostics({
    bindingId: input.binding.id,
    diagnostics: result.diagnostics,
    nodeType: input.nodeType,
    path: input.path,
    state: input.state,
  });
  const total = result.totals[0];

  if (!column || !total?.value) {
    return [];
  }

  return [
    createRenderedSummaryItem({
      binding: input.binding,
      fieldPath: column.sourcePath,
      key: `table.${calculation.tableBindingId}.${calculation.columnKey}`,
      label: calculation.label ?? total.label ?? column.label,
      path: input.path,
      sourcePath: tableBinding.sourcePath,
      state: input.state,
      value: total.value,
    }),
  ];
}

function createRenderedSummaryItem(input: {
  readonly binding: SummaryBlockBinding;
  readonly key: string;
  readonly label: string;
  readonly value: CalculationDecimalValue;
  readonly state: RenderState;
  readonly path: readonly string[];
  readonly sourcePath?: string;
  readonly fieldPath?: string;
  readonly groupKey?: string;
}): RenderedSummaryItem {
  return {
    displayValue: formatCalculationValue({
      formatter: input.binding.formatter,
      key: `summary.${input.binding.id}.${input.key}`,
      label: input.label,
      path: input.path,
      sourcePath: input.sourcePath,
      state: input.state,
      value: input.value,
    }),
    fieldPath: input.fieldPath,
    groupKey: input.groupKey,
    key: input.key,
    label: input.label,
    sourcePath: input.sourcePath,
    value: input.value,
  };
}

function renderSummaryBlockShell(input: {
  readonly binding: SummaryBlockBinding | undefined;
  readonly items: readonly RenderedSummaryItem[];
  readonly node: DocumentContentNode;
  readonly path: readonly string[];
}): string {
  const titleHtml = input.binding?.title
    ? renderElement(
        'h2',
        { class: 'pdf-summary-block-title' },
        escapeHtml(input.binding.title),
      )
    : '';
  const itemsHtml = input.items
    .map((item) =>
      renderElement(
        'div',
        {
          class: 'pdf-summary-item',
          'data-summary-count': String(item.value.count),
          'data-summary-decimal': item.value.decimal,
          ...(item.fieldPath
            ? { 'data-summary-field-path': item.fieldPath }
            : {}),
          ...(item.groupKey ? { 'data-summary-group-key': item.groupKey } : {}),
          'data-summary-item-key': item.key,
          'data-summary-minor-units': item.value.minorUnits,
          'data-summary-scale': String(item.value.scale),
          ...(item.sourcePath
            ? { 'data-summary-source-path': item.sourcePath }
            : {}),
        },
        `${renderElement('dt', {}, escapeHtml(item.label))}${renderElement(
          'dd',
          {},
          escapeHtml(item.displayValue),
        )}`,
      ),
    )
    .join('');
  const listHtml = renderElement(
    'dl',
    { class: 'pdf-summary-list' },
    itemsHtml,
  );

  return renderElement(
    'section',
    {
      ...getElementAttributes(input.node, {
        className: 'pdf-summary-block',
        excludedAttributeNames: ['binding', 'bindingId'],
      }),
      'data-asym-summary-block': 'true',
      ...(input.binding
        ? {
            'data-summary-block-binding-id': input.binding.id,
            'data-summary-calculation-type': input.binding.calculation.type,
          }
        : {}),
      'data-summary-block-path': input.path.join('.'),
    },
    `${titleHtml}${listHtml}`,
  );
}

function renderDocumentPlaceholderElement(
  placeholder: DocumentPlaceholder,
): string {
  const attributes = createDocumentPlaceholderAttributes(placeholder);
  const label =
    placeholder.label ??
    `${formatPlaceholderKind(placeholder.kind)} placeholder`;

  if (placeholder.kind === 'checkbox') {
    return renderElement(
      'span',
      attributes,
      `${renderElement(
        'span',
        {
          'aria-hidden': 'true',
          class: 'pdf-document-placeholder-box',
        },
        '',
      )}${renderPlaceholderLabel(label)}`,
    );
  }

  if (placeholder.kind === 'signature' || placeholder.kind === 'initials') {
    return renderElement(
      'span',
      attributes,
      `${renderPlaceholderLabel(label)}${renderElement(
        'span',
        {
          'aria-hidden': 'true',
          class: 'pdf-document-placeholder-line',
        },
        '',
      )}`,
    );
  }

  if (placeholder.kind === 'qr') {
    return renderElement(
      'span',
      attributes,
      `${renderElement(
        'span',
        {
          'aria-hidden': 'true',
          class: 'pdf-document-placeholder-qr-box',
        },
        'QR',
      )}${renderPlaceholderLabel(label)}`,
    );
  }

  const controlText =
    placeholder.kind === 'date'
      ? 'Date'
      : formatPlaceholderKind(placeholder.kind);

  return renderElement(
    'span',
    attributes,
    `${renderPlaceholderLabel(label)}${renderElement(
      'span',
      { class: 'pdf-document-placeholder-control' },
      escapeHtml(controlText),
    )}`,
  );
}

function createDocumentPlaceholderAttributes(
  placeholder: DocumentPlaceholder,
): AttributeMap {
  const attributes: AttributeMap = {
    class: `pdf-document-placeholder pdf-document-placeholder--${placeholder.kind.replace(
      /_/g,
      '-',
    )}`,
    contenteditable: 'false',
    'data-placeholder-id': placeholder.id,
    'data-placeholder-kind': placeholder.kind,
    'data-placeholder-required': String(placeholder.required),
  };

  if (placeholder.adapterKey) {
    attributes['data-placeholder-adapter-key'] = placeholder.adapterKey;
  }

  if (placeholder.dataPath) {
    attributes['data-placeholder-data-path'] = placeholder.dataPath;
  }

  if (placeholder.kind === 'text_field') {
    if (placeholder.placeholderText) {
      attributes['data-placeholder-text'] = placeholder.placeholderText;
    }

    if (placeholder.maxLength) {
      attributes['data-placeholder-max-length'] = String(placeholder.maxLength);
    }

    attributes['data-placeholder-multiline'] = String(placeholder.multiline);
  }

  if (placeholder.kind === 'checkbox') {
    attributes['data-placeholder-checked-by-default'] = String(
      placeholder.checkedByDefault,
    );
  }

  if (placeholder.kind === 'signature' || placeholder.kind === 'initials') {
    if (placeholder.signerRole) {
      attributes['data-placeholder-signer-role'] = placeholder.signerRole;
    }

    if (placeholder.width) {
      attributes['data-placeholder-width'] = String(placeholder.width);
    }

    if (placeholder.height) {
      attributes['data-placeholder-height'] = String(placeholder.height);
    }
  }

  if (placeholder.kind === 'date' && placeholder.dateFormat) {
    attributes['data-placeholder-date-format'] = placeholder.dateFormat;
  }

  if (placeholder.kind === 'qr') {
    attributes['data-placeholder-qr-payload-type'] = placeholder.payload.type;

    const payloadValue = getQrPayloadAttributeValue(placeholder.payload);

    if (payloadValue) {
      attributes[payloadValue.name] = payloadValue.value;
    }

    if (placeholder.size) {
      attributes['data-placeholder-size'] = String(placeholder.size);
    }

    if (placeholder.errorCorrectionLevel) {
      attributes['data-placeholder-qr-error-correction-level'] =
        placeholder.errorCorrectionLevel;
    }
  }

  return attributes;
}

function getQrPayloadAttributeValue(
  payload: QrPlaceholderPayload,
): { readonly name: string; readonly value: string } | undefined {
  if (payload.type === 'variable') {
    return {
      name: 'data-placeholder-qr-payload-key',
      value: payload.key,
    };
  }

  return {
    name: 'data-placeholder-qr-payload-value',
    value: payload.value,
  };
}

function renderPlaceholderLabel(label: string): string {
  return renderElement(
    'span',
    { class: 'pdf-document-placeholder-label' },
    escapeHtml(label),
  );
}

function formatPlaceholderKind(kind: DocumentPlaceholder['kind']): string {
  return kind
    .replace(/_/g, ' ')
    .replace(/^\w/u, (character) => character.toUpperCase());
}

function formatCalculationValue(input: {
  readonly value: CalculationDecimalValue;
  readonly formatter: string;
  readonly key: string;
  readonly label: string;
  readonly sourcePath?: string;
  readonly state: RenderState;
  readonly path: readonly string[];
}): string {
  const formatted = formatVariableValue({
    definition: createCalculationValueDefinition(input),
    formatter: input.formatter,
    value: Number(input.value.decimal),
  });

  for (const diagnostic of formatted.diagnostics) {
    input.state.warnings.push({
      code: 'invalid_calculation_reference',
      details: {
        formatter: diagnostic.formatter,
        sourcePath: diagnostic.sourcePath,
        variableKey: diagnostic.variableKey,
      },
      message: diagnostic.message,
      path: input.path,
      severity: diagnostic.severity,
    });
  }

  return formatted.formattedValue || input.value.decimal;
}

function createCalculationValueDefinition(input: {
  readonly key: string;
  readonly label: string;
  readonly formatter: string;
  readonly sourcePath?: string;
}): RegistryVariableDefinition {
  const valueType = input.formatter.startsWith('currency')
    ? 'currency'
    : 'number';

  return {
    description: `Phase 23 calculated value "${input.label}".`,
    documentCategories: ['financial_report'],
    fallback: { mode: 'omit' },
    formatter: input.formatter,
    group: 'computed',
    key: normalizeComputedVariableKey(input.key),
    label: input.label,
    privacy: 'financial',
    required: false,
    sampleValue: 0,
    sourcePath: input.sourcePath ?? 'computed',
    type: valueType,
  };
}

function normalizeComputedVariableKey(key: string): string {
  return key.replace(/[^A-Za-z0-9_.-]/g, '_');
}

function resolveCalculationFormatter(
  column: TableColumnBinding,
  operation: TableTotalBinding['operation'],
): string {
  if (operation === 'count') {
    return 'number.integer';
  }

  return (
    column.formatter ?? (column.type === 'currency' ? 'currency.usd' : 'number')
  );
}

function pushCalculationDiagnostics(input: {
  readonly bindingId: string;
  readonly diagnostics: readonly CalculationDiagnostic[];
  readonly nodeType: string;
  readonly path: readonly string[];
  readonly state: RenderState;
}): void {
  input.state.warnings.push(
    ...input.diagnostics.map((diagnostic) => ({
      code: 'invalid_calculation_reference' as const,
      details: {
        bindingId: input.bindingId,
        diagnosticCode: diagnostic.code,
        fieldPath: diagnostic.fieldPath,
        sourceIndex: diagnostic.sourceIndex,
        sourcePath: diagnostic.sourcePath,
        ...diagnostic.details,
      },
      message: diagnostic.message,
      nodeType: input.nodeType,
      path: input.path,
      severity: diagnostic.severity,
    })),
  );
}

function renderDataTableShell(input: {
  readonly binding: TableBinding | undefined;
  readonly bodyHtml: string;
  readonly node: DocumentContentNode;
  readonly path: readonly string[];
  readonly totalPlaceholdersHtml: string;
}): string {
  const headerHtml = input.binding ? renderDataTableHeader(input.binding) : '';
  const footerHtml = input.totalPlaceholdersHtml
    ? renderElement(
        'tfoot',
        { class: 'pdf-data-table-footer' },
        input.totalPlaceholdersHtml,
      )
    : '';
  const bodyHtml = renderElement(
    'tbody',
    { class: 'pdf-data-table-body' },
    input.bodyHtml,
  );

  return renderElement(
    'table',
    {
      ...getElementAttributes(input.node, {
        className: 'pdf-data-table',
        excludedAttributeNames: ['binding', 'bindingId'],
      }),
      'data-asym-data-table': 'true',
      'data-data-table-path': input.path.join('.'),
      ...(input.binding
        ? {
            'data-table-binding-id': input.binding.id,
            'data-table-repeat-header': String(input.binding.repeatHeader),
            'data-table-source-path': input.binding.sourcePath,
          }
        : {}),
    },
    `${headerHtml}${bodyHtml}${footerHtml}`,
  );
}

function renderDataTableHeader(binding: TableBinding): string {
  const cellsHtml = binding.columns
    .map((column) =>
      renderElement(
        'th',
        {
          class: 'pdf-data-table-heading',
          'data-table-column-key': column.key,
          scope: 'col',
          ...getDataTableCellStyleAttributes(column),
        },
        escapeHtml(column.label),
      ),
    )
    .join('');
  const rowHtml = renderElement('tr', {}, cellsHtml);

  return renderElement('thead', { class: 'pdf-data-table-header' }, rowHtml);
}

function renderDataTableRows(
  rows: readonly ResolvedTableRow[],
  avoidRowSplit: boolean,
): string {
  return rows
    .map((row) =>
      renderElement(
        'tr',
        {
          class: joinClassNames(
            'pdf-data-table-row',
            avoidRowSplit ? 'pdf-table-row-avoid-break' : undefined,
          ) as string,
          ...(avoidRowSplit ? { 'data-table-avoid-row-split': 'true' } : {}),
          'data-table-rendered-index': String(row.renderedIndex),
          'data-table-source-index': String(row.sourceIndex),
        },
        row.cells.map(renderDataTableCell).join(''),
      ),
    )
    .join('');
}

function renderDataTableCell(cell: ResolvedTableCell): string {
  return renderElement(
    'td',
    {
      class: 'pdf-data-table-cell',
      'data-table-column-key': cell.columnKey,
      ...getDataTableCellStyleAttributes(cell),
    },
    escapeHtml(cell.displayValue),
  );
}

function renderDataTableEmptyState(binding: TableBinding): string {
  if (!binding.emptyState) {
    return '';
  }

  return renderElement(
    'tr',
    {
      class: joinClassNames(
        'pdf-data-table-empty',
        binding.avoidRowSplit ? 'pdf-table-row-avoid-break' : undefined,
      ) as string,
      ...(binding.avoidRowSplit
        ? { 'data-table-avoid-row-split': 'true' }
        : {}),
      'data-table-empty-state': 'true',
    },
    renderElement(
      'td',
      {
        colspan: String(binding.columns.length),
      },
      escapeHtml(binding.emptyState),
    ),
  );
}

function renderDataTableTotalPlaceholders(binding: TableBinding): string {
  if (binding.totals.length === 0) {
    return '';
  }

  return binding.totals
    .map((total) =>
      renderElement(
        'tr',
        {
          class: joinClassNames(
            'pdf-data-table-total-placeholder',
            binding.avoidRowSplit ? 'pdf-table-row-avoid-break' : undefined,
          ) as string,
          ...(binding.avoidRowSplit
            ? { 'data-table-avoid-row-split': 'true' }
            : {}),
          'data-table-total-column-key': total.columnKey,
          'data-table-total-operation': total.operation,
          'data-table-total-placeholder': 'true',
        },
        renderElement(
          'td',
          {
            colspan: String(binding.columns.length),
          },
          escapeHtml(total.label ?? total.columnKey),
        ),
      ),
    )
    .join('');
}

function renderDataTableTotalRows(
  binding: TableBinding,
  totals: readonly RenderedTableTotal[],
): string {
  return totals
    .map((total) =>
      renderDataTableTotalRow({
        binding,
        className: 'pdf-data-table-total-row',
        column: total.column,
        avoidRowSplit: binding.avoidRowSplit,
        extraAttributes: {
          'data-table-total-column-key': total.total.columnKey,
          'data-table-total-count': total.total.value
            ? String(total.total.value.count)
            : '0',
          'data-table-total-decimal': total.total.value?.decimal ?? '',
          'data-table-total-minor-units': total.total.value?.minorUnits ?? '',
          'data-table-total-operation': total.total.operation,
          'data-table-total-scale': total.total.value
            ? String(total.total.value.scale)
            : '0',
        },
        label: total.total.label ?? total.column.label,
        value: total.displayValue,
      }),
    )
    .join('');
}

function renderDataTableTotalRow(input: {
  readonly binding: TableBinding;
  readonly column: TableColumnBinding;
  readonly className: string;
  readonly avoidRowSplit: boolean;
  readonly label: string;
  readonly value: string;
  readonly extraAttributes?: Readonly<Record<string, string>>;
}): string {
  const columnIndex = input.binding.columns.findIndex(
    (column) => column.key === input.column.key,
  );
  const resolvedColumnIndex = Math.max(columnIndex, 0);
  const leadingSpan = Math.max(resolvedColumnIndex, 1);
  const trailingSpan = input.binding.columns.length - resolvedColumnIndex - 1;
  const cellsHtml = [
    renderElement(
      'td',
      {
        class: 'pdf-data-table-total-label',
        colspan: String(leadingSpan),
      },
      escapeHtml(input.label),
    ),
    renderElement(
      'td',
      {
        class: 'pdf-data-table-total-value',
        'data-table-column-key': input.column.key,
        ...getDataTableCellStyleAttributes(input.column),
      },
      escapeHtml(input.value),
    ),
    trailingSpan > 0
      ? renderElement(
          'td',
          {
            class: 'pdf-data-table-total-empty',
            colspan: String(trailingSpan),
          },
          '',
        )
      : '',
  ].join('');

  return renderElement(
    'tr',
    {
      class: joinClassNames(
        input.className,
        input.avoidRowSplit ? 'pdf-table-row-avoid-break' : undefined,
      ) as string,
      ...(input.avoidRowSplit ? { 'data-table-avoid-row-split': 'true' } : {}),
      ...(input.extraAttributes ?? {}),
    },
    cellsHtml,
  );
}

function getDataTableCellStyleAttributes(input: {
  readonly align: 'left' | 'center' | 'right';
  readonly width?: string;
}): AttributeMap {
  const style: StyleMap = {
    'text-align': input.align,
  };

  if (input.width) {
    style.width = input.width;
  }

  return {
    style: serializeStyle(style),
  };
}

function renderChildren(
  children: readonly unknown[] | undefined,
  path: readonly string[],
  state: RenderState,
  parentType?: string,
): string {
  if (!children) {
    return '';
  }

  const childState = parentType
    ? {
        ...state,
        ancestors: [...state.ancestors, parentType],
      }
    : state;

  return children
    .map((child, index) =>
      renderNode(child, [...path, 'content', String(index)], childState),
    )
    .join('');
}

function renderTextNode(
  node: DocumentContentNode,
  path: readonly string[],
  state: RenderState,
): string {
  let renderedText = escapeHtml(node.text ?? '');

  for (const mark of getNodeMarks(node)) {
    const renderer = state.markRenderers.get(mark.type);

    if (!renderer) {
      state.warnings.push({
        code: 'unknown_mark',
        severity: 'warning',
        message: `Phase 09 serializer ignored unknown mark "${mark.type}".`,
        path,
        markType: mark.type,
      });
      continue;
    }

    renderedText = renderer.render({
      mark,
      node,
      path,
      childrenHtml: renderedText,
      addWarning: (warning) => {
        state.warnings.push(warning);
      },
    });
  }

  return renderedText;
}

function renderDoc(context: PdfDocumentNodeRendererContext): string {
  return context.childrenHtml;
}

function renderBody(context: PdfDocumentNodeRendererContext): string {
  return renderElement(
    'div',
    getElementAttributes(context.node, {
      className: 'pdf-document-body',
    }),
    context.childrenHtml,
  );
}

function renderContainer(context: PdfDocumentNodeRendererContext): string {
  return renderElement(
    'div',
    getElementAttributes(context.node, {
      className: 'pdf-document-container',
    }),
    context.childrenHtml,
  );
}

function renderSection(context: PdfDocumentNodeRendererContext): string {
  const pageFlow = readPageFlowControls(context.node.attrs);
  const className = joinClassNames(
    'pdf-document-section',
    pageFlow.keepTogether ? 'pdf-keep-together' : undefined,
    pageFlow.startOnNewPage ? 'pdf-start-on-new-page' : undefined,
  );

  if (pageFlow.keepTogether) {
    addPaginationHintWarning({
      control: 'keepTogether',
      context,
      message:
        'Phase 25 keep-together is a print pagination hint and may not be honored by browser preview or every renderer.',
    });
  }

  return renderElement(
    'section',
    {
      ...getElementAttributes(context.node, {
        className,
        excludedAttributeNames: ['keepTogether', 'startOnNewPage'],
      }),
      ...(pageFlow.keepTogether
        ? { 'data-page-flow-keep-together': 'true' }
        : {}),
      ...(pageFlow.startOnNewPage
        ? { 'data-page-flow-start-on-new-page': 'true' }
        : {}),
    },
    context.childrenHtml,
  );
}

function renderConditionalSection(
  node: DocumentContentNode,
  path: readonly string[],
  state: RenderState,
): string {
  const rule = readConditionalRule(node.attrs);

  if (!rule) {
    state.warnings.push({
      code: 'invalid_condition_rule',
      severity: 'error',
      message:
        'Phase 16 conditional section rendered content because the rule is missing or invalid.',
      path,
      nodeType: node.type,
    });

    return renderConditionalSectionElement(
      node,
      path,
      renderChildren(node.content, path, state, node.type),
      'true',
    );
  }

  const evaluation = evaluatePdfDocumentCondition({
    context: state.dataContext,
    nodeType: node.type,
    path,
    rule,
  });

  state.warnings.push(...evaluation.warnings);

  if (!evaluation.visible) {
    return '';
  }

  return renderConditionalSectionElement(
    node,
    path,
    renderChildren(node.content, path, state, node.type),
    'true',
    rule,
  );
}

function renderConditionalSectionElement(
  node: DocumentContentNode,
  path: readonly string[],
  childrenHtml: string,
  visible: 'true' | 'false',
  rule?: ConditionalRule,
): string {
  return renderElement(
    'section',
    {
      ...getElementAttributes(node, {
        className: 'pdf-conditional-section',
        excludedAttributeNames: ['condition', 'rule'],
      }),
      'data-asym-conditional-section': 'true',
      'data-condition-path': path.join('.'),
      'data-condition-visible': visible,
      ...(rule
        ? {
            'data-condition-field-path': rule.fieldPath,
            'data-condition-operator': rule.operator,
          }
        : {}),
    },
    childrenHtml,
  );
}

function renderParagraph(context: PdfDocumentNodeRendererContext): string {
  const alignment = readAlignmentAttribute(context.node.attrs);
  const alignmentStyle = alignment ? { 'text-align': alignment } : undefined;

  return renderElement(
    'p',
    getElementAttributes(context.node, {
      excludedAttributeNames: ['alignment'],
      extraStyle: alignmentStyle,
    }),
    context.childrenHtml,
  );
}

function renderHeading(context: PdfDocumentNodeRendererContext): string {
  const level = clampHeadingLevel(
    readNumberAttribute(context.node.attrs, 'level'),
  );
  const pageFlow = readPageFlowControls(context.node.attrs);
  const avoidBreakAfter = pageFlow.avoidBreakAfter !== false;

  return renderElement(
    `h${level}`,
    {
      ...getElementAttributes(context.node, {
        className: avoidBreakAfter
          ? 'pdf-heading-avoid-break-after'
          : undefined,
        excludedAttributeNames: ['avoidBreakAfter', 'level'],
      }),
      ...(avoidBreakAfter
        ? { 'data-page-flow-avoid-break-after': 'true' }
        : {}),
    },
    context.childrenHtml,
  );
}

function renderImage(context: PdfDocumentNodeRendererContext): string {
  const asset = resolveNodeAsset(context);
  const src = asset
    ? resolveAssetSource(asset)
    : readStringAttribute(context.node.attrs, 'src');

  if (!src) {
    context.addWarning({
      code: asset ? 'missing_asset' : 'missing_attribute',
      severity: asset ? 'error' : 'warning',
      message: asset
        ? 'Phase 27 asset image node is missing a renderable asset URL.'
        : 'Phase 09 image node is missing a src attribute.',
      path: context.path,
      nodeType: context.node.type,
      details: asset
        ? { assetId: asset.assetId, referenceId: asset.id }
        : { attribute: 'src' },
    });
    return '';
  }

  if (
    context.assetRenderMode === 'production_render' &&
    isUnsafeProductionAssetUrl(src)
  ) {
    context.addWarning({
      code: 'unsafe_asset_url',
      details: { assetId: asset?.assetId, referenceId: asset?.id },
      message:
        'Phase 27 asset image node rejected a URL that production rendering cannot fetch safely.',
      nodeType: context.node.type,
      path: context.path,
      severity: 'error',
    });
    return '';
  }

  if (
    context.assetRenderMode === 'production_render' &&
    asset &&
    !asset.renderSafe &&
    !asset.renderSafeUrl
  ) {
    context.addWarning({
      code: 'asset_not_render_safe',
      details: { assetId: asset.assetId, referenceId: asset.id },
      message:
        'Phase 27 asset image node rendered a production asset that is not marked render-safe.',
      nodeType: context.node.type,
      path: context.path,
      severity: 'warning',
    });
  }

  const altText =
    asset?.altText ??
    readStringAttribute(context.node.attrs, 'alt') ??
    readStringAttribute(context.node.attrs, 'altText');
  const width =
    asset?.width !== undefined
      ? String(asset.width)
      : readScalarAttribute(context.node.attrs, 'width');
  const height =
    asset?.height !== undefined
      ? String(asset.height)
      : readScalarAttribute(context.node.attrs, 'height');
  const role =
    asset?.role ?? readStringAttribute(context.node.attrs, 'role') ?? 'image';
  const alignment =
    asset?.alignment ?? readStringAttribute(context.node.attrs, 'alignment');
  const linkUrl =
    asset?.linkUrl ?? readStringAttribute(context.node.attrs, 'linkUrl');

  if (
    asset &&
    requiresAssetAltText(asset.role) &&
    !hasNonEmptyString(altText)
  ) {
    context.addWarning({
      code: 'missing_asset_alt_text',
      details: { assetId: asset.assetId, referenceId: asset.id },
      message:
        'Phase 27 asset image node should include alt text for accessibility and preflight.',
      nodeType: context.node.type,
      path: context.path,
      severity: 'warning',
    });
  }

  const attributes: AttributeMap = {
    ...getElementAttributes(context.node, {
      className: resolveImageClassName(asset, role, alignment),
      excludedAttributeNames: [
        'alignment',
        'alt',
        'altText',
        'asset',
        'assetId',
        'height',
        'linkUrl',
        'mimeType',
        'renderSafe',
        'renderSafeUrl',
        'role',
        'source',
        'src',
        'tenantId',
        'url',
        'width',
      ],
    }),
    src,
  };

  if (asset?.id) {
    attributes['data-asset-reference-id'] = asset.id;
  }

  if (asset?.assetId) {
    attributes['data-asset-id'] = asset.assetId;
  }

  if (asset && role) {
    attributes['data-asset-role'] = role;
  }

  if (asset?.renderSafe) {
    attributes['data-asset-render-safe'] = 'true';
  }

  if (asset?.tenantId) {
    attributes['data-asset-tenant-id'] = asset.tenantId;
  }

  if (asset?.source?.provider) {
    attributes['data-asset-source-provider'] = asset.source.provider;
  }

  if (asset?.source?.sourceId) {
    attributes['data-asset-source-id'] = asset.source.sourceId;
  }

  if (altText !== undefined) {
    attributes.alt = altText;
  }

  if (width !== undefined) {
    attributes.width = width;
  }

  if (height !== undefined) {
    attributes.height = height;
  }

  context.addAsset({
    ...(asset?.id ? { id: asset.id } : {}),
    ...(asset?.assetId ? { assetId: asset.assetId } : {}),
    src,
    altText,
    role,
    ...(asset?.mimeType ? { mimeType: asset.mimeType } : {}),
    width,
    height,
    ...(asset?.alignment ? { alignment: asset.alignment } : {}),
    ...(linkUrl ? { linkUrl } : {}),
    ...(asset ? { renderSafe: asset.renderSafe } : {}),
    ...(asset?.tenantId ? { tenantId: asset.tenantId } : {}),
    ...(asset?.source ? { source: asset.source } : {}),
    path: context.path,
  });

  if (!linkUrl) {
    return renderElement('img', attributes, '', true);
  }

  const safeHref = normalizeSafeHref(linkUrl);

  if (!safeHref) {
    context.addWarning({
      code: 'unsafe_url',
      details: { attribute: 'linkUrl' },
      message: 'Phase 27 asset image node omitted an unsafe link URL.',
      nodeType: context.node.type,
      path: context.path,
      severity: 'warning',
    });
    return renderElement('img', attributes, '', true);
  }

  return renderElement(
    'a',
    {
      class: 'pdf-asset-image-link',
      href: safeHref,
    },
    renderElement('img', attributes, '', true),
  );
}

function resolveNodeAsset(
  context: PdfDocumentNodeRendererContext,
): DocumentAssetReference | undefined {
  const inlineAsset = readInlineAssetReference(context);

  if (inlineAsset) {
    return applyNodeAssetOverrides(inlineAsset, context.node.attrs);
  }

  const referenceId =
    readStringAttribute(context.node.attrs, 'assetReferenceId') ??
    readStringAttribute(context.node.attrs, 'assetRefId');
  const assetId = readStringAttribute(context.node.attrs, 'assetId');
  const referencedAsset = context.resolveAssetReference({
    assetId,
    referenceId,
  });

  if (referencedAsset) {
    return applyNodeAssetOverrides(referencedAsset, context.node.attrs);
  }

  const directAsset = createDirectNodeAsset(context);

  if (directAsset) {
    return directAsset;
  }

  if (context.node.type === 'assetImage' || assetId || referenceId) {
    context.addWarning({
      code: 'missing_asset',
      details: { assetId, referenceId },
      message:
        'Phase 27 asset image node references an asset that was not provided to the renderer.',
      nodeType: context.node.type,
      path: context.path,
      severity: 'error',
    });
  }

  return undefined;
}

function readInlineAssetReference(
  context: PdfDocumentNodeRendererContext,
): DocumentAssetReference | undefined {
  const asset = context.node.attrs?.asset;

  if (!isRecord(asset)) {
    return undefined;
  }

  const parseResult = DocumentAssetReferenceSchema.safeParse(asset);

  if (parseResult.success) {
    return parseResult.data;
  }

  context.addWarning({
    code: 'invalid_asset_reference',
    details: {
      validationError:
        parseResult.error.issues[0]?.message ??
        'Unknown asset reference validation error.',
    },
    message: 'Phase 27 inline asset image reference failed validation.',
    nodeType: context.node.type,
    path: context.path,
    severity: 'error',
  });

  return undefined;
}

function createDirectNodeAsset(
  context: PdfDocumentNodeRendererContext,
): DocumentAssetReference | undefined {
  const renderSafeUrl = readStringAttribute(
    context.node.attrs,
    'renderSafeUrl',
  );
  const url =
    readStringAttribute(context.node.attrs, 'url') ??
    (context.node.type === 'assetImage'
      ? readStringAttribute(context.node.attrs, 'src')
      : undefined);
  const assetId = readStringAttribute(context.node.attrs, 'assetId');
  const mimeType = readStringAttribute(context.node.attrs, 'mimeType');
  const altText =
    readStringAttribute(context.node.attrs, 'altText') ??
    readStringAttribute(context.node.attrs, 'alt');
  const width = readNumberAssetAttribute(context.node.attrs, 'width');
  const height = readNumberAssetAttribute(context.node.attrs, 'height');
  const alignment = readAssetAlignment(context.node.attrs);
  const linkUrl = readStringAttribute(context.node.attrs, 'linkUrl');
  const renderSafe = readBooleanAttribute(context.node.attrs, 'renderSafe');
  const tenantId = readStringAttribute(context.node.attrs, 'tenantId');

  if (!renderSafeUrl && !url && !assetId) {
    return undefined;
  }

  const input: DocumentAssetReferenceInput = {
    id:
      readStringAttribute(context.node.attrs, 'id') ??
      `asset-${context.path.join('-') || 'root'}`,
    role: readNodeAssetRole(context.node.attrs) ?? 'image',
    ...(assetId ? { assetId } : {}),
    ...(url ? { url } : {}),
    ...(renderSafeUrl ? { renderSafeUrl } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(altText ? { altText } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(alignment ? { alignment } : {}),
    ...(linkUrl ? { linkUrl } : {}),
    ...(renderSafe !== undefined ? { renderSafe } : {}),
    ...(tenantId ? { tenantId } : {}),
  };
  const parseResult = DocumentAssetReferenceSchema.safeParse(input);

  if (parseResult.success) {
    return parseResult.data;
  }

  context.addWarning({
    code: 'invalid_asset_reference',
    details: {
      validationError:
        parseResult.error.issues[0]?.message ??
        'Unknown asset reference validation error.',
    },
    message: 'Phase 27 direct asset image attributes failed validation.',
    nodeType: context.node.type,
    path: context.path,
    severity: 'error',
  });

  return undefined;
}

function applyNodeAssetOverrides(
  asset: DocumentAssetReference,
  attrs: Readonly<Record<string, unknown>> | undefined,
): DocumentAssetReference {
  const role = readNodeAssetRole(attrs);
  const altText =
    readStringAttribute(attrs, 'altText') ?? readStringAttribute(attrs, 'alt');
  const width = readNumberAssetAttribute(attrs, 'width');
  const height = readNumberAssetAttribute(attrs, 'height');
  const alignment = readAssetAlignment(attrs);
  const linkUrl = readStringAttribute(attrs, 'linkUrl');
  const renderSafe = readBooleanAttribute(attrs, 'renderSafe');

  return {
    ...asset,
    role: role ?? asset.role,
    ...(altText !== undefined ? { altText } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(alignment !== undefined ? { alignment } : {}),
    ...(linkUrl !== undefined ? { linkUrl } : {}),
    ...(renderSafe !== undefined ? { renderSafe } : {}),
  };
}

function resolveAssetReference(
  reference: PdfDocumentAssetLookupReference,
  registry: AssetReferenceRegistry,
): DocumentAssetReference | undefined {
  if (reference.referenceId) {
    const asset = registry.byReferenceId.get(reference.referenceId);

    if (asset) {
      return asset;
    }
  }

  if (reference.assetId) {
    return (
      registry.byAssetId.get(reference.assetId) ??
      registry.byReferenceId.get(reference.assetId)
    );
  }

  return undefined;
}

function resolveAssetSource(asset: DocumentAssetReference): string | undefined {
  return asset.renderSafeUrl ?? asset.url;
}

function resolveImageClassName(
  asset: DocumentAssetReference | undefined,
  role: string | undefined,
  alignment: string | undefined,
): string {
  if (!asset) {
    return 'pdf-image';
  }

  return (
    joinClassNames(
      'pdf-image',
      'pdf-asset-image',
      role ? `pdf-asset-image--${role}` : undefined,
      alignment && alignment !== 'left'
        ? `pdf-asset-image--${alignment}`
        : undefined,
    ) ?? 'pdf-image pdf-asset-image'
  );
}

function readNodeAssetRole(
  attrs: Readonly<Record<string, unknown>> | undefined,
): DocumentAssetRole | undefined {
  const role = readStringAttribute(attrs, 'role');

  return isDocumentAssetRole(role) ? role : undefined;
}

function readAssetAlignment(
  attrs: Readonly<Record<string, unknown>> | undefined,
): DocumentAssetReference['alignment'] | undefined {
  const alignment = readStringAttribute(attrs, 'alignment');

  return alignment === 'left' ||
    alignment === 'center' ||
    alignment === 'right' ||
    alignment === 'full_width'
    ? alignment
    : undefined;
}

function readNumberAssetAttribute(
  attrs: Readonly<Record<string, unknown>> | undefined,
  name: string,
): number | undefined {
  const value = attrs?.[name];

  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);

    return parsed > 0 ? parsed : undefined;
  }

  return undefined;
}

function renderButton(context: PdfDocumentNodeRendererContext): string {
  const hrefResult = readSafeHrefAttribute(context.node.attrs);
  const alignment = readAlignmentAttribute(context.node.attrs);
  const alignmentStyle = alignment ? { 'text-align': alignment } : undefined;

  if (hrefResult.unsafeHref) {
    context.addWarning({
      code: 'unsafe_url',
      severity: 'warning',
      message: 'Pre-Phase 18 button node omitted an unsafe href attribute.',
      path: context.path,
      nodeType: context.node.type,
      details: { attribute: 'href' },
    });
  }

  if (!hrefResult.href) {
    if (!hrefResult.unsafeHref) {
      context.addWarning({
        code: 'missing_attribute',
        severity: 'warning',
        message: 'Phase 09 button node is missing an href attribute.',
        path: context.path,
        nodeType: context.node.type,
        details: { attribute: 'href' },
      });
    }

    return renderElement(
      'span',
      getElementAttributes(context.node, {
        className: 'pdf-button',
        excludedAttributeNames: ['alignment', 'href'],
        extraStyle: alignmentStyle,
      }),
      context.childrenHtml,
    );
  }

  return renderElement(
    'a',
    {
      ...getElementAttributes(context.node, {
        className: 'pdf-button',
        excludedAttributeNames: ['alignment', 'href'],
        extraStyle: alignmentStyle,
      }),
      href: hrefResult.href,
    },
    context.childrenHtml,
  );
}

function renderColumns(context: PdfDocumentNodeRendererContext): string {
  const columnCount = Array.isArray(context.node.content)
    ? context.node.content.length
    : 0;
  const className =
    columnCount > 0 ? `pdf-columns pdf-columns--${columnCount}` : 'pdf-columns';

  return renderElement(
    'div',
    getElementAttributes(context.node, { className }),
    context.childrenHtml,
  );
}

function renderColumn(context: PdfDocumentNodeRendererContext): string {
  return renderElement(
    'div',
    getElementAttributes(context.node, { className: 'pdf-column' }),
    context.childrenHtml,
  );
}

function renderTable(context: PdfDocumentNodeRendererContext): string {
  const alignment = readAlignmentAttribute(context.node.attrs);
  const alignmentStyle = alignment
    ? { margin: alignmentToMargin(alignment) }
    : undefined;

  return renderElement(
    'table',
    getElementAttributes(context.node, {
      className: 'pdf-table',
      excludedAttributeNames: ['alignment'],
      extraStyle: alignmentStyle,
    }),
    context.childrenHtml,
  );
}

function renderTableRow(context: PdfDocumentNodeRendererContext): string {
  const pageFlow = readPageFlowControls(context.node.attrs);

  return renderElement(
    'tr',
    {
      ...getElementAttributes(context.node, {
        className: pageFlow.avoidRowSplit
          ? 'pdf-table-row-avoid-break'
          : undefined,
        excludedAttributeNames: ['avoidRowSplit'],
      }),
      ...(pageFlow.avoidRowSplit
        ? { 'data-table-avoid-row-split': 'true' }
        : {}),
    },
    context.childrenHtml,
  );
}

function renderTableCell(context: PdfDocumentNodeRendererContext): string {
  return renderTableCellElement('td', context);
}

function renderTableHeader(context: PdfDocumentNodeRendererContext): string {
  return renderTableCellElement('th', context);
}

function renderTableCellElement(
  tagName: 'td' | 'th',
  context: PdfDocumentNodeRendererContext,
): string {
  const alignment = readAlignmentAttribute(context.node.attrs);
  const alignmentStyle = alignment ? { 'text-align': alignment } : undefined;

  return renderElement(
    tagName,
    getElementAttributes(context.node, {
      excludedAttributeNames: ['alignment'],
      extraStyle: alignmentStyle,
    }),
    context.childrenHtml,
  );
}

function renderVariable(context: PdfDocumentNodeRendererContext): string {
  const key =
    readStringAttribute(context.node.attrs, 'key') ??
    readStringAttribute(context.node.attrs, 'variableKey');

  if (!key) {
    context.addWarning({
      code: 'missing_attribute',
      severity: 'warning',
      message: 'Phase 09 variable node is missing a key attribute.',
      path: context.path,
      nodeType: context.node.type,
      details: { attribute: 'key' },
    });
    return '';
  }

  const formatter = readStringAttribute(context.node.attrs, 'formatter');
  const fallback = readVariableFallback(context.node.attrs);

  context.addVariable({
    key,
    formatter,
    ...(fallback ? { fallback } : {}),
    path: context.path,
  });

  const fallbackAttribute =
    fallback?.mode === 'use_value' ? String(fallback.value) : undefined;

  return renderElement(
    'span',
    {
      class: 'pdf-variable',
      'data-variable-key': key,
      ...(formatter ? { 'data-variable-formatter': formatter } : {}),
      ...(fallbackAttribute
        ? { 'data-variable-fallback': fallbackAttribute }
        : {}),
    },
    '',
  );
}

function addVariableUsage(
  state: RenderState,
  usage: PdfDocumentVariableUsage,
): void {
  const scopes = [...state.scopes, ...(usage.scopes ?? [])];

  state.variables.push({
    ...usage,
    ...(scopes.length > 0 ? { scopes } : {}),
  });
}

function renderLinkMark(context: PdfDocumentMarkRendererContext): string {
  const hrefResult = readSafeHrefAttribute(context.mark.attrs);

  if (hrefResult.unsafeHref) {
    context.addWarning({
      code: 'unsafe_url',
      severity: 'warning',
      message: 'Pre-Phase 18 link mark omitted an unsafe href attribute.',
      path: context.path,
      markType: context.mark.type,
      details: { attribute: 'href' },
    });

    return context.childrenHtml;
  }

  if (!hrefResult.href) {
    context.addWarning({
      code: 'missing_attribute',
      severity: 'warning',
      message: 'Phase 09 link mark is missing an href attribute.',
      path: context.path,
      markType: context.mark.type,
      details: { attribute: 'href' },
    });
    return context.childrenHtml;
  }

  return renderElement(
    'a',
    getMarkAttributes(context.mark, {
      href: hrefResult.href,
      excludedAttributeNames: ['href'],
    }),
    context.childrenHtml,
  );
}

function renderStrongMark(context: PdfDocumentMarkRendererContext): string {
  return renderElement(
    'strong',
    getMarkAttributes(context.mark),
    context.childrenHtml,
  );
}

function renderEmphasisMark(context: PdfDocumentMarkRendererContext): string {
  return renderElement(
    'em',
    getMarkAttributes(context.mark),
    context.childrenHtml,
  );
}

function renderUnderlineMark(context: PdfDocumentMarkRendererContext): string {
  return renderElement(
    'span',
    getMarkAttributes(context.mark, {
      extraStyle: { 'text-decoration': 'underline' },
    }),
    context.childrenHtml,
  );
}

const builtInNodeRenderers: readonly PdfDocumentNodeRenderer[] = [
  { type: 'doc', render: renderDoc },
  { type: 'body', render: renderBody },
  { type: 'container', render: renderContainer },
  { type: 'section', render: renderSection },
  { type: 'paragraph', render: renderParagraph },
  { type: 'heading', render: renderHeading },
  { type: 'image', render: renderImage },
  { type: 'assetImage', render: renderImage },
  { type: 'button', render: renderButton },
  { type: 'twoColumns', render: renderColumns },
  { type: 'threeColumns', render: renderColumns },
  { type: 'fourColumns', render: renderColumns },
  { type: 'columnsColumn', render: renderColumn },
  { type: 'table', render: renderTable },
  { type: 'tableRow', render: renderTableRow },
  { type: 'tableCell', render: renderTableCell },
  { type: 'tableHeader', render: renderTableHeader },
  { type: 'variable', render: renderVariable },
  { type: 'variableReference', render: renderVariable },
];

const builtInMarkRenderers: readonly PdfDocumentMarkRenderer[] = [
  { type: 'link', render: renderLinkMark },
  { type: 'bold', render: renderStrongMark },
  { type: 'italic', render: renderEmphasisMark },
  { type: 'underline', render: renderUnderlineMark },
];

function isDocumentNode(value: unknown): value is DocumentContentNode {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.type === 'string' && value.type.length > 0;
}

function isDocumentEmpty(document: DocumentContentNode): boolean {
  return (
    document.type === 'doc' &&
    (!document.content || document.content.length === 0)
  );
}

function hasRenderableChildren(node: DocumentContentNode): boolean {
  return Array.isArray(node.content) && node.content.length > 0;
}

function getNodeMarks(node: DocumentContentNode): readonly PdfDocumentMark[] {
  if (!Array.isArray(node.marks)) {
    return [];
  }

  return node.marks.filter(isPdfDocumentMark);
}

function isPdfDocumentMark(value: unknown): value is PdfDocumentMark {
  return (
    isRecord(value) && typeof value.type === 'string' && value.type.length > 0
  );
}

function getElementAttributes(
  node: DocumentContentNode,
  options: {
    readonly className?: string;
    readonly excludedAttributeNames?: readonly string[];
    readonly extraStyle?: Readonly<Record<string, string>> | undefined;
  } = {},
): AttributeMap {
  return getAttributes(node.attrs, options);
}

function getMarkAttributes(
  mark: PdfDocumentMark,
  options: {
    readonly excludedAttributeNames?: readonly string[];
    readonly extraStyle?: Readonly<Record<string, string>> | undefined;
    readonly href?: string;
  } = {},
): AttributeMap {
  return getAttributes(mark.attrs, options);
}

function getAttributes(
  sourceAttributes: Readonly<Record<string, unknown>> | undefined,
  options: {
    readonly className?: string;
    readonly excludedAttributeNames?: readonly string[];
    readonly extraStyle?: Readonly<Record<string, string>> | undefined;
    readonly href?: string;
  },
): AttributeMap {
  const attributes: AttributeMap = {};
  const excludedAttributeNames = new Set([
    'style',
    ...(options.excludedAttributeNames ?? []),
  ]);

  if (sourceAttributes) {
    for (const [name, value] of Object.entries(sourceAttributes)) {
      if (excludedAttributeNames.has(name)) {
        continue;
      }

      const normalizedName = normalizeAttributeName(name);
      const stringValue = stringifyAttributeValue(value);

      if (stringValue !== undefined && isSafeAttributeName(normalizedName)) {
        attributes[normalizedName] = stringValue;
      }
    }
  }

  if (options.href) {
    attributes.href = options.href;
  }

  const sourceClass = readStringAttribute(sourceAttributes, 'class');
  const sourceClassName = readStringAttribute(sourceAttributes, 'className');
  const className = joinClassNames(
    options.className,
    sourceClass,
    sourceClassName,
  );

  if (className) {
    attributes.class = className;
  }

  const style = mergeStyles(
    parseStyleAttribute(sourceAttributes?.style),
    options.extraStyle,
  );

  if (Object.keys(style).length > 0) {
    attributes.style = serializeStyle(style);
  }

  return attributes;
}

function mergeStyles(
  ...styleInputs: readonly (Readonly<Record<string, string>> | undefined)[]
): StyleMap {
  const style: StyleMap = {};

  for (const styleInput of styleInputs) {
    if (!styleInput) {
      continue;
    }

    for (const [key, value] of Object.entries(styleInput)) {
      const normalizedKey = normalizeStyleName(key);

      if (normalizedKey && value.trim()) {
        style[normalizedKey] = value.trim();
      }
    }
  }

  return style;
}

function parseStyleAttribute(value: unknown): StyleMap {
  if (typeof value === 'string') {
    return parseInlineStyle(value);
  }

  if (!isRecord(value)) {
    return {};
  }

  const style: StyleMap = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue === 'string' || typeof rawValue === 'number') {
      style[normalizeStyleName(key)] = String(rawValue);
    }
  }

  return style;
}

function parseInlineStyle(value: string): StyleMap {
  const style: StyleMap = {};

  for (const declaration of value.split(';')) {
    const separatorIndex = declaration.indexOf(':');

    if (separatorIndex === -1) {
      continue;
    }

    const property = normalizeStyleName(declaration.slice(0, separatorIndex));
    const propertyValue = declaration.slice(separatorIndex + 1).trim();

    if (property && propertyValue) {
      style[property] = propertyValue;
    }
  }

  return style;
}

function serializeStyle(style: Readonly<Record<string, string>>): string {
  return Object.keys(style)
    .sort()
    .map((property) => `${property}:${style[property]}`)
    .join(';');
}

function renderElement(
  tagName: string,
  attributes: Readonly<Record<string, string>>,
  childrenHtml: string,
  voidElement = false,
): string {
  const serializedAttributes = serializeAttributes(attributes);
  const openingTag = serializedAttributes
    ? `<${tagName} ${serializedAttributes}>`
    : `<${tagName}>`;

  if (voidElement) {
    return serializedAttributes
      ? `<${tagName} ${serializedAttributes} />`
      : `<${tagName} />`;
  }

  return `${openingTag}${childrenHtml}</${tagName}>`;
}

function serializeAttributes(
  attributes: Readonly<Record<string, string>>,
): string {
  return Object.keys(attributes)
    .sort()
    .map((name) => `${name}="${escapeAttribute(attributes[name])}"`)
    .join(' ');
}

function normalizeAttributeName(name: string): string {
  if (name === 'className') {
    return 'class';
  }

  if (name === 'colSpan') {
    return 'colspan';
  }

  if (name === 'rowSpan') {
    return 'rowspan';
  }

  return name;
}

function normalizeStyleName(name: string): string {
  return name
    .trim()
    .replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
    .toLowerCase();
}

function isSafeAttributeName(name: string): boolean {
  if (/^on[a-z]/.test(name)) {
    return false;
  }

  return /^(aria-[a-z0-9-]+|data-[a-z0-9-]+|[a-z][a-z0-9-]*)$/.test(name);
}

function stringifyAttributeValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function readStringAttribute(
  attributes: Readonly<Record<string, unknown>> | undefined,
  name: string,
): string | undefined {
  const value = attributes?.[name];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readSafeHrefAttribute(
  attributes: Readonly<Record<string, unknown>> | undefined,
):
  | { readonly href: string; readonly unsafeHref?: undefined }
  | { readonly href?: undefined; readonly unsafeHref?: string } {
  const href = readStringAttribute(attributes, 'href');

  if (!href) {
    return {};
  }

  const safeHref = normalizeSafeHref(href);

  return safeHref ? { href: safeHref } : { unsafeHref: href };
}

function normalizeSafeHref(value: string): string | undefined {
  const href = value.trim();

  if (
    href.length === 0 ||
    hasUnsafeHrefCharacters(href) ||
    href.includes('\\') ||
    href.startsWith('//')
  ) {
    return undefined;
  }

  if (href.startsWith('#')) {
    return href;
  }

  const scheme = readHrefScheme(href);

  if (scheme) {
    return isSafeSchemeHref(href, scheme) ? href : undefined;
  }

  return isSafeRelativeHref(href) ? href : undefined;
}

function hasUnsafeHrefCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);

    return codePoint !== undefined && (codePoint <= 0x20 || codePoint === 0x7f);
  });
}

function readHrefScheme(value: string): string | undefined {
  const match = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(value);

  return match?.[1].toLowerCase();
}

function isSafeSchemeHref(href: string, scheme: string): boolean {
  if (!safeHrefSchemes.has(scheme)) {
    return false;
  }

  if (scheme === 'http' || scheme === 'https') {
    return isValidAbsoluteHref(href, scheme);
  }

  return href.length > `${scheme}:`.length;
}

function isValidAbsoluteHref(href: string, scheme: string): boolean {
  try {
    return new URL(href).protocol === `${scheme}:`;
  } catch {
    return false;
  }
}

function isSafeRelativeHref(href: string): boolean {
  return (
    href.startsWith('/') ||
    href.startsWith('./') ||
    href.startsWith('../') ||
    /^[A-Za-z0-9._~-]/.test(href)
  );
}

function readPageFlowControls(
  attributes: Readonly<Record<string, unknown>> | undefined,
): PageFlowControlAttributes {
  const result = PageFlowControlAttributesSchema.safeParse({
    ...readOptionalBooleanProperty(attributes, 'avoidBreakAfter'),
    ...readOptionalBooleanProperty(attributes, 'avoidRowSplit'),
    ...readOptionalBooleanProperty(attributes, 'keepTogether'),
    ...readOptionalBooleanProperty(attributes, 'startOnNewPage'),
  });

  return result.success ? result.data : {};
}

function readOptionalBooleanProperty(
  attributes: Readonly<Record<string, unknown>> | undefined,
  name: keyof PageFlowControlAttributes,
): Partial<Record<keyof PageFlowControlAttributes, boolean>> {
  const value = attributes?.[name];

  if (typeof value === 'boolean') {
    return { [name]: value };
  }

  if (value === 'true') {
    return { [name]: true };
  }

  if (value === 'false') {
    return { [name]: false };
  }

  return {};
}

function addPaginationHintWarning(input: {
  readonly context: PdfDocumentNodeRendererContext;
  readonly control: keyof PageFlowControlAttributes;
  readonly message: string;
}): void {
  input.context.addWarning({
    code: 'pagination_hint_not_guaranteed',
    details: {
      control: input.control,
    },
    message: input.message,
    nodeType: input.context.node.type,
    path: input.context.path,
    severity: 'warning',
  });
}

function isInvalidPageBreakPlacement(ancestors: readonly string[]): boolean {
  return ancestors.some((ancestor) =>
    invalidPageBreakAncestorTypes.has(ancestor),
  );
}

const invalidPageBreakAncestorTypes: ReadonlySet<string> = new Set([
  'heading',
  'paragraph',
  'table',
  'tableCell',
  'tableHeader',
  'tableRow',
]);

function readDiagnosticString(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

function readVariableFallback(
  attributes: Readonly<Record<string, unknown>> | undefined,
): FallbackBehavior | undefined {
  const value = attributes?.fallback;

  if (isFallbackBehavior(value)) {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    return { mode: 'use_value', value };
  }

  return undefined;
}

function readConditionalRule(
  attributes: Readonly<Record<string, unknown>> | undefined,
): ConditionalRule | undefined {
  const rawRule = attributes?.rule ?? attributes?.condition;
  const parsedRule =
    typeof rawRule === 'string' ? parseConditionalRuleString(rawRule) : rawRule;
  const result = ConditionalRuleSchema.safeParse(parsedRule);

  return result.success ? result.data : undefined;
}

function readRepeaterBinding(
  attributes: Readonly<Record<string, unknown>> | undefined,
  registry: RepeaterBindingRegistry,
): RepeaterBindingReadResult {
  const inlineBinding = readStructuredAttribute(attributes, 'binding');

  if (inlineBinding !== undefined) {
    const inlineResult = RepeaterBindingSchema.safeParse(inlineBinding);

    if (inlineResult.success) {
      return { binding: inlineResult.data, status: 'valid' };
    }

    return {
      reference: createInvalidRepeaterBindingReference(
        inlineBinding,
        inlineResult.error.message,
      ),
      status: 'invalid',
    };
  }

  const bindingId = readStringAttribute(attributes, 'bindingId');

  if (!bindingId) {
    return { status: 'missing' };
  }

  const binding = registry.bindings.get(bindingId);

  if (binding) {
    return { binding, status: 'valid' };
  }

  const invalidBinding = registry.invalidBindings.get(bindingId);

  return invalidBinding
    ? { reference: invalidBinding, status: 'invalid' }
    : { status: 'missing' };
}

function readTableBinding(
  attributes: Readonly<Record<string, unknown>> | undefined,
  registry: TableBindingRegistry,
): TableBindingReadResult {
  const inlineBinding = readStructuredAttribute(attributes, 'binding');

  if (inlineBinding !== undefined) {
    const inlineResult = TableBindingSchema.safeParse(inlineBinding);

    if (inlineResult.success) {
      return { binding: inlineResult.data, status: 'valid' };
    }

    return {
      reference: createInvalidTableBindingReference(
        inlineBinding,
        inlineResult.error.message,
      ),
      status: 'invalid',
    };
  }

  const bindingId = readStringAttribute(attributes, 'bindingId');

  if (!bindingId) {
    return { status: 'missing' };
  }

  const binding = registry.bindings.get(bindingId);

  if (binding) {
    return { binding, status: 'valid' };
  }

  const invalidBinding = registry.invalidBindings.get(bindingId);

  return invalidBinding
    ? { reference: invalidBinding, status: 'invalid' }
    : { status: 'missing' };
}

function readSummaryBlockBinding(
  attributes: Readonly<Record<string, unknown>> | undefined,
  registry: SummaryBlockBindingRegistry,
): SummaryBlockBindingReadResult {
  const inlineBinding = readStructuredAttribute(attributes, 'binding');

  if (inlineBinding !== undefined) {
    const inlineResult = SummaryBlockBindingSchema.safeParse(inlineBinding);

    if (inlineResult.success) {
      return { binding: inlineResult.data, status: 'valid' };
    }

    return {
      reference: createInvalidSummaryBlockBindingReference(
        inlineBinding,
        inlineResult.error.message,
      ),
      status: 'invalid',
    };
  }

  const bindingId = readStringAttribute(attributes, 'bindingId');

  if (!bindingId) {
    return { status: 'missing' };
  }

  const binding = registry.bindings.get(bindingId);

  if (binding) {
    return { binding, status: 'valid' };
  }

  const invalidBinding = registry.invalidBindings.get(bindingId);

  return invalidBinding
    ? { reference: invalidBinding, status: 'invalid' }
    : { status: 'missing' };
}

function readDocumentPlaceholder(
  attributes: Readonly<Record<string, unknown>> | undefined,
  registry: PlaceholderRegistry,
): PlaceholderReadResult {
  const inlinePlaceholder = readStructuredAttribute(attributes, 'placeholder');

  if (inlinePlaceholder !== undefined) {
    const inlineResult = DocumentPlaceholderSchema.safeParse(inlinePlaceholder);

    if (inlineResult.success) {
      return { placeholder: inlineResult.data, status: 'valid' };
    }

    return {
      reference: createInvalidPlaceholderReference(
        inlinePlaceholder,
        inlineResult.error.message,
      ),
      status: 'invalid',
    };
  }

  const placeholderId = readStringAttribute(attributes, 'placeholderId');

  if (!placeholderId) {
    return { status: 'missing' };
  }

  const placeholder = registry.bindings.get(placeholderId);

  if (placeholder) {
    return { placeholder, status: 'valid' };
  }

  const invalidPlaceholder = registry.invalidBindings.get(placeholderId);

  return invalidPlaceholder
    ? { reference: invalidPlaceholder, status: 'invalid' }
    : { status: 'missing' };
}

function readStructuredAttribute(
  attributes: Readonly<Record<string, unknown>> | undefined,
  name: string,
): unknown {
  const value = attributes?.[name];

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function parseConditionalRuleString(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function readNumberAttribute(
  attributes: Readonly<Record<string, unknown>> | undefined,
  name: string,
): number | undefined {
  const value = attributes?.[name];

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  return undefined;
}

function readBooleanAttribute(
  attributes: Readonly<Record<string, unknown>> | undefined,
  name: string,
): boolean | undefined {
  const value = attributes?.[name];

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function readScalarAttribute(
  attributes: Readonly<Record<string, unknown>> | undefined,
  name: string,
): string | undefined {
  const value = attributes?.[name];

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return undefined;
}

function readAlignmentAttribute(
  attributes: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
  const value = readStringAttribute(attributes, 'alignment');

  return value && safeAlignmentValues.has(value) ? value : undefined;
}

function joinClassNames(
  ...values: readonly (string | undefined)[]
): string | undefined {
  const className = values
    .flatMap((value) => value?.split(/\s+/) ?? [])
    .filter((value) => value.length > 0)
    .join(' ');

  return className.length > 0 ? className : undefined;
}

function hasNonEmptyString(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDocumentAssetRole(value: unknown): value is DocumentAssetRole {
  return (
    value === 'logo' ||
    value === 'image' ||
    value === 'signature' ||
    value === 'font' ||
    value === 'qr' ||
    value === 'attachment'
  );
}

function requiresAssetAltText(role: DocumentAssetRole): boolean {
  return (
    role === 'logo' || role === 'image' || role === 'signature' || role === 'qr'
  );
}

function isUnsafeProductionAssetUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.startsWith('blob:') ||
    normalized.startsWith('file:') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('http://localhost') ||
    normalized.startsWith('http://127.0.0.1') ||
    normalized.startsWith('http://[::1]')
  );
}

function clampHeadingLevel(level: number | undefined): number {
  if (!level) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(level), 1), 6);
}

function alignmentToMargin(alignment: string): string {
  if (alignment === 'center') {
    return '0 auto';
  }

  if (alignment === 'right') {
    return '0 0 0 auto';
  }

  return '0 auto 0 0';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFallbackBehavior(value: unknown): value is FallbackBehavior {
  if (!isRecord(value) || typeof value.mode !== 'string') {
    return false;
  }

  if (value.mode === 'use_value') {
    return 'value' in value;
  }

  return value.mode === 'none' || value.mode === 'omit';
}
