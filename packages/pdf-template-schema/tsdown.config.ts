import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    generator: 'tsc',
    tsconfig: './tsconfig.build.json',
    build: true,
    incremental: false,
  },
});
