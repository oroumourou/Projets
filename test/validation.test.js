const test = require('node:test');
const assert = require('node:assert/strict');
const { examSchema, parseExamSearch, registerSchema } = require('../src/validation');

test('les métadonnées requises d’une épreuve sont validées et nettoyées', () => {
  const result = examSchema.parse({
    subject: '  Mathématiques ',
    program: ' Informatique ',
    university: 'Université Exemple',
    faculty: 'Faculté des sciences',
    examYear: '2025'
  });

  assert.equal(result.subject, 'Mathématiques');
  assert.equal(result.program, 'Informatique');
  assert.equal(result.examYear, 2025);
});

test('la recherche applique une pagination bornée et rejette une limite excessive', () => {
  assert.deepEqual(parseExamSearch({ page: '2', limit: '10' }), {
    filters: {},
    page: 2,
    limit: 10,
    offset: 10
  });
  assert.throws(() => parseExamSearch({ limit: '500' }));
});

test('un mot de passe trop court ne passe pas la validation d’inscription', () => {
  assert.throws(() => registerSchema.parse({
    displayName: 'Awa',
    email: 'awa@example.com',
    password: 'court'
  }));
});

test('un mot de passe qui dépasse la limite de bcrypt en octets est rejeté', () => {
  assert.throws(() => registerSchema.parse({
    displayName: 'Awa',
    email: 'awa@example.com',
    password: 'é'.repeat(37)
  }));
});
