const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('error', (err) => {
  console.error('Database connection error:', err.message);
});

// Retry connecting up to 10 times with 2s delay (handles slow PostgreSQL startup)
async function waitForDb(retries = 10, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT NOW()');
      console.log('✓ Database connected successfully');
      return;
    } catch (err) {
      if (i === retries) {
        console.error(`❌ Could not connect to database after ${retries} attempts: ${err.message}`);
        console.error('\nTroubleshooting:');
        console.error('  1. Check if PostgreSQL is running');
        console.error(`  2. Verify .env: DB_HOST=${process.env.DB_HOST} DB_PORT=${process.env.DB_PORT} DB_NAME=${process.env.DB_NAME}`);
        process.exit(1);
      }
      console.log(`Database not ready (attempt ${i}/${retries}), retrying in ${delayMs / 1000}s...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

waitForDb();

module.exports = pool;
