const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../errors');

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Authentification requise.'));
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'campus-papers-api',
      audience: 'campus-papers-client'
    });
    req.user = { id: payload.sub };
    return next();
  } catch {
    return next(new AppError(401, 'Jeton invalide ou expiré.'));
  }
}

module.exports = { requireAuth };
