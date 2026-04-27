import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/docraptor-preview.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  deps: {
    neverBundle: ['@asym/docraptor-client', '@asym/pdf-template-schema'],
  },
});
