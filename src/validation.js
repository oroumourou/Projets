const { z } = require('zod');

const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  // bcrypt ne prend en compte que les 72 premiers octets d'un mot de passe.
  password: z.string().min(12).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Le mot de passe ne doit pas dépasser 72 octets.'
  })
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Le mot de passe ne doit pas dépasser 72 octets.'
  })
});

const examSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  program: z.string().trim().min(1).max(120),
  university: z.string().trim().min(1).max(160),
  faculty: z.string().trim().min(1).max(160),
  examYear: z.preprocess(
    (value) => value === '' || value === undefined ? undefined : Number(value),
    z.number().int().min(1900).max(2100).optional()
  )
});

const uuidSchema = z.string().uuid();

function parseExamSearch(query) {
  const filters = {};
  for (const field of ['subject', 'program', 'university', 'faculty']) {
    if (query[field] !== undefined) {
      const value = z.string().trim().min(1).max(160).parse(query[field]);
      filters[field] = value;
    }
  }

  const page = z.coerce.number().int().min(1).max(1_000_000).default(1).parse(query.page);
  const limit = z.coerce.number().int().min(1).max(50).default(20).parse(query.limit);
  return { filters, page, limit, offset: (page - 1) * limit };
}

module.exports = { registerSchema, loginSchema, examSchema, uuidSchema, parseExamSearch };
