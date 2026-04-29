import {
  createRepeaterSectionExtension,
  getRepeaterSectionPreview,
  isValidRepeaterBinding,
  RepeaterSection,
} from '@asym/pdf-editor/extensions';
import type { JSONContent } from '@tiptap/core';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, describe, expect, it } from 'vitest';

const editors: Editor[] = [];

const donationBinding = {
  id: 'donation-rows',
  itemAlias: 'donation',
  maxItems: 1000,
  sourcePath: 'donations',
};

function createEditor(content?: JSONContent): Editor {
  const editor = new Editor({
    content,
    extensions: [Document, Paragraph, Text, RepeaterSection],
  });

  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
});

describe('Phase 17 repeater editor extension', () => {
  it('inserts a structured repeater section through a command', () => {
    const editor = createEditor();

    editor.commands.insertRepeaterSection({
      binding: donationBinding,
      content: {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Donation row' }],
      },
    });

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          attrs: {
            binding: donationBinding,
          },
          content: [
            {
              content: [{ text: 'Donation row', type: 'text' }],
              type: 'paragraph',
            },
          ],
          type: 'repeater',
        },
      ],
      type: 'doc',
    });
  });

  it('deserializes repeater JSON and renders deterministic editor DOM attrs', () => {
    const editor = createEditor({
      content: [
        {
          attrs: {
            binding: donationBinding,
          },
          content: [
            {
              content: [{ text: 'Donation row', type: 'text' }],
              type: 'paragraph',
            },
          ],
          type: 'repeater',
        },
      ],
      type: 'doc',
    });
    const section = editor.view.dom.querySelector('[data-asym-repeater]');

    expect(section?.getAttribute('data-repeater-source-path')).toBe(
      'donations',
    );
    expect(section?.getAttribute('data-repeater-item-alias')).toBe('donation');
    expect(section?.textContent).toContain('Donation row');
  });

  it('round-trips repeater HTML without losing nested content', () => {
    const editor = createEditor({
      content: [
        {
          attrs: {
            binding: donationBinding,
          },
          content: [
            {
              content: [{ text: 'Round trip row', type: 'text' }],
              type: 'paragraph',
            },
          ],
          type: 'repeater',
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
            binding: donationBinding,
          },
          content: [
            {
              content: [{ text: 'Round trip row', type: 'text' }],
              type: 'paragraph',
            },
          ],
          type: 'repeater',
        },
      ],
      type: 'doc',
    });
  });

  it('previews matched items and structured diagnostics without deleting content', () => {
    expect(
      getRepeaterSectionPreview({
        binding: donationBinding,
        context: {
          donations: [{ amount: 50 }, { amount: 125 }],
        },
      }),
    ).toMatchObject({
      diagnostics: [],
      itemCount: 2,
      visible: true,
    });

    expect(
      getRepeaterSectionPreview({
        binding: donationBinding,
        context: {},
      }),
    ).toMatchObject({
      diagnostics: [
        {
          code: 'missing_repeater_source',
          severity: 'warning',
        },
      ],
      itemCount: 0,
      visible: true,
    });
  });

  it('validates bindings and supports configured preview context', () => {
    const extension = createRepeaterSectionExtension({
      previewContext: {
        donations: [{ amount: 50 }],
      },
    });
    const editor = new Editor({
      content: {
        content: [
          {
            attrs: {
              binding: donationBinding,
            },
            content: [{ type: 'paragraph' }],
            type: 'repeater',
          },
        ],
        type: 'doc',
      },
      extensions: [Document, Paragraph, Text, extension],
    });
    editors.push(editor);

    expect(extension.name).toBe('repeater');
    expect(isValidRepeaterBinding(donationBinding)).toBe(true);
    expect(isValidRepeaterBinding({ sourcePath: 'donations' })).toBe(false);
    expect(
      editor.view.dom
        .querySelector('[data-asym-repeater]')
        ?.getAttribute('data-repeater-item-count'),
    ).toBe('1');
  });
});
