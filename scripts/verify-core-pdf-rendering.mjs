import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const rendererRequire = createRequire(
  path.join(root, 'packages/pdf-renderer/package.json'),
);
const editorRequire = createRequire(
  path.join(root, 'packages/editor/package.json'),
);
const { chromium } = editorRequire('playwright');
const {
  composePdfDocumentHtml,
  composePrintDocumentHtml,
  resolvePdfDocumentVariables,
} = rendererRequire('@asym/pdf-renderer');
const { renderPlaywrightLocalPdf } = rendererRequire(
  '@asym/pdf-renderer/local-renderer',
);
const schemaRequire = createRequire(
  path.join(root, 'packages/pdf-template-schema/package.json'),
);
const { DocumentTemplateV1Schema } = schemaRequire('@asym/pdf-template-schema');
const args = process.argv.slice(2);
assert.ok(
  args.length === 0 || (args.length === 2 && args[0] === '--output-dir'),
  'Use --output-dir <directory>',
);
const outputDirectory = args.length
  ? path.resolve(args[1])
  : path.join(root, 'tmp/pdfs/core-modernization');
const capturePath = path.join(
  root,
  'docs/maintenance/core-pdf-modernization/shipped-contracts.json',
);
const captureBytes = await readFile(capturePath);
const captured = JSON.parse(captureBytes);
assert.equal(captured.schemaVersion, 2);
assert.equal(captured.fixtures.length, 8);
await mkdir(outputDirectory, { recursive: true });
const startedAt = new Date().toISOString();
const records = [];
const browserVersions = new Set();
const fixtureImages = new Map([
  ['/asym/starter-logo.png', { width: 180, height: 54, label: 'Fixture logo' }],
  [
    '/asym/starter-field-photo.png',
    { width: 320, height: 180, label: 'Fixture field photo' },
  ],
  [
    '/asym/starter-signature.png',
    { width: 220, height: 72, label: 'Fixture signature' },
  ],
]);

for (const fixture of captured.fixtures) {
  assert.match(fixture.category, /^[a-z_]+$/);
  const template = DocumentTemplateV1Schema.parse(fixture.input.template);
  const document = composePdfDocumentHtml({
    document: template.content,
    assetReferences: template.assets,
    assetRenderMode: 'browser_preview',
    dataContext: fixture.input.dataContext,
    placeholderBindings: template.placeholderBindings,
    repeaterBindings: template.repeaterBindings,
    summaryBlockBindings: template.summaryBlockBindings,
    tableBindings: template.tableBindings,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(document)), fixture.document);
  const printed = composePrintDocumentHtml({
    title: template.name,
    document,
    pageSettings: template.pageSettings,
    theme: template.theme,
    metadata: template.pdfSettings?.metadata,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(printed)), fixture.printed);
  const resolvedVariables = resolvePdfDocumentVariables({
    variables: document.variables,
    context: fixture.input.dataContext,
  });
  const recipient = resolvedVariables.values.find(
    (value) => value.key === 'recipient.full_name',
  );
  if (recipient) {
    assert.equal(recipient.status, 'resolved');
    assert.equal(recipient.formattedValue, 'Jordan Lee');
  }
  // The public serializer deliberately preserves variable placeholders. Prove
  // resolution separately, without introducing a new product binding layer.
  const blockedRequests = [];
  const fixtureRequests = [];
  const pageErrors = [];
  let visible;
  const browserLauncher = {
    async launch(options) {
      const browser = await chromium.launch(options);
      browserVersions.add(browser.version());
      const context = await browser.newContext({
        viewport: { width: 1000, height: 1400 },
        serviceWorkers: 'block',
      });
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        const image = fixtureImages.get(url.pathname);
        if (url.origin === 'https://assets.example.test' && image) {
          fixtureRequests.push(url.pathname);
          await route.fulfill({
            contentType: 'image/svg+xml',
            body: `<svg xmlns="http://www.w3.org/2000/svg" width="${image.width}" height="${image.height}"><rect width="${image.width}" height="${image.height}" fill="#eee"/><text x="12" y="33" fill="#111" font-family="sans-serif" font-size="18">${image.label}</text></svg>`,
          });
        } else {
          blockedRequests.push({ protocol: url.protocol, host: url.hostname });
          await route.abort();
        }
      });
      return {
        async newPage() {
          const page = await context.newPage();
          page.on('pageerror', (error) => pageErrors.push(error.name));
          await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
          return {
            async setContent(html, options) {
              await page.setContent(html, options);
              await page.evaluate(() => document.fonts.ready);
              visible = await page.evaluate(() => ({
                // biome-ignore lint/performance/useDomNodeTextContent: Printed visible text is the contract; hidden text must be excluded.
                text: document.body.innerText,
                images: Array.from(document.images, (image) => ({
                  complete: image.complete,
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                })),
                horizontalOverflow:
                  document.documentElement.scrollWidth >
                  document.documentElement.clientWidth + 1,
              }));
              assert.ok(
                visible.text.trim().length > 20,
                'Nonempty visible document',
              );
              assert.ok(
                visible.images.every(
                  (image) => image.complete && image.width > 0,
                ),
                'Every fixture image decoded',
              );
              assert.equal(
                visible.horizontalOverflow,
                false,
                'No horizontal document overflow',
              );
            },
            pdf: (options) => page.pdf(options),
            screenshot: (options) => page.screenshot(options),
            close: () => page.close(),
          };
        },
        async close() {
          await context.close();
          await browser.close();
        },
      };
    },
  };
  const result = await renderPlaywrightLocalPdf({
    browserLauncher,
    html: printed.html,
    css: printed.css,
    pageSettings: template.pageSettings,
    includeScreenshot: true,
    setContentOptions: { waitUntil: 'networkidle', timeout: 30000 },
  });
  if (result.status !== 'success') {
    const failure = {
      category: fixture.category,
      status: result.status,
      diagnostics: result.diagnostics,
      visible,
      blockedRequests,
      fixtureRequests,
      pageErrors,
    };
    const filename = `failure-${Date.now()}-${fixture.category}.json`;
    await writeFile(
      path.join(outputDirectory, filename),
      JSON.stringify(failure, null, 2),
    );
    throw new Error(
      `${fixture.category} local rendering failed; see ${filename}`,
    );
  }
  assert.equal(result.metadata.productionRender, false);
  assert.equal(result.metadata.finalPdfFidelity, false);
  assert.equal(result.metadata.productionRenderer, 'docraptor');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(
    blockedRequests,
    [],
    'Unexpected network access is denied and fails qualification',
  );
  const artifacts = [];
  for (const artifact of result.artifacts) {
    const extension = artifact.kind === 'pdf-bytes' ? 'pdf' : 'png';
    const filename = `${fixture.category}.${extension}`;
    await writeFile(path.join(outputDirectory, filename), artifact.bytes);
    artifacts.push({
      filename,
      kind: artifact.kind,
      bytes: artifact.bytes.length,
      sha256: createHash('sha256').update(artifact.bytes).digest('hex'),
    });
  }
  assert.equal(artifacts.length, 2);
  records.push({
    category: fixture.category,
    page: result.metadata.page,
    visible,
    fixtureRequests,
    blockedRequests,
    pageErrors,
    resolvedVariables,
    artifacts,
  });
}
const proof = {
  startedAt,
  completedAt: new Date().toISOString(),
  passed: true,
  captureSha256: createHash('sha256').update(captureBytes).digest('hex'),
  playwrightVersion: editorRequire('playwright/package.json').version,
  browserVersions: [...browserVersions],
  fixtureAssets:
    'Only the three existing synthetic starter logo/signature/field-photo URLs are fulfilled with local dimension-matched SVGs; other network access is denied.',
  scope:
    'Raw serializer placeholder HTML and separate public variable resolution, local Chromium rendering and screenshots; no new assembled-document binding. DocRaptor production-fidelity qualification remains separate.',
  records,
};
await writeFile(
  path.join(outputDirectory, 'qualification.json'),
  `${JSON.stringify(proof, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    passed: proof.passed,
    documents: records.length,
    outputDirectory,
  }),
);
