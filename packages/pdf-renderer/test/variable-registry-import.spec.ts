import { composePdfDocumentHtml } from '@asym/pdf-renderer';
import { coreVariableRegistry } from '@asym/pdf-template-schema';
import { describe, expect, it } from 'vitest';

describe('Phase 13 variable registry renderer import boundary', () => {
  it('imports the shared registry without React or editor dependencies', () => {
    const sampleData =
      coreVariableRegistry.createSampleData('donation_receipt');
    const renderResult = composePdfDocumentHtml({
      document: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'variable',
                attrs: {
                  variableKey: 'recipient.full_name',
                },
              },
            ],
          },
        ],
      },
    });

    expect(sampleData).toMatchObject({
      recipient: {
        fullName: 'Jordan Lee',
      },
    });
    expect(renderResult.variables).toMatchObject([
      {
        key: 'recipient.full_name',
      },
    ]);
  });
});
