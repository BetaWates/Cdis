import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/master-forms - Get all master forms
router.get('/', (req: Request, res: Response) => {
  res.status(501).json({ message: 'GET /api/master-forms not implemented yet' });
});

// GET /api/master-forms/:id - Get a specific master form by ID
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.status(501).json({ message: `GET /api/master-forms/${id} not implemented yet` });
});

// POST /api/master-forms - Create a new master form (upload)
router.post('/', (req: Request, res: Response) => {
  res.status(501).json({ message: 'POST /api/master-forms not implemented yet' });
});

export default router;
