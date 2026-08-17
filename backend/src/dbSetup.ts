import * as mysql from 'mysql2/promise';

async function setupDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'user1',
    });

    console.log('Connected to MySQL server.');

    await connection.query(`CREATE DATABASE IF NOT EXISTS gym_ai`);
    console.log('Database gym_ai created or already exists.');

    await connection.query(`USE gym_ai`);

    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
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
    `;
    await connection.query(createUsersTableQuery);
    console.log('Users table created or already exists.');

    await connection.query(`
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS workout_plans (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50),
        goal VARCHAR(40),
        split VARCHAR(40),
        plan_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
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

    await connection.query(`
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

    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50),
        question TEXT,
        answer TEXT,
        intent VARCHAR(40),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('FitAI tables ready.');

    await connection.end();
    console.log('Database setup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
