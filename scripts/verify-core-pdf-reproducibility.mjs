import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const packages = [
  '@asym/docraptor-client',
  '@asym/pdf-template-schema',
  '@asym/pdf-renderer',
  '@asym/pdf-editor',
  '@asym/pdf-studio-adapter',
];
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    timeout: 180000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed`);
  return result.stdout;
}
async function sourceSnapshot() {
  const files = run(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    true,
  )
    .split('\0')
    .filter(Boolean)
    .sort();
  const snapshot = [];
  for (const relative of files) {
    const filename = path.join(root, relative);
    let stat;
    try {
      stat = await lstat(filename);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      snapshot.push([relative, 'missing']);
      continue;
    }
    assert.ok(
      stat.isFile() || stat.isSymbolicLink(),
      'Git-visible paths must be files or links',
    );
    const content = stat.isSymbolicLink()
      ? await readlink(filename)
      : await readFile(filename);
    snapshot.push([
      relative,
      stat.mode & 0o777,
      stat.isSymbolicLink() ? 'link' : 'file',
      createHash('sha256').update(content).digest('hex'),
    ]);
  }
  return snapshot;
}
const pnpm = process.env.npm_execpath;
assert.ok(pnpm, 'Run this check with pnpm core-pdf:reproduce');
const manifest = JSON.parse(
  await readFile(path.join(root, 'package.json'), 'utf8'),
);
const expectedVersion = manifest.packageManager.split('@')[1].split('+')[0];
assert.equal(run(pnpm, ['--version'], true).trim(), expectedVersion);
const sourceBefore = await sourceSnapshot();
const directory = await mkdtemp(path.join(os.tmpdir(), 'core-pdf-reproduce-'));
const rounds = [];
let passed = false;
try {
  for (let round = 0; round < 3; round++) {
    run(pnpm, [
      'exec',
      'turbo',
      'run',
      'build',
      ...packages.map((name) => `--filter=${name}`),
      '--force',
    ]);
    const hashes = {};
    for (const name of packages) {
      const output = path.join(directory, String(round), name.split('/')[1]);
      await mkdir(output, { recursive: true });
      run(pnpm, ['--filter', name, 'pack', '--pack-destination', output]);
      const files = await readdir(output);
      assert.equal(files.length, 1, `${name} must produce one package`);
      assert.ok(files[0].endsWith('.tgz'));
      hashes[name] = createHash('sha256')
        .update(await readFile(path.join(output, files[0])))
        .digest('hex');
    }
    rounds.push(hashes);
    assert.deepEqual(
      hashes,
      rounds[0],
      `Package bytes differ in round ${round + 1}`,
    );
  }
  assert.deepEqual(
    await sourceSnapshot(),
    sourceBefore,
    'Builds must not modify tracked source or emit untracked declarations',
  );
  console.log(
    JSON.stringify({
      passed: true,
      head: run('git', ['rev-parse', 'HEAD'], true).trim(),
      lockSha256: createHash('sha256')
        .update(await readFile(path.join(root, 'pnpm-lock.yaml')))
        .digest('hex'),
      rounds,
    }),
  );
  passed = true;
} finally {
  if (passed) {
    await rm(directory, { recursive: true, force: true });
  } else {
    console.error(`Reproduction evidence retained at ${directory}`);
  }
}
