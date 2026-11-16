const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

// Ces tests vérifient le routage HTTP sans avoir besoin d'une base PostgreSQL.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
process.env.CORS_ORIGINS = 'http://127.0.0.1:5173';

const app = require('../src/app');

test('les routes backend démarrent et appliquent les réponses attendues', async () => {
  const server = app.listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const unauthorized = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Origin: 'http://127.0.0.1:5173' }
    });
    assert.equal(unauthorized.status, 401);
    assert.equal(
      unauthorized.headers.get('access-control-allow-origin'),
      'http://127.0.0.1:5173'
    );

    const privateExams = await fetch(`${baseUrl}/api/exams/mine`, {
      headers: { Origin: 'http://127.0.0.1:5173' }
    });
    assert.equal(privateExams.status, 401);

    const invalidLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'http://127.0.0.1:5173',
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    assert.equal(invalidLogin.status, 400);

    const blockedOrigin = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Origin: 'https://not-allowed.example' }
    });
    assert.equal(blockedOrigin.status, 403);
  } finally {
    server.close();
    await once(server, 'close');
    await require('../src/db').close();
  }
});
