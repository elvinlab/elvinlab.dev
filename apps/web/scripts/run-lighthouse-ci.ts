import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '../../..');
const cli = join(root, 'node_modules/@lhci/cli/src/cli.js');
const result = spawnSync(process.execPath, [cli, 'autorun'], {
  cwd: root,
  env: { ...process.env, CHROME_PATH: chromium.executablePath() },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
