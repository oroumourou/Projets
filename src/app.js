const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const db = require('./db');
const { AppError } = require('./errors');
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exams.routes');
const errorHandler = require('./middleware/error-handler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Les outils serveur-à-serveur n'envoient généralement pas d'en-tête Origin.
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError(403, 'Origine non autorisée par la configuration CORS.'));
  }
}));
app.use(express.json({ limit: '20kb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/health', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    return res.json({ status: 'ok' });
  } catch (error) {
    return next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route introuvable.' } });
});
app.use(errorHandler);

module.exports = app;
