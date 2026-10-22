import {
  PdfEditor,
  type PdfEditorRef,
  ReactEmailStarterKitReference,
} from '@asym/pdf-editor';
import {
  ConditionalSection,
  DataTableBlock,
  PageBreakNode,
  RepeaterSection,
  VariableChip,
} from '@asym/pdf-editor/extensions';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

const warning = vi.spyOn(console, 'warn');

afterEach(() => {
  expect(warning.mock.calls.flat().join(' ')).not.toMatch(
    /duplicate extension names|multiple versions|already registered/i,
  );
  warning.mockClear();
});

describe('built Core PDF editor in Chromium', () => {
  it('accepts keyboard input and formatting through the public editor', async () => {
    let reference: PdfEditorRef | undefined;
    await render(
      <PdfEditor
        onReady={(ref) => {
          reference = ref;
        }}
      />,
    );
    const textbox = page.getByRole('textbox');
    await expect.element(textbox).toBeVisible();
    await expect.element(textbox).toHaveAttribute('contenteditable', 'true');
    await textbox.click();
    await userEvent.keyboard('Receipt amount $250.00');
    await userEvent.keyboard('{Control>}a{/Control}{Control>}b{/Control}');
    await expect.element(textbox).toHaveTextContent('Receipt amount $250.00');
    await expect.poll(() => reference?.editor?.getHTML()).toContain('<strong');
    expect(JSON.stringify(reference?.getJSON())).toContain(
      'Receipt amount $250.00',
    );
  });

  it('preserves custom nodes and their attributes through an actual editor round-trip', async () => {
    let reference: PdfEditorRef | undefined;
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { class: 'node-paragraph' },
          content: [
            { type: 'text', text: 'Donation ' },
            {
              type: 'variable',
              attrs: {
                key: 'donation.amount',
                formatter: 'currency.usd',
                fallback: { mode: 'use_value', value: '$250.00' },
              },
            },
          ],
        },
        {
          type: 'conditionalSection',
          attrs: {
            rule: {
              fieldPath: 'recipient.country',
              operator: 'equals',
              value: 'US',
            },
          },
          content: [
            {
              type: 'paragraph',
              attrs: { class: 'node-paragraph' },
              content: [{ type: 'text', text: 'Reviewed US donor clause' }],
            },
          ],
        },
        {
          type: 'repeater',
          attrs: {
            binding: {
              id: 'donation-rows',
              itemAlias: 'donation',
              maxItems: 1000,
              sourcePath: 'donations',
              filters: [],
            },
          },
          content: [
            {
              type: 'paragraph',
              attrs: { class: 'node-paragraph' },
              content: [{ type: 'text', text: 'Donation row' }],
            },
          ],
        },
        { type: 'dataTable', attrs: { bindingId: 'annual-statement-table' } },
        { type: 'pageBreak', attrs: { id: 'receipt-page-two' } },
        {
          type: 'paragraph',
          attrs: { class: 'node-paragraph' },
          content: [{ type: 'text', text: 'End of receipt' }],
        },
      ],
    };
    const editorContent = {
      type: 'doc',
      content: [{ type: 'container', content: content.content }],
    };
    await render(
      <PdfEditor
        content={editorContent}
        extensions={[
          ReactEmailStarterKitReference,
          VariableChip,
          ConditionalSection,
          RepeaterSection,
          DataTableBlock,
          PageBreakNode,
        ]}
        onReady={(ref) => {
          reference = ref;
        }}
      />,
    );
    await expect.poll(() => reference?.editor).toBeTruthy();
    const editor = reference?.editor;
    if (!editor) throw new Error('Public editor did not become ready');
    const before = editor.getJSON();
    expect(before).toMatchObject(editorContent);
    const html = editor.getHTML();
    expect(html).toContain('data-asym-variable-chip');
    expect(html).toContain('data-asym-repeater');
    expect(html).toContain('data-asym-data-table');
    editor.commands.setContent(html);
    expect(editor.getJSON()).toEqual(before);
    expect(page.getByRole('textbox').element().textContent).toContain(
      'Reviewed US donor clause',
    );
    editor.commands.setContent('<hr>');
    expect(editor.getJSON()).toMatchObject({
      type: 'doc',
      content: [{ type: 'horizontalRule' }],
    });
  });

  it('enforces the public read-only editor setting', async () => {
    let reference: PdfEditorRef | undefined;
    await render(
      <PdfEditor
        editable={false}
        content="<p>Reviewed legal wording</p>"
        onReady={(ref) => {
          reference = ref;
        }}
      />,
    );
    await expect.poll(() => reference?.editor).toBeTruthy();
    expect(reference?.editor?.isEditable).toBe(false);
    await expect
      .element(page.getByText('Reviewed legal wording'))
      .toBeVisible();
    await expect
      .element(page.getByRole('textbox'))
      .toHaveAttribute('contenteditable', 'false');
  });
});
