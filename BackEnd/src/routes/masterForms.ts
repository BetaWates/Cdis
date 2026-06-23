import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { INITIAL_MASTER_FORMS } from '../db/seedData';

const router = Router();

// GET /api/master-forms - Get all master forms
router.get('/', async (req: Request, res: Response) => {
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

// GET /api/master-forms/:id - Get a specific master form by ID
router.get('/:id', async (req: Request, res: Response) => {
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

// POST /api/master-forms - Create a new master form (upload)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, modelName, partNumber, uploadDate, status, imageUrl, pdfDataUrl, pdfFileName, pdfData, specifications } = req.body;
    await pool.query(
      'INSERT INTO master_forms (id, modelName, partNumber, uploadDate, status, imageUrl, pdfDataUrl, pdfFileName, pdfData, specifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        modelName,
        partNumber,
        uploadDate,
        status,
        imageUrl || '',
        pdfDataUrl || null,
        pdfFileName || null,
        pdfData || null,
        JSON.stringify(specifications || [])
      ]
    );
    res.status(201).json({ message: 'Master Form created successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/master-forms/reset - Reset master forms to defaults
router.post('/reset', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM master_forms');
    for (const form of INITIAL_MASTER_FORMS) {
      await pool.query(
        'INSERT INTO master_forms (id, modelName, partNumber, uploadDate, status, imageUrl, pdfDataUrl, pdfFileName, pdfData, specifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
