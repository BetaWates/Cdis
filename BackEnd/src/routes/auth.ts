import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

router.post('/login',
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        res.status(500).json({ error: 'Authentication secret is not configured' });
        return;
      }

      const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);
      const user = (rows as any[])[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

      const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
      const token = jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES as jwt.SignOptions['expiresIn'] });

      res.json({ token, user: payload });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

router.post('/change-password',
  requireAuth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
      const user = (rows as any[])[0];

      if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user!.id]);

      res.json({ message: 'Password changed successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
