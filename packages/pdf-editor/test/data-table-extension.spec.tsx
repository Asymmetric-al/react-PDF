import { readFileSync } from 'node:fs';
import {
  createDataTableExtension,
  DataTableBlock,
  getDataTablePreview,
  isValidTableBinding,
} from '@asym/pdf-editor/extensions';
import type { TableBindingInput } from '@asym/pdf-template-schema';
import type { JSONContent } from '@tiptap/core';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, describe, expect, it } from 'vitest';

const editors: Editor[] = [];

const financialTableBinding = {
  id: 'financial-report-table',
  sourcePath: 'financialRows',
  emptyState: 'No financial rows.',
  repeatHeader: true,
  grouping: {
    fieldPath: 'fund',
    label: 'Fund',
  },
  totals: [
    {
      columnKey: 'total',
      operation: 'sum',
      label: 'Report total',
    },
  ],
  columns: [
    {
      key: 'account',
      label: 'Account',
      sourcePath: 'account',
      type: 'string',
      width: '45%',
    },
    {
      key: 'total',
      label: 'Total',
      sourcePath: 'total',
      type: 'currency',
      formatter: 'currency.usd',
      align: 'right',
      width: '25%',
    },
  ],
} satisfies TableBindingInput;

function createEditor(content?: JSONContent): Editor {
  const editor = new Editor({
    content,
    extensions: [Document, Paragraph, Text, DataTableBlock],
  });

  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
});

describe('Phase 18 data table editor extension', () => {
  it('inserts a structured data table through a command', () => {
    const editor = createEditor();

    editor.commands.insertDataTable({
      binding: financialTableBinding,
    });

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          attrs: {
            binding: financialTableBinding,
          },
          type: 'dataTable',
        },
      ],
      type: 'doc',
    });
  });

  it('deserializes data table JSON and renders deterministic editor DOM attrs', () => {
    const editor = createEditor({
      content: [
        {
          attrs: {
            binding: financialTableBinding,
          },
          type: 'dataTable',
        },
      ],
      type: 'doc',
    });
    const block = editor.view.dom.querySelector('[data-asym-data-table]');

    expect(block?.getAttribute('data-table-binding-id')).toBe(
      'financial-report-table',
    );
    expect(block?.getAttribute('data-table-source-path')).toBe('financialRows');
    expect(block?.getAttribute('data-table-column-count')).toBe('2');
    expect(block?.textContent).toContain('Financial data table');
  });

  it('round-trips table HTML without losing the structured binding', () => {
    const editor = createEditor({
      content: [
        {
          attrs: {
            binding: financialTableBinding,
          },
          type: 'dataTable',
        },
      ],
      type: 'doc',
    });
    const html = editor.getHTML();
    editor.commands.setContent(html);

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          attrs: {
            binding: financialTableBinding,
          },
          type: 'dataTable',
        },
      ],
      type: 'doc',
    });
  });

  it('returns preview diagnostics for valid, missing, and invalid bindings', () => {
    expect(
      getDataTablePreview({
        binding: financialTableBinding,
        context: {
          financialRows: [{ account: 'Income', fund: 'General', total: 100 }],
        },
      }),
    ).toMatchObject({
      diagnostics: [],
      rowCount: 1,
      status: 'valid',
    });

    expect(getDataTablePreview({})).toMatchObject({
      diagnostics: [
        {
          code: 'missing_table_binding',
          severity: 'error',
        },
      ],
      rowCount: 0,
      status: 'missing_binding',
    });

    expect(
      getDataTablePreview({
        binding: {
          id: 'invalid-table',
          sourcePath: 'financialRows',
          maxRows: 9000,
          columns: [
            {
              key: 'account',
              label: 'Account',
              sourcePath: 'account',
              type: 'string',
            },
          ],
        },
      }),
    ).toMatchObject({
      diagnostics: [
        {
          code: 'invalid_table_binding',
          severity: 'error',
        },
      ],
      status: 'invalid_binding',
    });
  });

  it('exports the extension helpers without renderer or DocRaptor imports', () => {
    const extension = createDataTableExtension();
    const source = readFileSync('src/extensions/data-table/index.ts', 'utf8');

    expect(extension.name).toBe('dataTable');
    expect(DataTableBlock).toBeDefined();
    expect(isValidTableBinding(financialTableBinding)).toBe(true);
    expect(isValidTableBinding({ sourcePath: 'financialRows' })).toBe(false);
    expect(source).not.toContain('@asym/pdf-renderer');
    expect(source).not.toContain('@asym/docraptor-client');
  });
});
