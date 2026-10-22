import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Node } from '@tiptap/core';
import { Fragment, Schema } from '@tiptap/pm/model';
import { ReplaceStep, Transform } from '@tiptap/pm/transform';
import { describe, expect, it } from 'vitest';
import { DocumentNode } from '../src';

const packageRequire = createRequire(resolve(process.cwd(), 'package.json'));
const emailRequire = createRequire(
  packageRequire.resolve('@react-email/editor'),
);

describe('modern PDF editor runtime identity', () => {
  it('shares one Tiptap core with the public React Email editor', () => {
    expect(realpathSync(emailRequire.resolve('@tiptap/core'))).toBe(
      realpathSync(packageRequire.resolve('@tiptap/core')),
    );
    expect(Object.getPrototypeOf(DocumentNode)).toBe(Node);
  });

  it('keeps parsed replacement fragments and node splitting in one model runtime', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: { content: 'text*' },
        text: { group: 'inline' },
      },
    });
    const replacement = ReplaceStep.fromJSON(schema, {
      stepType: 'replace',
      from: 0,
      to: 0,
      slice: { content: [{ type: 'paragraph' }] },
    });
    if (!(replacement instanceof ReplaceStep)) {
      throw new Error('Expected the public replacement step contract');
    }
    expect(replacement.slice.content).toBeInstanceOf(Fragment);
    const document = schema.node('doc', null, [
      schema.node('paragraph', null, schema.text('abcd')),
    ]);
    const split = new Transform(document).split(3).doc;
    expect(split.toJSON()).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'ab' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'cd' }] },
      ],
    });
  });

  it('shares one ProseMirror model through both editor package boundaries', () => {
    const pdfPmRequire = createRequire(
      packageRequire.resolve('@tiptap/pm/model'),
    );
    const emailPmRequire = createRequire(
      emailRequire.resolve('@tiptap/pm/model'),
    );
    expect(realpathSync(emailPmRequire.resolve('prosemirror-model'))).toBe(
      realpathSync(pdfPmRequire.resolve('prosemirror-model')),
    );
  });
});
