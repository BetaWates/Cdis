import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { INITIAL_SUBMISSIONS } from '../db/seedData';

const router = Router();

// GET /api/daily-checks - Get all submissions
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM daily_check_submissions ORDER BY submittedAt DESC');
    const parsed = (rows as any[]).map(row => ({
      ...row,
      progress: JSON.parse(row.progress || '{}'),
      measurements: JSON.parse(row.measurements || '[]'),
      activityLog: JSON.parse(row.activityLog || '[]')
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/daily-checks - Submit a new daily check checksheet
router.post('/', async (req: Request, res: Response) => {
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
});

// POST /api/daily-checks/reset - Reset submissions to defaults
router.post('/reset', async (req: Request, res: Response) => {
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
