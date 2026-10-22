import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/docraptor-preview.ts',
    './src/local-renderer.ts',
  ],
  format: ['esm', 'cjs'],
  dts: { generator: 'tsc' },
  deps: {
    neverBundle: ['@asym/docraptor-client', '@asym/pdf-template-schema'],
  },
});
