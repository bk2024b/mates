import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env.local')) {
  console.log('.env.local existe déjà. Aucun changement effectué.');
} else {
  const template = readFileSync('.env.example', 'utf8');
  writeFileSync(
    '.env.local',
    template.replace(
      'APP_SESSION_SECRET=',
      `APP_SESSION_SECRET=${randomBytes(32).toString('hex')}`,
    ),
    { mode: 0o600, flag: 'wx' },
  );
  console.log(
    '.env.local créé avec un secret de session aléatoire. Renseigne LIVEKIT_URL, LIVEKIT_API_KEY et LIVEKIT_API_SECRET avant de lancer le salon.',
  );
}
