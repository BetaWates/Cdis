import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/approvals - Get pending approvals
router.get('/', (req: Request, res: Response) => {
  res.status(501).json({ message: 'GET /api/approvals not implemented yet' });
});

// POST /api/approvals/:id/advance - Advance approval to the next stage
router.post('/:id/advance', (req: Request, res: Response) => {
  const { id } = req.params;
  res.status(501).json({ message: `POST /api/approvals/${id}/advance not implemented yet` });
});

// POST /api/approvals/:id/reject - Reject and return a checksheet
router.post('/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  res.status(501).json({ message: `POST /api/approvals/${id}/reject not implemented yet` });
});

// POST /api/approvals/:id/exception - Approve waiver deviation exception
router.post('/:id/exception', (req: Request, res: Response) => {
  const { id } = req.params;
  res.status(501).json({ message: `POST /api/approvals/${id}/exception not implemented yet` });
});

export default router;
