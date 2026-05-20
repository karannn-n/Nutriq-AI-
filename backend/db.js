const mysql = require('mysql2/promise');
require('dotenv').config();

// Utility to bootstrap database if it doesn't exist
const initializeDatabase = async () => {
  try {
    // 1. Connect without targeting a specific database to create it safely
    const initConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    
    await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    await initConnection.end();

    // 2. Now use the target database pool to create the schema
    const connection = await pool.getConnection();

    // Create meals table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT 1,
        description VARCHAR(255) NOT NULL,
        calories INT,
        protein_g FLOAT,
        carbs_g FLOAT,
        fat_g FLOAT,
        vitamin_d_mcg FLOAT,
        iron_mg FLOAT,
        zinc_mg FLOAT,
        b12_mcg FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    connection.release();
    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Database initialization failed. Check your credentials in .env.", error.message);
  }
};

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = { pool, initializeDatabase };
