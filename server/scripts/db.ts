import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';

const dataDir = './data/pg';
const isFirstRun = !fs.existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'saas',
  password: 'saas',
  port: 5432,
  persistent: true,
});

if (isFirstRun) await pg.initialise();
await pg.start();

try {
  await pg.createDatabase('saas');
} catch {
  // o banco já existe
}

console.log('PostgreSQL rodando em postgres://saas:saas@localhost:5432/saas');

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);