import express from 'express';
import cors from 'cors';
import * as mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'gym_ai_super_secret_key_123';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'user1',
  database: 'gym_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const [existingUsers]: any = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = Date.now().toString();

    await pool.execute(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [id, name, email, hashedPassword]
    );

    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User created', token, user: { id, name, email } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
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
app.put('/api/users/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { 
      age, gender, heightCm, weightKg, bodyFatPercent, 
      muscleMassPercent, experience, goal, daysPerWeek, 
      workoutDuration, availableEquipment, injuries 
    } = req.body;

    const query = `
      UPDATE users SET 
        age = ?, gender = ?, heightCm = ?, weightKg = ?, bodyFatPercent = ?, 
        muscleMassPercent = ?, experience = ?, goal = ?, daysPerWeek = ?, 
        workoutDuration = ?, availableEquipment = ?, injuries = ?
      WHERE id = ?
    `;

    await pool.execute(query, [
      age, gender, heightCm, weightKg, bodyFatPercent,
      muscleMassPercent || 0, experience, goal, daysPerWeek,
      workoutDuration, JSON.stringify(availableEquipment), JSON.stringify(injuries || []),
      userId
    ]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

app.post('/api/ml/recommend', async (req, res) => {
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

app.post('/api/chat', async (req: any, res) => {
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

app.post('/api/progress', authenticateToken, async (req: any, res) => {
  try {
    const { weightKg, bodyFatPercent, muscleMassPercent, notes, date } = req.body;
    await pool.execute(
      'INSERT INTO progress_logs (id, user_id, log_date, weight_kg, body_fat, muscle_mass, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [Date.now().toString(), req.user.id, date || new Date().toISOString().slice(0, 10), weightKg, bodyFatPercent || null, muscleMassPercent || null, notes || null]
    );
    res.json({ message: 'Progress saved' });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
