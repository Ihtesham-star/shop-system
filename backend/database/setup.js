const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database...\n');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✓ Database tables created successfully');
    console.log('✓ Indexes created');
    console.log('✓ Default admin user created');
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Database Setup Complete!             ║');
    console.log('║                                        ║');
    console.log('║   Default Login Credentials:           ║');
    console.log('║   Username: admin                      ║');
    console.log('║   Password: admin123                   ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database exists (create it if not)');
    console.error('3. Credentials in .env are correct\n');
    process.exit(1);
  }
}

setupDatabase();
