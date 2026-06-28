import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { pool } from '../db/connection';
import { INITIAL_SUBMISSIONS } from '../db/seedData';
import { requireAuth, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      whereClause += ' AND (modelName LIKE ? OR partNumber LIKE ? OR sampleId LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM daily_check_submissions ${whereClause}`,
      params
    );
    const total = (countResult as any[])[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM daily_check_submissions ${whereClause} ORDER BY submittedAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const parsed = (rows as any[]).map(row => ({
      ...row,
      progress: JSON.parse(row.progress || '{}'),
      measurements: JSON.parse(row.measurements || '[]'),
      activityLog: JSON.parse(row.activityLog || '[]'),
    }));

    res.json({
      data: parsed,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/',
  requireAuth,
  requireRole('INSPECTOR', 'PIC'),
  body('modelId').trim().notEmpty(),
  body('modelName').trim().notEmpty().isLength({ max: 255 }),
  body('partNumber').trim().notEmpty().isLength({ max: 255 }),
  body('sampleId').trim().notEmpty().isLength({ max: 255 }),
  body('submitterName').trim().notEmpty().isLength({ max: 255 }),
  body('submitterDept').trim().notEmpty().isLength({ max: 255 }),
  body('measurements').isArray({ min: 1 }),
  body('status').isIn(['PENDING', 'APPROVED', 'APPROVED_EXCEPTION', 'REJECTED', 'REQUEST_REJECT']),
  body('priority').isIn(['HIGH', 'NORMAL']),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id, modelId, modelName, partNumber, sampleId, submitterName, submitterDept, submittedDate, submittedAt, status, priority, progress, measurements, reviewNotes, rejectRequestRemark, reviewerName, activityLog } = req.body;
      await pool.query(
        'INSERT INTO daily_check_submissions (id, modelId, modelName, partNumber, sampleId, submitterName, submitterDept, submittedDate, submittedAt, status, priority, progress, measurements, reviewNotes, rejectRequestRemark, reviewerName, activityLog) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          modelId,
          modelName,
          partNumber,
          sampleId,
          submitterName,
          submitterDept,
          submittedDate,
          submittedAt || new Date().toISOString(),
          status,
          priority,
          JSON.stringify(progress || {}),
          JSON.stringify(measurements || []),
          reviewNotes || null,
          rejectRequestRemark || null,
          reviewerName || null,
          JSON.stringify(activityLog || [])
        ]
      );
      res.status(201).json({ message: 'Submission created successfully', id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post('/reset', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM daily_check_submissions');
    for (const sub of INITIAL_SUBMISSIONS) {
      await pool.query(
        'INSERT INTO daily_check_submissions (id, modelId, modelName, partNumber, sampleId, submitterName, submitterDept, submittedDate, submittedAt, status, priority, progress, measurements, reviewNotes, rejectRequestRemark, reviewerName, activityLog) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          sub.id,
          sub.modelId,
          sub.modelName,
          sub.partNumber,
          sub.sampleId,
          sub.submitterName,
          sub.submitterDept,
          sub.submittedDate,
          sub.submittedAt,
          sub.status,
          sub.priority,
          JSON.stringify(sub.progress),
          JSON.stringify(sub.measurements),
          (sub as any).reviewNotes || null,
          (sub as any).rejectRequestRemark || null,
          (sub as any).reviewerName || null,
          JSON.stringify(sub.activityLog)
        ]
      );
    }
    res.json({ message: 'Submissions reset to defaults successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
