import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/daily-checks - Get all submissions
router.get('/', (req: Request, res: Response) => {
  res.status(501).json({ message: 'GET /api/daily-checks not implemented yet' });
});

// POST /api/daily-checks - Submit a new daily check checksheet
router.post('/', (req: Request, res: Response) => {
  res.status(501).json({ message: 'POST /api/daily-checks not implemented yet' });
});

export default router;
