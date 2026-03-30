const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function createAdminUser() {
  try {
    // Hash the password
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Generated hash:', hash);
    
    // Delete old admin user
    await pool.query('DELETE FROM users WHERE username = $1', ['admin']);
    
    // Insert new admin user
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
      ['admin', hash, 'admin']
    );
    
    console.log('✓ Admin user created successfully!');
    console.log('Username:', result.rows[0].username);
    console.log('Role:', result.rows[0].role);
    console.log('\nYou can now login with:');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdminUser();