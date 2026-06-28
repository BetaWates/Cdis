import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import masterFormsRouter from './routes/masterForms';
import dailyChecksRouter from './routes/dailyChecks';
import approvalsRouter from './routes/approvals';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import filesRouter from './routes/files';
import { testConnection, initializeDatabase } from './db/connection';

dotenv.config();

// Startup validation for critical security configuration
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-change-in-prod') {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is missing or insecure in production.');
    process.exit(1);
  } else {
    console.warn('WARNING: JWT_SECRET is not set or using dev fallback. Please set a secure key in .env.');
  }
}

// Auto-initialize MySQL schema on launch
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 4000;

// Enable Helmet for secure HTTP headers
app.use(helmet());

// Secure CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null,
  'https://cdis-delta.vercel.app',
].filter(Boolean) as string[];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Strict rate limiters for authentication endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/change-password', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Try again in 1 minute.' },
});

app.use('/api/', apiLimiter);

// Support JSON requests with large payloads for legacy Base64 payloads.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/files', filesRouter);
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
