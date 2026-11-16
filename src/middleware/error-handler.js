const multer = require('multer');
const { ZodError } = require('zod');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Données invalides.',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }
    });
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Le fichier dépasse la taille maximale autorisée.'
      : 'Le fichier envoyé ne respecte pas les limites autorisées.';
    return res.status(400).json({ error: { message } });
  }

  if (error.status) {
    return res.status(error.status).json({ error: { message: error.message } });
  }

  console.error('Erreur inattendue :', error);
  return res.status(500).json({ error: { message: 'Une erreur interne est survenue.' } });
}

module.exports = errorHandler;
