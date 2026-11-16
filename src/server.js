const config = require('./config');
const app = require('./app');
const db = require('./db');

const server = app.listen(config.PORT, () => {
  console.log(`API démarrée sur http://localhost:${config.PORT}`);
});

// Fermer proprement le serveur et le pool PostgreSQL lors de l'arrêt.
async function shutdown(signal) {
  console.log(`${signal} reçu, arrêt en cours...`);
  server.close(async (error) => {
    if (error) {
      console.error('Erreur pendant la fermeture HTTP :', error);
      process.exitCode = 1;
    }
    await db.close();
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
