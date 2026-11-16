const { Pool } = require('pg');
const config = require('./config');

// Un pool réutilise les connexions au lieu d'en ouvrir une par requête HTTP.
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

pool.on('error', (error) => {
  console.error('Erreur inattendue sur une connexion PostgreSQL inactive :', error.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  close: () => pool.end()
};
