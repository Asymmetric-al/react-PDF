import {
  ConditionalSection,
  createConditionalSectionExtension,
  getConditionalSectionPreview,
} from '@asym/pdf-editor/extensions';
import type { ConditionalRule } from '@asym/pdf-template-schema';
import type { JSONContent } from '@tiptap/core';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, describe, expect, it } from 'vitest';

const editors: Editor[] = [];

const usRecipientRule: ConditionalRule = {
  fieldPath: 'recipient.country',
  operator: 'equals',
  value: 'US',
};

function createEditor(content?: JSONContent): Editor {
  const editor = new Editor({
    content,
    extensions: [Document, Paragraph, Text, ConditionalSection],
  });

  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
});

describe('Phase 16 conditional section editor extension', () => {
  it('inserts a structured conditional section through a command', () => {
    const editor = createEditor();

    editor.commands.insertConditionalSection({
      content: {
        type: 'paragraph',
        content: [{ type: 'text', text: 'US donor language' }],
      },
      rule: usRecipientRule,
    });

    expect(editor.getJSON()).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'conditionalSection',
          attrs: {
            rule: usRecipientRule,
          },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'US donor language' }],
            },
          ],
        },
      ],
    });
  });

  it('deserializes conditional JSON and renders an editor-visible wrapper', () => {
    const editor = createEditor({
      type: 'doc',
      content: [
        {
          type: 'conditionalSection',
          attrs: {
            rule: usRecipientRule,
          },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'US donor language' }],
            },
          ],
        },
      ],
    });
    const section = editor.view.dom.querySelector(
      '[data-asym-conditional-section]',
    );

    expect(section?.getAttribute('data-condition-field-path')).toBe(
      'recipient.country',
    );
    expect(section?.getAttribute('data-condition-operator')).toBe('equals');
    expect(section?.textContent).toContain('US donor language');
  });

  it('round-trips conditional section HTML without losing nested content', () => {
    const editor = createEditor({
      type: 'doc',
      content: [
        {
          type: 'conditionalSection',
          attrs: {
            rule: usRecipientRule,
          },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Round trip content' }],
            },
          ],
        },
      ],
    });
    const html = editor.getHTML();
    editor.commands.setContent(html);

    expect(editor.getJSON()).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'conditionalSection',
          attrs: {
            rule: usRecipientRule,
          },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Round trip content' }],
            },
          ],
        },
      ],
    });
  });

  it('evaluates preview visibility and diagnostics without deleting editor content', () => {
    expect(
      getConditionalSectionPreview({
        context: { recipient: { country: 'US' } },
        rule: usRecipientRule,
      }),
    ).toMatchObject({
      visible: true,
      diagnostics: [],
    });
    expect(
      getConditionalSectionPreview({
        context: { recipient: { country: 'CA' } },
        rule: usRecipientRule,
      }),
    ).toMatchObject({
      visible: false,
      diagnostics: [],
    });
    expect(
      getConditionalSectionPreview({
        context: {},
        rule: usRecipientRule,
      }),
    ).toMatchObject({
      visible: false,
      diagnostics: [
        {
          code: 'missing_condition_field',
          severity: 'warning',
        },
      ],
    });
  });

  it('supports configured preview context through the extension factory', () => {
    const extension = createConditionalSectionExtension({
      previewContext: { recipient: { country: 'US' } },
    });
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, extension],
      content: {
        type: 'doc',
        content: [
          {
            type: 'conditionalSection',
            attrs: {
              rule: usRecipientRule,
            },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Configured preview' }],
              },
            ],
          },
        ],
      },
    });
    editors.push(editor);

    const section = editor.view.dom.querySelector(
      '[data-asym-conditional-section]',
    );

    expect(extension.name).toBe('conditionalSection');
    expect(section?.getAttribute('data-condition-visible')).toBe('true');
  });
});
