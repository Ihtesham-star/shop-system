-- Shop System Database Schema
-- Run this file to create all required tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add force_password_change to existing installations
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT FALSE;

-- Sequence for customer codes (atomic, race-condition safe)
CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 1;

-- Advance the sequence to match any existing customers on re-run
DO $$
DECLARE max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 5) AS INTEGER)), 0)
    INTO max_num
    FROM customers
    WHERE customer_code ~ '^CUST\d+$';
  IF max_num > 0 THEN
    PERFORM setval('customer_code_seq', max_num);
  END IF;
END $$;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL CHECK (module IN ('general_store', 'barber', 'travel')),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'udhaar')),
    description TEXT,
    is_auto_payment BOOLEAN NOT NULL DEFAULT FALSE,

    -- General Store fields
    store_items TEXT,

    -- Barber Shop fields
    barber_service VARCHAR(100),
    barber_staff VARCHAR(100),

    -- Travel Agency fields
    travel_airline VARCHAR(100),
    travel_passenger_name VARCHAR(255),
    travel_passport VARCHAR(50),
    travel_pnr VARCHAR(50),
    travel_ticket_issue_date DATE,
    travel_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add is_auto_payment to existing installations
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_auto_payment BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark existing auto-payment rows based on description pattern
UPDATE transactions
SET is_auto_payment = TRUE
WHERE is_auto_payment = FALSE
  AND description LIKE 'Auto-payment for %';

-- Create customer_balances table
CREATE TABLE IF NOT EXISTS customer_balances (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    current_balance DECIMAL(10, 2) DEFAULT 0,
    total_debits DECIMAL(10, 2) DEFAULT 0,
    total_credits DECIMAL(10, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_module ON transactions(module);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);

-- Create default admin user (password: admin123)
-- IMPORTANT: force_password_change=TRUE means the user must set a new password on first login
-- Hash generated with bcryptjs for 'admin123'
INSERT INTO users (username, password_hash, role, force_password_change)
VALUES ('admin', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE5O.S3T3xEBY1VTi5L2rQn4pKLyQ2', 'admin', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_balances_updated_at ON customer_balances;
CREATE TRIGGER update_customer_balances_updated_at BEFORE UPDATE ON customer_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
