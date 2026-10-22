import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    extensions: 'src/extensions/index.ts',
    index: 'src/index.ts',
    'react-email-compat': 'src/react-email-compat.ts',
    'migration/unlayer': 'src/migration/unlayer/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: { generator: 'tsc' },
  deps: {
    neverBundle: [
      '@asym/pdf-template-schema',
      '@tiptap/core',
      '@react-email/editor',
      '@react-email/editor/core',
      '@react-email/editor/extensions',
      '@react-email/editor/plugins',
      '@react-email/editor/ui',
      /^react($|\/)/,
      /^react-dom($|\/)/,
    ],
  },
});
