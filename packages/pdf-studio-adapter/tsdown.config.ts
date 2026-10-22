import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  deps: { neverBundle: ['@asym/docraptor-client', '@asym/pdf-editor', '@asym/pdf-renderer', '@asym/pdf-template-schema'] },
});
