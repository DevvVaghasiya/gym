import * as mysql from 'mysql2/promise';
import { databaseOptions } from './dbConfig';

async function alterDatabase() {
  try {
    const connection = await mysql.createConnection(databaseOptions);

    console.log('Connected to MySQL server.');

    // Add email and password columns
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN email VARCHAR(255) UNIQUE AFTER id,
      ADD COLUMN password VARCHAR(255) AFTER email
    `).catch(e => console.log('Columns might already exist:', e.message));

    // Make existing columns nullable (except id, email, password, and created_at)
    // Actually, in MySQL they might already be nullable if we didn't specify NOT NULL, 
    // but name was NOT NULL.
    await connection.query(`
      ALTER TABLE users MODIFY COLUMN name VARCHAR(100) NULL
    `).catch(e => console.log('Error modifying name:', e.message));

    console.log('Database alter complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error altering database:', error);
    process.exit(1);
  }
}

alterDatabase();
