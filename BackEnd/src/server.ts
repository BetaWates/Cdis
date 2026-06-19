// Note: Run "npm install" inside BackEnd/ directory to resolve "cors" (and other express/middleware) module resolution.
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import masterFormsRouter from './routes/masterForms';
import dailyChecksRouter from './routes/dailyChecks';
import approvalsRouter from './routes/approvals';
import { testConnection } from './db/connection';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS
app.use(cors());

// Support JSON requests with large payloads (to support Base64 images/signatures)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mount routes
app.use('/api/master-forms', masterFormsRouter);
app.use('/api/daily-checks', dailyChecksRouter);
app.use('/api/approvals', approvalsRouter);

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  const dbConnected = await testConnection();
  res.status(200).json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`AIINA backend server running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});
