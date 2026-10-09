
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import type { ConnectionOptions } from 'mysql2/promise';

export const databaseOptions: ConnectionOptions = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 13545),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'gym_ai',
  ssl: {
    ca: fs.readFileSync(path.resolve(process.cwd(), 'ca.pem'), 'utf8'),
    rejectUnauthorized: true,
  },
};
