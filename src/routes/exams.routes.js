const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const config = require('../config');
const { AppError } = require('../errors');
const { requireAuth } = require('../middleware/auth');
const { examSchema, uuidSchema, parseExamSearch } = require('../validation');

const router = express.Router();
const tempDir = path.join(config.storageDir, 'tmp');
const examDir = path.join(config.storageDir, 'exams');

// Les PDF sont servis par une route dédiée, jamais comme fichiers statiques.
for (const directory of [tempDir, examDir]) {
  require('node:fs').mkdirSync(directory, { recursive: true });
}

const upload = multer({
  dest: tempDir,
  limits: { fileSize: config.maxUploadBytes, files: 1, fields: 5, fieldSize: 1024 },
  fileFilter(req, file, callback) {
    if (file.mimetype !== 'application/pdf' || path.extname(file.originalname).toLowerCase() !== '.pdf') {
      return callback(new AppError(400, 'Seuls les fichiers PDF sont acceptés.'));
    }
    return callback(null, true);
  }
});

const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Trop de dépôts. Réessayez plus tard.' } }
});

const columns = {
  subject: 'subject',
  program: 'program',
  university: 'university',
  faculty: 'faculty'
};

function publicExam(row) {
  return {
    id: row.id,
    subject: row.subject,
    program: row.program,
    university: row.university,
    faculty: row.faculty,
    examYear: row.exam_year,
    originalFilename: row.original_filename,
    fileSizeBytes: row.file_size_bytes,
    uploader: row.uploader_name ? { displayName: row.uploader_name } : undefined,
    createdAt: row.created_at,
    downloadUrl: `/api/exams/${row.id}/file`
  };
}

function buildFilters(filters, initialValues = []) {
  const values = [...initialValues];
  const conditions = [];
  for (const [field, value] of Object.entries(filters)) {
    values.push(`%${value.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`e.${columns[field]} ILIKE $${values.length} ESCAPE '\\'`);
  }
  return { values, conditions };
}

async function listExams(req, res, next, uploaderId) {
  try {
    const { filters, page, limit, offset } = parseExamSearch(req.query);
    const initialValues = uploaderId ? [uploaderId] : [];
    const built = buildFilters(filters, initialValues);
    const conditions = uploaderId ? ['e.uploader_id = $1', ...built.conditions] : built.conditions;
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM exams e ${where}`,
      built.values
    );

    const listValues = [...built.values, limit, offset];
    const result = await db.query(
      `SELECT e.id, e.subject, e.program, e.university, e.faculty, e.exam_year,
              e.original_filename, e.file_size_bytes, e.created_at,
              u.display_name AS uploader_name
       FROM exams e
       JOIN users u ON u.id = e.uploader_id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${built.values.length + 1} OFFSET $${built.values.length + 2}`,
      listValues
    );

    return res.json({
      data: result.rows.map(publicExam),
      pagination: { page, limit, total: countResult.rows[0].total }
    });
  } catch (error) {
    return next(error);
  }
}

router.get('/', (req, res, next) => listExams(req, res, next));
router.get('/mine', requireAuth, (req, res, next) => listExams(req, res, next, req.user.id));

router.post('/', requireAuth, uploadRateLimit, upload.single('file'), async (req, res, next) => {
  let finalPath;
  try {
    if (!req.file) throw new AppError(400, 'Le champ de fichier « file » est obligatoire.');
    const input = examSchema.parse(req.body);

    // On vérifie le contenu réel : le type MIME du navigateur est falsifiable.
    const handle = await fs.open(req.file.path, 'r');
    const signature = Buffer.alloc(5);
    try {
      await handle.read(signature, 0, signature.length, 0);
    } finally {
      await handle.close();
    }
    if (signature.toString('ascii') !== '%PDF-') {
      throw new AppError(400, 'Le contenu du fichier ne semble pas être un PDF valide.');
    }

    const storedFilename = `${randomUUID()}.pdf`;
    finalPath = path.join(examDir, storedFilename);
    await fs.rename(req.file.path, finalPath);
    const result = await db.query(
      `INSERT INTO exams
        (subject, program, university, faculty, exam_year, original_filename,
         stored_filename, file_size_bytes, uploader_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, subject, program, university, faculty, exam_year,
                 original_filename, file_size_bytes, created_at`,
      [
        input.subject,
        input.program,
        input.university,
        input.faculty,
        input.examYear ?? null,
        path.basename(req.file.originalname).slice(0, 255),
        storedFilename,
        req.file.size,
        req.user.id
      ]
    );

    return res.status(201).json({ data: publicExam(result.rows[0]) });
  } catch (error) {
    if (finalPath) {
      await fs.unlink(finalPath).catch((cleanupError) => {
        if (cleanupError.code !== 'ENOENT') {
          console.error('Nettoyage du PDF impossible :', cleanupError.message);
        }
      });
    }
    return next(error);
  } finally {
    if (req.file) {
      await fs.unlink(req.file.path).catch((error) => {
        if (error.code !== 'ENOENT') {
          console.error('Nettoyage du fichier temporaire impossible :', error.message);
        }
      });
    }
  }
});

router.get('/:id/file', async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const result = await db.query(
      'SELECT stored_filename, original_filename FROM exams WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0) throw new AppError(404, 'Épreuve introuvable.');

    const filePath = path.join(examDir, path.basename(result.rows[0].stored_filename));
    return res.download(filePath, path.basename(result.rows[0].original_filename), (error) => {
      if (error && !res.headersSent) {
        next(error.code === 'ENOENT'
          ? new AppError(404, 'Le fichier de cette épreuve est introuvable.')
          : error);
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const result = await db.query(
      `SELECT e.id, e.subject, e.program, e.university, e.faculty, e.exam_year,
              e.original_filename, e.file_size_bytes, e.created_at,
              u.display_name AS uploader_name
       FROM exams e JOIN users u ON u.id = e.uploader_id
       WHERE e.id = $1`,
      [id]
    );
    if (result.rowCount === 0) throw new AppError(404, 'Épreuve introuvable.');
    return res.json({ data: publicExam(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const result = await db.query(
      `DELETE FROM exams
       WHERE id = $1 AND uploader_id = $2
       RETURNING stored_filename`,
      [id, req.user.id]
    );
    if (result.rowCount === 0) {
      const exists = await db.query('SELECT 1 FROM exams WHERE id = $1', [id]);
      throw new AppError(
        exists.rowCount ? 403 : 404,
        exists.rowCount
          ? 'Vous ne pouvez supprimer que vos propres épreuves.'
          : 'Épreuve introuvable.'
      );
    }

    const filePath = path.join(examDir, path.basename(result.rows[0].stored_filename));
    await fs.unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') {
        console.error('Suppression du fichier PDF impossible :', error.message);
      }
    });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
