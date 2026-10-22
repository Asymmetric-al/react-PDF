import { readFileSync } from 'node:fs';
import {
  createBrowserPdfPreview,
  preflightPdfTemplate,
} from '@asym/pdf-renderer';
import * as adapterExports from '@asym/pdf-studio-adapter';
import {
  createPdfStudioAdapter,
  type PdfStudioAdapterDependencies,
} from '@asym/pdf-studio-adapter';
import {
  createFakePdfPermissionAdapter,
  DocumentTemplateV1Schema,
  PdfAuthorizationDecisionSchema,
  PdfBuilderFeatureFlagContractSchema,
  PdfSecurityContextSchema,
  RenderResultSchema,
  starterPdfTemplateFixtureByCategory,
} from '@asym/pdf-template-schema';
import { describe, expect, it, vi } from 'vitest';

const captured: { exports: { adapter: string[] } } = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/maintenance/core-pdf-modernization/shipped-contracts.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const fixture = starterPdfTemplateFixtureByCategory.donation_receipt;

function createFixture(enabled = false) {
  const template = DocumentTemplateV1Schema.parse(fixture.template);
  const context = PdfSecurityContextSchema.parse({
    tenantId: 'tenant-a',
    actor: { type: 'user', id: 'fixture-staff' },
    permissions: ['render.preview', 'render.production'],
  });
  const flag = PdfBuilderFeatureFlagContractSchema.parse({
    flagName: 'native-pdf-builder',
    enabled,
  });
  const preview = vi.fn(createBrowserPdfPreview);
  const render = vi.fn(async () =>
    RenderResultSchema.parse({ status: 'success', renderer: 'docraptor' }),
  );
  const preflight = vi.fn(preflightPdfTemplate);
  const authorize = vi.fn(
    createFakePdfPermissionAdapter({ context }).authorize,
  );
  const dependencies: PdfStudioAdapterDependencies = {
    editor: {
      createEditor: (input) => ({
        engine: input.engine,
        mountId: input.mountId,
      }),
    },
    templates: {
      loadTemplate: () => ({ engine: 'asym_pdf_document_builder', template }),
      saveTemplate: (input) => ({
        engine: 'asym_pdf_document_builder',
        template: input.template,
        lifecycle: input.lifecycle,
      }),
    },
    lifecycle: {
      loadLifecycle: () => undefined,
      saveLifecycle: (input) => input.lifecycle,
    },
    preview: { createPreview: preview },
    render: { render },
    preflight: { run: preflight },
    featureFlags: { resolveNativeBuilderFlag: () => flag },
    auth: { authorize },
  };
  return {
    adapter: createPdfStudioAdapter(dependencies),
    context,
    template,
    preview,
    render,
    preflight,
    authorize,
  };
}

describe('restored Core PDF adapter contracts', () => {
  it('retains every shipped public runtime export', () => {
    expect(Object.keys(adapterExports).sort()).toEqual(
      [...captured.exports.adapter].sort(),
    );
  });

  it('keeps native documents on the legacy editor when the flag is disabled', async () => {
    const { adapter, template } = createFixture();
    const loaded = await adapter.loadTemplate({
      templateId: template.id,
      tenantId: 'tenant-a',
    });
    expect(loaded.featureFlag.enabled).toBe(false);
    expect(loaded.engineSelection).toEqual({
      selectedEngine: 'unlayer',
      editor: 'legacy_unlayer',
      reason: 'feature_flag_disabled',
    });
    expect(loaded.record).toMatchObject({
      engine: 'asym_pdf_document_builder',
      template,
    });
  });

  it('selects the native editor only when the supplied feature flag is enabled', async () => {
    const { adapter, template } = createFixture(true);
    const loaded = await adapter.loadTemplate({
      templateId: template.id,
      tenantId: 'tenant-a',
    });
    expect(loaded.engineSelection).toEqual({
      selectedEngine: 'asym_pdf_document_builder',
      editor: 'native_pdf_builder',
      reason: 'native_feature_enabled',
    });
  });

  it('previews an authorized document without making a production provider call', async () => {
    const { adapter, context, template, render, preview } = createFixture();
    const result = await adapter.previewTemplate({
      context,
      template,
      dataContext: fixture.sampleData,
      previewId: 'adapter-preview',
    });
    expect(result.authorization.ok).toBe(true);
    expect(result.preview.status).toBe('success');
    expect(result.preview.snapshots?.bodyHtml).toContain('Donation Receipt');
    expect(preview).toHaveBeenCalledTimes(1);
    expect(render).not.toHaveBeenCalled();
  });

  it('denies a missing preview permission before preflight or preview', async () => {
    const { adapter, context, template, preflight, preview, render } =
      createFixture();
    await expect(
      adapter.previewTemplate({
        context: { ...context, permissions: [] },
        template,
      }),
    ).rejects.toMatchObject({
      code: 'unauthorized',
      decision: { reasonCode: 'missing_permission' },
    });
    expect(preflight).not.toHaveBeenCalled();
    expect(preview).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it('honors the host tenant denial before preflight or the provider', async () => {
    const { adapter, context, template, preflight, render, authorize } =
      createFixture();
    authorize.mockReturnValueOnce(
      PdfAuthorizationDecisionSchema.parse({
        ok: false,
        action: 'production_render',
        tenantId: 'tenant-a',
        resourceTenantId: 'tenant-b',
        reasonCode: 'tenant_mismatch',
      }),
    );
    await expect(
      adapter.renderTemplate({
        context: { ...context, tenantId: 'tenant-b' },
        template,
        renderId: 'denied-render',
      }),
    ).rejects.toMatchObject({
      code: 'unauthorized',
      decision: { reasonCode: 'tenant_mismatch' },
    });
    expect(preflight).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it('passes a qualified render identity and data to exactly one provider adapter invocation', async () => {
    const { adapter, context, template, render } = createFixture();
    const result = await adapter.renderTemplate({
      context,
      template,
      dataContext: fixture.sampleData,
      renderId: 'allowed-render',
    });
    expect(result.authorization.ok).toBe(true);
    expect(result.preflight.ok).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        renderId: 'allowed-render',
        renderer: 'docraptor',
        template,
        dataContext: fixture.sampleData,
      }),
    );
  });

  it('blocks the provider when actual production preflight finds missing required values', async () => {
    const { adapter, context, template, render } = createFixture();
    await expect(
      adapter.renderTemplate({
        context,
        template,
        dataContext: {},
        renderId: 'invalid-data-render',
      }),
    ).rejects.toMatchObject({ code: 'preflight_failed' });
    expect(render).not.toHaveBeenCalled();
  });

  it('fails closed when no asset adapter can authorize a signed URL', async () => {
    const { adapter } = createFixture();
    await expect(
      adapter.createSignedAssetUrl({
        request: {
          tenantId: 'tenant-a',
          assetId: 'asset-a',
          purpose: 'browser_preview',
        },
      }),
    ).rejects.toMatchObject({ code: 'missing_adapter' });
  });
});
