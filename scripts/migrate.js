// Petit exécuteur de migrations pour apprendre le SQL sans ajouter d'outil ORM.
require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL est manquant. Configurez le fichier .env.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFiles = (await fs.readdir(path.join(__dirname, '..', 'migrations')))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const filename of migrationFiles) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename]
      );
      if (alreadyApplied.rowCount > 0) {
        console.log(`Déjà appliquée : ${filename}`);
        continue;
      }

      const sql = await fs.readFile(
        path.join(__dirname, '..', 'migrations', filename),
        'utf8'
      );
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      console.log(`Migration appliquée : ${filename}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Échec des migrations :', error.message);
  process.exitCode = 1;
});
