import {
  createVariableChipExtension,
  getVariableChipPreview,
  isKnownVariableChipKey,
  VariableChip,
} from '@asym/pdf-editor/extensions';
import { coreVariableRegistry } from '@asym/pdf-template-schema';
import type { JSONContent } from '@tiptap/core';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { afterEach, describe, expect, it } from 'vitest';

const editors: Editor[] = [];

function createEditor(content?: JSONContent): Editor {
  const editor = new Editor({
    content,
    extensions: [Document, Paragraph, Text, VariableChip],
  });

  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
});

describe('Phase 15 variable chip editor extension', () => {
  it('inserts protected structured variable chips through a command', () => {
    const editor = createEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    });

    editor.commands.insertVariableChip({
      key: 'recipient.full_name',
      label: 'Recipient Full Name',
    });

    expect(editor.getJSON()).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'variable',
              attrs: {
                key: 'recipient.full_name',
                label: 'Recipient Full Name',
              },
            },
          ],
        },
      ],
    });
  });

  it('deserializes variable chip JSON and renders a non-editable chip in the editor DOM', () => {
    const editor = createEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'variable',
              attrs: {
                key: 'donation.amount',
                formatter: 'currency.usd',
              },
            },
          ],
        },
      ],
    });

    const chip = editor.view.dom.querySelector('[data-asym-variable-chip]');

    expect(chip?.getAttribute('contenteditable')).toBe('false');
    expect(chip?.getAttribute('data-variable-key')).toBe('donation.amount');
    expect(chip?.getAttribute('data-variable-formatter')).toBe('currency.usd');
    expect(chip?.textContent).toBe('$125.00');
  });

  it('round-trips variable chip HTML through parseHTML without losing structured attrs', () => {
    const editor = createEditor(
      '<p><span data-asym-variable-chip="true" data-variable-key="recipient.full_name" data-variable-label="Donor" data-variable-formatter="text" data-variable-fallback="Friend">Donor</span></p>' as unknown as JSONContent,
    );

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'variable',
              attrs: {
                fallback: 'Friend',
                formatter: 'text',
                key: 'recipient.full_name',
                label: 'Donor',
              },
            },
          ],
        },
      ],
    });
  });

  it('round-trips structured fallback attrs through rendered HTML', () => {
    const editor = createEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'variable',
              attrs: {
                fallback: { mode: 'use_value', value: 'Friend' },
                key: 'document.footer_text',
              },
            },
          ],
        },
      ],
    });
    const html = editor.getHTML();
    editor.commands.setContent(html);

    expect(editor.getJSON()).toMatchObject({
      content: [
        {
          content: [
            {
              attrs: {
                fallback: { mode: 'use_value', value: 'Friend' },
                key: 'document.footer_text',
              },
              type: 'variable',
            },
          ],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });

  it('renders sample values, fallback values, and unknown-key diagnostics for preview', () => {
    const sampleData =
      coreVariableRegistry.createSampleData('donation_receipt');

    expect(
      getVariableChipPreview({
        context: sampleData,
        key: 'recipient.full_name',
      }),
    ).toMatchObject({
      displayValue: 'Jordan Lee',
      key: 'recipient.full_name',
      status: 'resolved',
      diagnostics: [],
    });

    expect(
      getVariableChipPreview({
        context: {},
        fallback: 'Friend',
        key: 'document.footer_text',
      }),
    ).toMatchObject({
      displayValue: 'Friend',
      key: 'document.footer_text',
      status: 'fallback',
      diagnostics: [
        {
          code: 'missing_optional_value',
          severity: 'warning',
          variableKey: 'document.footer_text',
        },
      ],
    });

    expect(
      getVariableChipPreview({
        context: sampleData,
        key: 'unknown.variable',
      }),
    ).toMatchObject({
      displayValue: 'Unknown variable',
      key: 'unknown.variable',
      status: 'unknown_variable',
      diagnostics: [
        {
          code: 'unknown_variable',
          severity: 'error',
          variableKey: 'unknown.variable',
        },
      ],
    });
  });

  it('detects known and broken variable keys through the registry', () => {
    expect(isKnownVariableChipKey('recipient.full_name')).toBe(true);
    expect(isKnownVariableChipKey('unknown.variable')).toBe(false);
  });

  it('supports configured registry and preview context without changing package exports', () => {
    const extension = createVariableChipExtension({
      previewContext: coreVariableRegistry.createSampleData('invoice'),
      registry: coreVariableRegistry,
    });
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, extension],
    });
    editors.push(editor);

    expect(extension.name).toBe('variable');
    expect(editor.commands.insertVariableChip({ key: 'invoice.total' })).toBe(
      true,
    );
    expect(editor.view.dom.textContent).toContain('$1,299.00');
  });
});
