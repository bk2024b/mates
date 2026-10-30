import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
// Accepte également les arguments Vite ajoutés par certains environnements de prévisualisation.
const args = process.argv
  .slice(2)
  .filter((arg) => arg !== '--strictPort')
  .map((arg) => (arg === '--host' ? '--hostname' : arg));
const child = spawn(
  process.execPath,
  [
    createRequire(import.meta.url).resolve('next/dist/bin/next'),
    'dev',
    ...(args.includes('--hostname') ? [] : ['--hostname', '0.0.0.0']),
    ...args,
  ],
  { stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 1));
