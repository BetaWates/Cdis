import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadPdf } from '../utils/supabase';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

router.post('/upload-pdf',
  requireAuth,
  requireRole('ADMIN', 'PIC'),
  upload.single('pdf'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No PDF file provided' });
        return;
      }
      const url = await uploadPdf(req.file.buffer, req.file.originalname);
      res.json({ url, fileName: req.file.originalname });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
