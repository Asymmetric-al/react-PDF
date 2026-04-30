import type {
  ConditionalRule,
  DocumentContentNode,
  FallbackBehavior,
  RepeaterBinding,
  RepeaterBindingInput,
  ResolvedTableCell,
  ResolvedTableRow,
  TableBinding,
  TableBindingInput,
  VariableDataContext,
} from '@asym/pdf-template-schema';
import {
  ConditionalRuleSchema,
  RepeaterBindingSchema,
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
  | 'invalid_document'
  | 'missing_attribute'
  | 'invalid_repeater_binding'
  | 'invalid_table_binding'
  | 'unsafe_url'
  | 'unknown_mark'
  | 'unknown_node'
  | 'unsupported_mark'
  | 'unsupported_node'
  | 'condition_evaluation_error'
  | 'condition_evaluation_warning'
  | 'invalid_condition_rule'
  | 'missing_condition_context'
  | 'missing_repeater_binding'
  | 'missing_repeater_context'
  | 'missing_repeater_source'
  | 'missing_table_binding'
  | 'missing_table_context'
  | 'missing_table_source'
  | 'non_array_repeater_source'
  | 'non_array_table_source'
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
  readonly src: string;
  readonly altText?: string;
  readonly role?: string;
  readonly width?: string;
  readonly height?: string;
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
  readonly renderChildren: (
    children: readonly unknown[] | undefined,
    path: readonly string[],
  ) => string;
  readonly addWarning: (warning: PdfDocumentRenderWarning) => void;
  readonly addAsset: (asset: PdfDocumentAssetReference) => void;
  readonly addVariable: (usage: PdfDocumentVariableUsage) => void;
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
  readonly dataContext?: VariableDataContext;
  readonly repeaterBindings?: readonly RepeaterBindingInput[];
  readonly tableBindings?: readonly TableBindingInput[];
  readonly nodeRenderers?: readonly PdfDocumentNodeRenderer[];
  readonly markRenderers?: readonly PdfDocumentMarkRenderer[];
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

interface RenderState {
  readonly nodeRenderers: ReadonlyMap<string, PdfDocumentNodeRenderer>;
  readonly markRenderers: ReadonlyMap<string, PdfDocumentMarkRenderer>;
  readonly repeaterBindings: RepeaterBindingRegistry;
  readonly tableBindings: TableBindingRegistry;
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
  '.pdf-repeater{display:block;}',
  '.pdf-repeater-empty{display:block;}',
  '.pdf-repeater-item{display:block;}',
  '.pdf-data-table{border-collapse:collapse;width:100%;}',
  '.pdf-data-table-empty{display:block;}',
  '.pdf-data-table-footer{display:table-footer-group;}',
  '.pdf-data-table-header{display:table-header-group;}',
  '.pdf-table{border-collapse:collapse;width:100%;}',
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
  const repeaterBindings = createRepeaterBindingRegistry(
    input.repeaterBindings,
  );
  const tableBindings = createTableBindingRegistry(input.tableBindings);
  const state: RenderState = {
    dataContext: input.dataContext,
    nodeRenderers,
    markRenderers,
    repeaterBindings,
    tableBindings,
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

  const childrenHtml = renderChildren(value.content, path, state);
  const renderer = state.nodeRenderers.get(value.type);

  if (renderer) {
    return renderer.render({
      node: value,
      path,
      childrenHtml,
      renderChildren: (children, childPath) =>
        renderChildren(children, childPath, state),
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
      childrenHtml: renderChildren(node.content, path, state),
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
      childrenHtml: renderChildren(node.content, path, state),
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
      childrenHtml: renderChildren(node.content, path, state),
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

  const bodyHtml =
    result.rows.length === 0
      ? renderDataTableEmptyState(binding)
      : renderDataTableRows(result.rows);

  return renderDataTableShell({
    binding,
    bodyHtml,
    node,
    path,
    totalPlaceholdersHtml: renderDataTableTotalPlaceholders(binding),
  });
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

function renderDataTableRows(rows: readonly ResolvedTableRow[]): string {
  return rows
    .map((row) =>
      renderElement(
        'tr',
        {
          class: 'pdf-data-table-row',
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
      class: 'pdf-data-table-empty',
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
          class: 'pdf-data-table-total-placeholder',
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
): string {
  if (!children) {
    return '';
  }

  return children
    .map((child, index) =>
      renderNode(child, [...path, 'content', String(index)], state),
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
  return renderElement(
    'section',
    getElementAttributes(context.node, {
      className: 'pdf-document-section',
    }),
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
      renderChildren(node.content, path, state),
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
    renderChildren(node.content, path, state),
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

  return renderElement(
    `h${level}`,
    getElementAttributes(context.node, {
      excludedAttributeNames: ['level'],
    }),
    context.childrenHtml,
  );
}

function renderImage(context: PdfDocumentNodeRendererContext): string {
  const src = readStringAttribute(context.node.attrs, 'src');

  if (!src) {
    context.addWarning({
      code: 'missing_attribute',
      severity: 'warning',
      message: 'Phase 09 image node is missing a src attribute.',
      path: context.path,
      nodeType: context.node.type,
      details: { attribute: 'src' },
    });
    return '';
  }

  const altText =
    readStringAttribute(context.node.attrs, 'alt') ??
    readStringAttribute(context.node.attrs, 'altText');
  const width = readScalarAttribute(context.node.attrs, 'width');
  const height = readScalarAttribute(context.node.attrs, 'height');
  const role = readStringAttribute(context.node.attrs, 'role');
  const attributes: AttributeMap = {
    ...getElementAttributes(context.node, {
      className: 'pdf-image',
      excludedAttributeNames: [
        'alignment',
        'alt',
        'altText',
        'height',
        'role',
        'src',
        'width',
      ],
    }),
    src,
  };

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
    src,
    altText,
    role,
    width,
    height,
    path: context.path,
  });

  return renderElement('img', attributes, '', true);
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
  return renderElement(
    'tr',
    getElementAttributes(context.node),
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
