import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceRoot = path.resolve(process.cwd(), '../..');
const packages = [
  'docraptor-client',
  'pdf-template-schema',
  'pdf-renderer',
  'pdf-editor',
  'pdf-studio-adapter',
];

describe('Core PDF compiler boundary', () => {
  it('uses native TypeScript 7 for product compilation and the supported JavaScript API for declarations', () => {
    for (const name of packages) {
      const manifest = path.join(
        workspaceRoot,
        'packages',
        name,
        'package.json',
      );
      const require = createRequire(manifest);
      const nativeManifest = require.resolve('@typescript/native/package.json');
      const native = require('@typescript/native/package.json');
      expect(native.version, `${name} native compiler`).toBe('7.0.2');
      const binary = path.resolve(path.dirname(nativeManifest), native.bin.tsc);
      expect(
        execFileSync(process.execPath, [binary, '--version'], {
          encoding: 'utf8',
        }).trim(),
      ).toBe('Version 7.0.2');

      const builder = createRequire(require.resolve('tsdown'));
      const declarations = createRequire(
        builder.resolve('rolldown-plugin-dts'),
      );
      expect(
        declarations('typescript/package.json').version,
        `${name} declaration compiler API`,
      ).toBe('6.0.3');
      const compiler = declarations('typescript');
      const source = compiler.createSourceFile(
        'receipt.ts',
        'export interface Receipt { amount: bigint }',
        compiler.ScriptTarget.Latest,
        true,
      );
      expect(source.parseDiagnostics).toEqual([]);
      expect(compiler.isInterfaceDeclaration(source.statements[0])).toBe(true);
    }
  });
});
