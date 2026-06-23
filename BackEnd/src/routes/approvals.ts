import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';

const router = Router();

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

// GET /api/approvals - Get pending approvals
router.get('/', async (req: Request, res: Response) => {
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

// POST /api/approvals/:id/advance - Advance approval to the next stage
router.post('/:id/advance', async (req: Request, res: Response) => {
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

    const status = !nextStage ? 'APPROVED_EXCEPTION' : sub.status;
    const timeStr = 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newLog = {
      id: `al-${Date.now()}`,
      time: timeStr,
      action: `Approved by ${currentStage}`,
      user: reviewerName,
      details: reviewNotes || `${currentStage} stage approved.`,
      type: 'approve'
    };
    activityLog.push(newLog);

    await pool.query(
      'UPDATE daily_check_submissions SET progress = ?, status = ?, reviewNotes = ?, activityLog = ? WHERE id = ?',
      [JSON.stringify(newProgress), status, reviewNotes || '', JSON.stringify(activityLog), id]
    );

    res.json({ message: 'Submission advanced successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals/:id/reject - Reject and return a checksheet
router.post('/:id/reject', async (req: Request, res: Response) => {
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
    const timeStr = 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newLog = {
      id: `al-${Date.now()}`,
      time: timeStr,
      action: 'Rejected & Returned',
      user: reviewerName,
      details: reviewNotes,
      type: 'reject'
    };
    activityLog.push(newLog);

    await pool.query(
      'UPDATE daily_check_submissions SET status = ?, progress = ?, reviewNotes = ?, activityLog = ? WHERE id = ?',
      ['REJECTED', JSON.stringify(newProgress), reviewNotes, JSON.stringify(activityLog), id]
    );

    res.json({ message: 'Submission rejected successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals/:id/request-reject - Request rejection on own submission
router.post('/:id/request-reject', async (req: Request, res: Response) => {
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

    const timeStr = 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newLog = {
      id: `al-${Date.now()}`,
      time: timeStr,
      action: 'Reject Requested',
      user: requesterName,
      details: remark,
      type: 'reject'
    };
    activityLog.push(newLog);

    await pool.query(
      'UPDATE daily_check_submissions SET status = ?, rejectRequestRemark = ?, reviewerName = ?, reviewNotes = ?, activityLog = ? WHERE id = ?',
      ['REQUEST_REJECT', remark, requesterName, `[REQUEST REJECT] ${remark}`, JSON.stringify(activityLog), id]
    );

    res.json({ message: 'Reject request submitted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals/:id/exception - Approve waiver deviation exception
router.post('/:id/exception', async (req: Request, res: Response) => {
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
    const timeStr = 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newLog = {
      id: `al-${Date.now()}`,
      time: timeStr,
      action: 'Deviation Approved',
      user: reviewerName,
      details: reviewNotes || 'Approved as minor exception.',
      type: 'approve'
    };
    activityLog.push(newLog);

    await pool.query(
      'UPDATE daily_check_submissions SET status = ?, progress = ?, reviewNotes = ?, activityLog = ? WHERE id = ?',
      ['APPROVED_EXCEPTION', JSON.stringify(newProgress), reviewNotes || 'Approved as minor exception.', JSON.stringify(activityLog), id]
    );

    res.json({ message: 'Exception approved successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
