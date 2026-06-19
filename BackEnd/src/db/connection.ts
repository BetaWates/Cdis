// Note: Run "npm install" inside BackEnd/ directory to resolve "mysql2/promise" module resolution.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aiina_qc_inspection',
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
