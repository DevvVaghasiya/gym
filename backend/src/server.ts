import express, { Request, Response } from 'express';
import cors from 'cors';
import * as mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { databaseOptions } from './dbConfig';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const resolveUserId = (req: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token && token.startsWith('mock_')) {
    return 'local-user';
  }

  if (req.user?.id) return req.user.id;
  if (req.headers['x-user-id']) return String(req.headers['x-user-id']);
  if (req.query?.user_id) return String(req.query.user_id);
  return 'local-user';
};

const pool = mysql.createPool({
  ...databaseOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const ensureCoreTables = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(30),
      password VARCHAR(255),
      age INT,
      gender VARCHAR(10),
      heightCm DECIMAL(5,2),
      weightKg DECIMAL(5,2),
      bodyFatPercent DECIMAL(5,2),
      muscleMassPercent DECIMAL(5,2),
      experience VARCHAR(20),
      goal VARCHAR(20),
      daysPerWeek INT,
      workoutDuration INT,
      availableEquipment JSON,
      injuries JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id VARCHAR(50) PRIMARY KEY,
      age INT,
      gender VARCHAR(10),
      height_cm DECIMAL(6,2),
      weight_kg DECIMAL(6,2),
      body_fat DECIMAL(5,2),
      muscle_mass DECIMAL(5,2),
      experience VARCHAR(20),
      goal VARCHAR(40),
      activity_level VARCHAR(20),
      sleep_hours DECIMAL(4,2),
      stress VARCHAR(20),
      job_type VARCHAR(20),
      daily_steps INT,
      cuisine VARCHAR(40),
      food_preference VARCHAR(40),
      muscle_ratings JSON,
      recommended_strategy VARCHAR(40),
      recommended_split VARCHAR(40),
      daily_calories INT,
      protein_target INT,
      carbs_target INT,
      fat_target INT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS workout_plans (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50),
      goal VARCHAR(40),
      split VARCHAR(40),
      plan_json JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS diet_plans (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50),
      calories INT,
      protein INT,
      carbs INT,
      fat INT,
      plan_json JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS progress_logs (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50),
      log_date DATE,
      weight_kg DECIMAL(6,2),
      body_fat DECIMAL(5,2),
      muscle_mass DECIMAL(5,2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50),
      question TEXT,
      answer TEXT,
      intent VARCHAR(40),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const ensureUserDailyStatsTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_daily_stats (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      stat_date DATE NOT NULL,
      water_intake_liters DECIMAL(5,2) DEFAULT 0,
      meals_json JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_stats_day (user_id, stat_date)
    )
  `);
};

const ensureSchemaColumns = async () => {
  const migrationChecks: Array<{ tableName: string; columns: Array<{ name: string; definition: string }> }> = [
    {
      tableName: 'users',
      columns: [{ name: 'phone', definition: 'VARCHAR(30) NULL' }],
    },
    {
      tableName: 'user_profiles',
      columns: [
        { name: 'recommended_strategy', definition: 'VARCHAR(40) NULL' },
        { name: 'recommended_split', definition: 'VARCHAR(40) NULL' },
        { name: 'daily_calories', definition: 'INT NULL' },
        { name: 'protein_target', definition: 'INT NULL' },
        { name: 'carbs_target', definition: 'INT NULL' },
        { name: 'fat_target', definition: 'INT NULL' },
      ],
    },
  ];

  for (const { tableName, columns } of migrationChecks) {
    try {
      const [rows]: any = await pool.execute(`SHOW COLUMNS FROM \`${tableName}\``);
      const existingColumns = new Set(rows.map((row: any) => row.Field));

      for (const column of columns) {
        if (existingColumns.has(column.name)) continue;
        await pool.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${column.name}\` ${column.definition}`);
      }
    } catch (error) {
      console.warn('Schema migration skipped:', tableName, (error as Error).message);
    }
  }
};

ensureCoreTables().catch((error) => {
  console.error('Failed to ensure core tables:', error);
});
ensureUserDailyStatsTable().catch((error) => {
  console.error('Failed to ensure user_daily_stats table:', error);
});
ensureSchemaColumns().catch((error) => {
  console.error('Failed to ensure schema columns:', error);
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = { id: 'local-user' };
    return next();
  }

  if (token.startsWith('mock_')) {
    req.user = { id: 'local-user' };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// POST /api/auth/signup
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const [existingUsers]: any = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = Date.now().toString();

    await pool.execute(
      'INSERT INTO users (id, name, email, phone, password) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, phone || null, hashedPassword]
    );

    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User created', token, user: { id, name, email, phone } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const [users]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    // Remove password from response
    delete user.password;
    
    res.json({ message: 'Logged in successfully', token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// PUT /api/users/profile - Update onboarding profile
const saveUserProfileData = async (userId: string, payload: any) => {
  const {
    age, gender, heightCm, weightKg, bodyFatPercent,
    muscleMassPercent, experience, goal, daysPerWeek,
    workoutDuration, availableEquipment, injuries,
    recommendedStrategy, recommendedSplit,
    dailyCalories, proteinTarget, carbsTarget, fatTarget,
    bmr, tdee, sleepHours, stressLevel, activityLevel,
    foodPreference, gymType, country, dailyFoodBudget,
    muscleRatings, workoutPlan, dietPlan,
  } = payload;

  const userQuery = `
    UPDATE users SET 
      age = ?, gender = ?, heightCm = ?, weightKg = ?, bodyFatPercent = ?, 
      muscleMassPercent = ?, experience = ?, goal = ?, daysPerWeek = ?, 
      workoutDuration = ?, availableEquipment = ?, injuries = ?
    WHERE id = ?
  `;

  await pool.execute(userQuery, [
    age, gender, heightCm, weightKg, bodyFatPercent,
    muscleMassPercent || 0, experience, goal, daysPerWeek,
    workoutDuration, JSON.stringify(availableEquipment || []), JSON.stringify(injuries || []),
    userId
  ]);

  const profileQuery = `
    INSERT INTO user_profiles (
      user_id, age, gender, height_cm, weight_kg, body_fat, muscle_mass,
      experience, goal, activity_level, sleep_hours, stress, job_type,
      daily_steps, cuisine, food_preference, muscle_ratings,
      recommended_strategy, recommended_split, daily_calories,
      protein_target, carbs_target, fat_target
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      age = VALUES(age), gender = VALUES(gender), height_cm = VALUES(height_cm),
      weight_kg = VALUES(weight_kg), body_fat = VALUES(body_fat), muscle_mass = VALUES(muscle_mass),
      experience = VALUES(experience), goal = VALUES(goal), activity_level = VALUES(activity_level),
      sleep_hours = VALUES(sleep_hours), stress = VALUES(stress), food_preference = VALUES(food_preference),
      recommended_strategy = VALUES(recommended_strategy), recommended_split = VALUES(recommended_split),
      daily_calories = VALUES(daily_calories), protein_target = VALUES(protein_target),
      carbs_target = VALUES(carbs_target), fat_target = VALUES(fat_target)
  `;

  await pool.execute(profileQuery, [
    userId, age, gender, heightCm, weightKg, bodyFatPercent, muscleMassPercent || 0,
    experience, goal, activityLevel || 'moderate', sleepHours || 7, stressLevel || 'medium', null,
    null, country || 'India', foodPreference || 'vegetarian', JSON.stringify(muscleRatings || {}),
    recommendedStrategy || null, recommendedSplit || null,
    dailyCalories || Math.round(tdee || 2200), proteinTarget || null, carbsTarget || null, fatTarget || null,
  ]);

  if (workoutPlan) {
    await pool.execute(
      `INSERT INTO workout_plans (id, user_id, goal, split, plan_json) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE goal = VALUES(goal), split = VALUES(split), plan_json = VALUES(plan_json)`,
      [
        `wp_${userId}_${Date.now()}`,
        userId,
        goal || 'recomposition',
        recommendedSplit || workoutPlan?.split || 'ppl',
        JSON.stringify(workoutPlan),
      ]
    );
  }

  if (dietPlan) {
    await pool.execute(
      `INSERT INTO diet_plans (id, user_id, calories, protein, carbs, fat, plan_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE calories = VALUES(calories), protein = VALUES(protein), carbs = VALUES(carbs), fat = VALUES(fat), plan_json = VALUES(plan_json)`,
      [
        `dp_${userId}_${Date.now()}`,
        userId,
        dietPlan.dailyCalories || dailyCalories || 2200,
        dietPlan.protein || proteinTarget || null,
        dietPlan.carbs || carbsTarget || null,
        dietPlan.fat || fatTarget || null,
        JSON.stringify(dietPlan),
      ]
    );
  }
};

app.put('/api/users/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    await saveUserProfileData(userId, req.body);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/onboarding/save', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = resolveUserId(req);
    const payload = req.body || {};
    await saveUserProfileData(userId, payload);
    res.json({
      message: 'Onboarding saved successfully',
      userId,
      recommendation: {
        strategy: payload.recommendedStrategy || payload.strategy || null,
        split: payload.recommendedSplit || payload.split || null,
        calories: payload.dailyCalories || payload.calories || null,
        protein: payload.proteinTarget || payload.protein || null,
      },
    });
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    res.status(500).json({ error: 'Failed to save onboarding result' });
  }
});

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

app.post('/api/ml/recommend', async (req: Request, res: Response) => {
  try {
    const r = await fetch(`${ML_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!r.ok) return res.status(503).json({ error: 'ML service error' });
    res.json(await r.json());
  } catch (error) {
    console.error('ML recommend error:', error);
    res.status(503).json({ error: 'ML service unavailable' });
  }
});

app.post('/api/chat', async (req: any, res: Response) => {
  try {
    const r = await fetch(`${ML_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!r.ok) return res.status(503).json({ error: 'Chat service error' });
    const data: any = await r.json();

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
        if (!err && user?.id) {
          try {
            await pool.execute(
              'INSERT INTO chat_history (id, user_id, question, answer, intent) VALUES (?, ?, ?, ?, ?)',
              [Date.now().toString(), user.id, req.body.message, data.answer, data.intent || 'general']
            );
          } catch (e) {
            console.error('chat history skip:', e);
          }
        }
      });
    }

    res.json(data);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(503).json({ error: 'Chat service unavailable' });
  }
});

app.get('/api/progress', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = resolveUserId(req);
    const [rows]: any = await pool.execute(
      'SELECT id, user_id, log_date AS date, weight_kg AS weightKg, body_fat AS bodyFatPercent, muscle_mass AS muscleMassPercent, notes FROM progress_logs WHERE user_id = ? ORDER BY log_date ASC, created_at ASC',
      [userId]
    );

    res.json(rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      weightKg: Number(row.weightKg),
      bodyFatPercent: row.bodyFatPercent == null ? undefined : Number(row.bodyFatPercent),
      muscleMassPercent: row.muscleMassPercent == null ? undefined : Number(row.muscleMassPercent),
      notes: row.notes || undefined,
    })));
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

app.post('/api/progress', authenticateToken, async (req: any, res: Response) => {
  try {
    const { weightKg, bodyFatPercent, muscleMassPercent, notes, date } = req.body;
    const userId = resolveUserId(req);
    await pool.execute(
      'INSERT INTO progress_logs (id, user_id, log_date, weight_kg, body_fat, muscle_mass, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [Date.now().toString(), userId, date || new Date().toISOString().slice(0, 10), weightKg, bodyFatPercent || null, muscleMassPercent || null, notes || null]
    );
    res.json({ message: 'Progress saved' });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

app.get('/api/daily-stats', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = resolveUserId(req);
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const [rows]: any = await pool.execute(
      'SELECT * FROM user_daily_stats WHERE user_id = ? AND stat_date = ? LIMIT 1',
      [userId, date]
    );

    if (!rows.length) {
      return res.json({ date, waterIntakeLiters: 0, meals: [] });
    }

    const row = rows[0];
    const meals = row.meals_json ? JSON.parse(row.meals_json) : [];

    res.json({
      date,
      waterIntakeLiters: Number(row.water_intake_liters || 0),
      meals,
    });
  } catch (error) {
    console.error('Daily stats fetch error:', error);
    res.status(500).json({ error: 'Failed to load daily stats' });
  }
});

app.post('/api/daily-stats', authenticateToken, async (req: any, res: any) => {
  try {
    const { date = new Date().toISOString().slice(0, 10), waterIntakeLiters = 0, meals = [] } = req.body || {};
    const userId = resolveUserId(req);
    const statId = `${userId}_${date}`;

    await pool.execute(`
      INSERT INTO user_daily_stats (id, user_id, stat_date, water_intake_liters, meals_json)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        water_intake_liters = VALUES(water_intake_liters),
        meals_json = VALUES(meals_json),
        updated_at = CURRENT_TIMESTAMP
    `, [statId, userId, date, Number(waterIntakeLiters), JSON.stringify(meals)]);

    res.json({ message: 'Daily stats saved' });
  } catch (error) {
    console.error('Daily stats write error:', error);
    res.status(500).json({ error: 'Failed to save daily stats' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'FitAI Backend API is running' });
});

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Backend server running on http://${HOST}:${PORT}`);
});
