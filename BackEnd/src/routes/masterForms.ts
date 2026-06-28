import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { pool } from '../db/connection';
import { INITIAL_MASTER_FORMS } from '../db/seedData';
import { requireAuth, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM master_forms ORDER BY id DESC');
    const parsed = (rows as any[]).map(row => ({
      ...row,
      specifications: JSON.parse(row.specifications || '[]')
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM master_forms WHERE id = ?', [id]);
    if ((rows as any[]).length === 0) {
      res.status(404).json({ error: 'Master Form not found' });
      return;
    }
    const row = (rows as any[])[0];
    res.json({
      ...row,
      specifications: JSON.parse(row.specifications || '[]')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/',
  requireAuth,
  requireRole('ADMIN', 'PIC'),
  body('modelName').trim().notEmpty().withMessage('Model name required').isLength({ max: 255 }),
  body('partNumber').trim().notEmpty().withMessage('Part number required').isLength({ max: 255 }),
  body('specifications').isArray({ min: 1 }).withMessage('At least 1 specification required'),
  body('specifications.*.parameterName').trim().notEmpty(),
  body('specifications.*.standardValue').trim().notEmpty(),
  body('specifications.*.tolerance').trim().notEmpty(),
  body('specifications.*.unit').trim().notEmpty(),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id, modelName, partNumber, uploadDate, status, imageUrl, pdfDataUrl, pdfFileName, pdfData, pdfStorageUrl, pdf_storage_url, pdf_storage_path, specifications } = req.body;
      const storageUrl = pdfStorageUrl || pdf_storage_url || null;
      await pool.query(
        'INSERT INTO master_forms (id, modelName, partNumber, uploadDate, status, imageUrl, pdfDataUrl, pdfFileName, pdfData, pdf_storage_url, pdf_storage_path, specifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          modelName,
          partNumber,
          uploadDate,
          status,
          imageUrl || '',
          pdfDataUrl || storageUrl,
          pdfFileName || null,
          pdfData || null,
          storageUrl,
          pdf_storage_path || null,
          JSON.stringify(specifications || [])
        ]
      );
      res.status(201).json({ message: 'Master Form created successfully', id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post('/reset', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM master_forms');
    for (const form of INITIAL_MASTER_FORMS) {
      await pool.query(
        'INSERT INTO master_forms (id, modelName, partNumber, uploadDate, status, imageUrl, pdfDataUrl, pdfFileName, pdfData, pdf_storage_url, pdf_storage_path, specifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          form.id,
          form.modelName,
          form.partNumber,
          form.uploadDate,
          form.status,
          form.imageUrl,
          (form as any).pdfDataUrl || null,
          (form as any).pdfFileName || null,
          (form as any).pdfData || null,
          (form as any).pdf_storage_url || null,
          (form as any).pdf_storage_path || null,
          JSON.stringify(form.specifications)
        ]
      );
    }
    res.json({ message: 'Master Forms reset to defaults successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
