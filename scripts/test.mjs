import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
// Liste explicite : même comportement sous PowerShell et les shells Unix.
const directory = process.argv[2] === 'integration' ? 'tests/integration' : 'tests';
const files = readdirSync(directory)
  .filter((name) => name.endsWith('.test.ts'))
  .sort()
  .map((name) => path.join(directory, name));
const child = spawn(process.execPath, ['--import', 'tsx', '--test', ...files], {
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 1));
