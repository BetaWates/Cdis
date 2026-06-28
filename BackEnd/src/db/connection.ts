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
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

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

async function ensureColumn(conn: mysql.PoolConnection, tableName: string, columnName: string, definition: string) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [dbName, tableName, columnName]
  );
  if ((rows as any[])[0].count === 0) {
    await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export async function initializeDatabase() {
  let initialConn: mysql.Connection | null = null;
  let conn: mysql.PoolConnection | null = null;
  try {
    initialConn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
    });

    const escapedDbName = dbName.replace(/`/g, '``');
    await initialConn.query(`CREATE DATABASE IF NOT EXISTS \`${escapedDbName}\``);
    console.log(`Database "${dbName}" verified/created successfully.`);
    await initialConn.end();

    conn = await pool.getConnection();

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
        pdf_storage_url VARCHAR(500) NULL,
        pdf_storage_path VARCHAR(500) NULL,
        specifications LONGTEXT
      )
    `);

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

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('ADMIN','INSPECTOR','PIC','LEADER','SPV','MANAGER') NOT NULL DEFAULT 'INSPECTOR',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
      )
    `);

    await ensureColumn(conn, 'master_forms', 'pdf_storage_url', 'VARCHAR(500) NULL');
    await ensureColumn(conn, 'master_forms', 'pdf_storage_path', 'VARCHAR(500) NULL');

    console.log('Database tables verified/created successfully.');

    const [users] = await conn.query('SELECT COUNT(*) as count FROM users');
    if ((users as any[])[0].count === 0) {
      const bcrypt = await import('bcryptjs');
      const adminHash = await bcrypt.hash('AiinaAdmin2026!', 10);
      const inspectorHash = await bcrypt.hash('Inspector2026!', 10);
      await conn.query(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)',
        [
          'u-admin-1', 'System Admin', 'admin@aiina.co.id', adminHash, 'ADMIN',
          'u-inspector-1', 'J. Smith', 'inspector@aiina.co.id', inspectorHash, 'INSPECTOR',
        ]
      );
      console.log('Default users seeded: admin@aiina.co.id / AiinaAdmin2026!');
    }

    const [forms] = await conn.query('SELECT COUNT(*) as count FROM master_forms');
    if ((forms as any[])[0].count === 0) {
      console.log('Seeding default Master Forms...');
      for (const form of INITIAL_MASTER_FORMS) {
        await conn.query(
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
    }

    const [subs] = await conn.query('SELECT COUNT(*) as count FROM daily_check_submissions');
    if ((subs as any[])[0].count === 0) {
      console.log('Seeding default Daily Check Submissions...');
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

    console.log('Database initial seeding complete.');
  } catch (err) {
    console.error('Database auto-initialization failed:', err);
  } finally {
    if (conn) conn.release();
    if (initialConn) {
      try { await initialConn.end(); } catch {}
    }
  }
}
