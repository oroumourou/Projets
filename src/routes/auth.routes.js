const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const config = require('../config');
const { AppError } = require('../errors');
const { requireAuth } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validation');

const router = express.Router();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' } }
});

function issueToken(userId) {
  return jwt.sign({}, config.JWT_SECRET, {
    subject: userId,
    expiresIn: config.JWT_EXPIRES_IN,
    issuer: 'campus-papers-api',
    audience: 'campus-papers-client'
  });
}

router.post('/register', authRateLimit, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const result = await db.query(
      `INSERT INTO users (display_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, display_name, email`,
      [input.displayName, input.email.toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    return res.status(201).json({
      user: { id: user.id, displayName: user.display_name, email: user.email },
      token: issueToken(user.id)
    });
  } catch (error) {
    if (error.code === '23505') {
      return next(new AppError(409, 'Cette adresse e-mail est déjà utilisée.'));
    }
    return next(error);
  }
});

router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await db.query(
      'SELECT id, display_name, email, password_hash FROM users WHERE email = $1',
      [input.email.toLowerCase()]
    );
    const user = result.rows[0];
    const passwordMatches = user
      ? await bcrypt.compare(input.password, user.password_hash)
      : false;

    // Le même message évite de révéler si une adresse est inscrite.
    if (!passwordMatches) {
      return next(new AppError(401, 'Adresse e-mail ou mot de passe incorrect.'));
    }

    return res.json({
      user: { id: user.id, displayName: user.display_name, email: user.email },
      token: issueToken(user.id)
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, display_name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rowCount === 0) {
      return next(new AppError(401, 'Ce compte n’existe plus.'));
    }
    const user = result.rows[0];
    return res.json({
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
