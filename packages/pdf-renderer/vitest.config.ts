import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@asym/pdf-renderer/docraptor-preview',
        replacement: resolve(currentDirectory, 'src/docraptor-preview.ts'),
      },
      {
        find: '@asym/pdf-renderer',
        replacement: resolve(currentDirectory, 'src/index.ts'),
      },
      {
        find: '@asym/docraptor-client',
        replacement: resolve(
          currentDirectory,
          '../docraptor-client/src/index.ts',
        ),
      },
      {
        find: '@asym/pdf-template-schema',
        replacement: resolve(
          currentDirectory,
          '../pdf-template-schema/src/index.ts',
        ),
      },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
  },
});
