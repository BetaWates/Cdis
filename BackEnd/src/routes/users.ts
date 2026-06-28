import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection';
import { requireAuth, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();

router.get('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/',
  requireAuth,
  requireRole('ADMIN'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('role').isIn(['ADMIN', 'INSPECTOR', 'PIC', 'LEADER', 'SPV', 'MANAGER']).withMessage('Invalid role'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { name, email, password, role } = req.body;

    const validRoles = ['ADMIN', 'INSPECTOR', 'PIC', 'LEADER', 'SPV', 'MANAGER'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const id = `u-${Date.now()}`;
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, hash, role]
    );

    res.status(201).json({ message: 'User created successfully', id });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/toggle', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      res.status(400).json({ error: 'Cannot deactivate your own account' });
      return;
    }
    await pool.query('UPDATE users SET is_active = NOT is_active WHERE id = ?', [id]);
    res.json({ message: 'User status toggled' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
