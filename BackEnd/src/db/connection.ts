import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { INITIAL_MASTER_FORMS, INITIAL_SUBMISSIONS } from './seedData';

dotenv.config();

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT || '3306');
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'aiina_qc_inspection';

export const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper to test connectivity
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database.');
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL Database connection failed:', error);
    return false;
  }
}

// Auto initializer for DB and Tables
export async function initializeDatabase() {
  let initialConn: any = null;
  try {
    // 1. Create database if not exists using connection without database key
    initialConn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });

    await initialConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database "${dbName}" verified/created successfully.`);
    await initialConn.end();

    // 2. Setup tables using connection from pool
    const conn = await pool.getConnection();

    // Master Forms table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS master_forms (
        id VARCHAR(50) PRIMARY KEY,
        modelName VARCHAR(255) NOT NULL,
        partNumber VARCHAR(255) NOT NULL,
        uploadDate VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        imageUrl VARCHAR(1000) NOT NULL,
        pdfDataUrl LONGTEXT,
        pdfFileName VARCHAR(255),
        pdfData LONGTEXT,
        specifications LONGTEXT
      )
    `);

    // Daily Check Submissions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS daily_check_submissions (
        id VARCHAR(50) PRIMARY KEY,
        modelId VARCHAR(50) NOT NULL,
        modelName VARCHAR(255) NOT NULL,
        partNumber VARCHAR(255) NOT NULL,
        sampleId VARCHAR(255) NOT NULL,
        submitterName VARCHAR(255) NOT NULL,
        submitterDept VARCHAR(255) NOT NULL,
        submittedDate VARCHAR(255) NOT NULL,
        submittedAt VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        progress TEXT NOT NULL,
        measurements LONGTEXT NOT NULL,
        reviewNotes TEXT,
        rejectRequestRemark TEXT,
        reviewerName VARCHAR(255),
        activityLog LONGTEXT NOT NULL
      )
    `);

    console.log("Database tables verified/created successfully.");

    // 3. Seed Master Forms if empty
    const [forms] = await conn.query('SELECT COUNT(*) as count FROM master_forms');
    if ((forms as any)[0].count === 0) {
      console.log("Seeding default Master Forms...");
      for (const form of INITIAL_MASTER_FORMS) {
        await conn.query(
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
    }

    // 4. Seed Submissions if empty
    const [subs] = await conn.query('SELECT COUNT(*) as count FROM daily_check_submissions');
    if ((subs as any)[0].count === 0) {
      console.log("Seeding default Daily Check Submissions...");
      for (const sub of INITIAL_SUBMISSIONS) {
        await conn.query(
          'INSERT INTO daily_check_submissions (id, modelId, modelName, partNumber, sampleId, submitterName, submitterDept, submittedDate, submittedAt, status, priority, progress, measurements, reviewNotes, rejectRequestRemark, reviewerName, activityLog) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            sub.id,
            sub.modelId,
            sub.modelName,
            sub.partNumber,
            sub.sampleId,
            sub.submitterName,
            sub.submitterDept,
            sub.submittedDate,
            sub.submittedAt,
            sub.status,
            sub.priority,
            JSON.stringify(sub.progress),
            JSON.stringify(sub.measurements),
            (sub as any).reviewNotes || null,
            (sub as any).rejectRequestRemark || null,
            (sub as any).reviewerName || null,
            JSON.stringify(sub.activityLog)
          ]
        );
      }
    }

    conn.release();
    console.log("Database initial seeding complete.");
  } catch (err) {
    console.error("Database auto-initialization failed:", err);
    if (initialConn) {
      try { await initialConn.end(); } catch {}
    }
  }
}
