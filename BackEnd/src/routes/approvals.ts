import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { pool } from '../db/connection';
import { requireAuth, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();
const APPROVER_ROLES = ['ADMIN', 'PIC', 'LEADER', 'SPV', 'MANAGER'] as const;

function getCurrentStage(progress: any) {
  if (progress.pic === 'CURRENT') return 'PIC';
  if (progress.leader === 'CURRENT') return 'LEADER';
  if (progress.spv === 'CURRENT') return 'SPV';
  if (progress.manager === 'CURRENT') return 'MANAGER';
  return null;
}

function getNextStage(current: string) {
  if (current === 'PIC') return 'LEADER';
  if (current === 'LEADER') return 'SPV';
  if (current === 'SPV') return 'MANAGER';
  return null;
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM daily_check_submissions WHERE status = 'PENDING' OR status = 'REQUEST_REJECT' ORDER BY submittedAt DESC"
    );
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

router.post('/:id/advance',
  requireAuth,
  requireRole(...APPROVER_ROLES),
  body('reviewerName').trim().notEmpty().isLength({ max: 255 }),
  body('reviewNotes').optional().isLength({ max: 2000 }),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewerName, reviewNotes } = req.body;

      const [rows] = await pool.query('SELECT * FROM daily_check_submissions WHERE id = ?', [id]);
      if ((rows as any[]).length === 0) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      const sub = (rows as any[])[0];
      const progress = JSON.parse(sub.progress || '{}');
      const activityLog = JSON.parse(sub.activityLog || '[]');

      const currentStage = getCurrentStage(progress);
      if (!currentStage) {
        res.status(400).json({ error: 'No active approval stage' });
        return;
      }

      const nextStage = getNextStage(currentStage);
      const newProgress = { ...progress };
      newProgress[currentStage.toLowerCase()] = 'APPROVED';
      if (nextStage) {
        newProgress[nextStage.toLowerCase()] = 'CURRENT';
      }

      const status = !nextStage ? 'APPROVED' : sub.status;
      activityLog.push({
        id: `al-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: `Approved by ${currentStage}`,
        user: reviewerName,
        details: reviewNotes || `${currentStage} stage approved.`,
        type: 'approve'
      });

      await pool.query(
        'UPDATE daily_check_submissions SET progress = ?, status = ?, reviewNotes = ?, activityLog = ? WHERE id = ?',
        [JSON.stringify(newProgress), status, reviewNotes || '', JSON.stringify(activityLog), id]
      );

      res.json({ message: 'Submission advanced successfully', id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post('/:id/reject',
  requireAuth,
  requireRole(...APPROVER_ROLES),
  body('reviewerName').trim().notEmpty().isLength({ max: 255 }),
  body('reviewNotes').optional().isLength({ max: 2000 }),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewerName, reviewNotes } = req.body;

      const [rows] = await pool.query('SELECT * FROM daily_check_submissions WHERE id = ?', [id]);
      if ((rows as any[]).length === 0) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      const sub = (rows as any[])[0];
      const activityLog = JSON.parse(sub.activityLog || '[]');
      const newProgress = { pic: 'PENDING', leader: 'PENDING', spv: 'PENDING', manager: 'PENDING' };

      activityLog.push({
        id: `al-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'Rejected & Returned',
        user: reviewerName,
        details: reviewNotes,
        type: 'reject'
      });

      await pool.query(
        'UPDATE daily_check_submissions SET status = ?, progress = ?, reviewNotes = ?, activityLog = ? WHERE id = ?',
        ['REJECTED', JSON.stringify(newProgress), reviewNotes, JSON.stringify(activityLog), id]
      );

      res.json({ message: 'Submission rejected successfully', id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post('/:id/request-reject',
  requireAuth,
  body('requesterName').trim().notEmpty().withMessage('Requester name is required').isLength({ max: 255 }),
  body('remark').trim().notEmpty().withMessage('Remark is required').isLength({ max: 2000 }),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { requesterName, remark } = req.body;

    const [rows] = await pool.query('SELECT * FROM daily_check_submissions WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const sub = (rows as any[])[0];
    const activityLog = JSON.parse(sub.activityLog || '[]');

    activityLog.push({
      id: `al-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'Reject Requested',
      user: requesterName,
      details: remark,
      type: 'reject'
    });

    await pool.query(
      'UPDATE daily_check_submissions SET status = ?, rejectRequestRemark = ?, reviewerName = ?, reviewNotes = ?, activityLog = ? WHERE id = ?',
      ['REQUEST_REJECT', remark, requesterName, `[REQUEST REJECT] ${remark}`, JSON.stringify(activityLog), id]
    );

    res.json({ message: 'Reject request submitted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/exception',
  requireAuth,
  requireRole(...APPROVER_ROLES),
  body('reviewerName').trim().notEmpty().isLength({ max: 255 }),
  body('reviewNotes').optional().isLength({ max: 2000 }),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reviewerName, reviewNotes } = req.body;

      const [rows] = await pool.query('SELECT * FROM daily_check_submissions WHERE id = ?', [id]);
      if ((rows as any[]).length === 0) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      const sub = (rows as any[])[0];
      const activityLog = JSON.parse(sub.activityLog || '[]');
      const newProgress = { pic: 'APPROVED', leader: 'APPROVED', spv: 'APPROVED', manager: 'APPROVED' };

      activityLog.push({
        id: `al-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'Deviation Approved',
        user: reviewerName,
        details: reviewNotes || 'Approved as minor exception.',
        type: 'approve'
      });

      await pool.query(
        'UPDATE daily_check_submissions SET status = ?, progress = ?, reviewNotes = ?, activityLog = ? WHERE id = ?',
        ['APPROVED_EXCEPTION', JSON.stringify(newProgress), reviewNotes || 'Approved as minor exception.', JSON.stringify(activityLog), id]
      );

      res.json({ message: 'Exception approved successfully', id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
