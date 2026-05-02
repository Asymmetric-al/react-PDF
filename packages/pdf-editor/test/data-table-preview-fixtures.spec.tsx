import {
  DataTableBlock,
  getDataTablePreview,
} from '@asym/pdf-editor/extensions';
import { DocumentTemplateV1Schema } from '@asym/pdf-template-schema';
import type { JSONContent } from '@tiptap/core';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, describe, expect, it } from 'vitest';
import { tablePreviewFixtures } from '../../pdf-template-schema/test/fixtures/table-preview-fixtures';

const editors: Editor[] = [];

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

describe('Phase 21 data table preview fixtures in the editor extension', () => {
  it('round-trips each fixture dataTable node through deterministic editor HTML', () => {
    for (const fixture of tablePreviewFixtures) {
      const parsedTemplate = DocumentTemplateV1Schema.parse(fixture.template);
      const dataTableNodes = parsedTemplate.content.content
        .filter((node) => node.type === 'dataTable')
        .map((node) => ({
          ...(node.attrs ? { attrs: { ...node.attrs } } : {}),
          type: node.type,
        }));
      const editor = createEditor({
        content: dataTableNodes,
        type: 'doc',
      });
      const html = editor.getHTML();

      editor.commands.setContent(html);

      expect(editor.getJSON()).toMatchObject({
        content: [
          {
            attrs: {
              binding: null,
              bindingId: fixture.tableBindingId,
            },
            type: 'dataTable',
          },
        ],
        type: 'doc',
      });
      expect(html).toContain('data-asym-data-table="true"');
      expect(html).toContain(
        `data-table-binding-id="${fixture.tableBindingId}"`,
      );
    }
  });

  it('previews each fixture table binding against deterministic sample data', () => {
    for (const fixture of tablePreviewFixtures) {
      const parsedTemplate = DocumentTemplateV1Schema.parse(fixture.template);
      const binding = parsedTemplate.tableBindings[0];

      if (!binding) {
        throw new Error(`Missing table binding for ${fixture.id}.`);
      }

      const preview = getDataTablePreview({
        binding,
        bindingId: fixture.tableBindingId,
        context: fixture.dataContext,
      });

      expect(preview).toMatchObject({
        diagnostics: [],
        rowCount: fixture.expectedRowCount,
        status: 'valid',
      });
      expect(preview.bindingId).toBeUndefined();
      expect(preview.binding?.id).toBe(fixture.tableBindingId);
    }
  });
});
