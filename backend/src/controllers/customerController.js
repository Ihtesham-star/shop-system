// COMPLETE customerController.js with ALL CRUD operations
// Replace your entire customerController.js with this file

const pool = require('../config/db');

// ==================== CREATE CUSTOMER ====================
// Basic phone validation: digits, spaces, +, -, (), 7–15 chars
const PHONE_REGEX = /^[+\d][\d\s\-().]{5,19}$/;

const createCustomer = async (req, res) => {
  try {
    const { name, phone, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (phone && !PHONE_REGEX.test(phone.trim())) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Only check for duplicate phone if phone is provided
    if (phone) {
      const existingCustomer = await pool.query(
        'SELECT id FROM customers WHERE phone = $1',
        [phone.trim()]
      );

      if (existingCustomer.rows.length > 0) {
        return res.status(400).json({ error: 'Customer with this phone number already exists' });
      }
    }

    // Use the sequence for an atomic, race-condition-safe customer code
    const seqResult = await pool.query(`SELECT nextval('customer_code_seq') AS n`);
    const customer_code = `CUST${seqResult.rows[0].n.toString().padStart(6, '0')}`;

    const result = await pool.query(
      'INSERT INTO customers (customer_code, name, phone, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [customer_code, name, phone, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

// ==================== GET ALL CUSTOMERS ====================
const getAllCustomers = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50, module = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.*,
        cb.current_balance,
        cb.total_debits,
        cb.total_credits,
        COALESCE(
          string_agg(DISTINCT t.module, ','),
          ''
        ) as modules
      FROM customers c
      LEFT JOIN customer_balances cb ON c.id = cb.customer_id
      LEFT JOIN transactions t ON c.id = t.customer_id
    `;

    const params = [];
    const conditions = [];

    if (search) {
      conditions.push(`(c.name ILIKE $${params.length + 1} OR c.phone ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    // Filter by module if specified - only customers who have transactions in that module
    if (module) {
      conditions.push(`EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.customer_id = c.id AND t.module = $${params.length + 1}
      )`);
      params.push(module);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` GROUP BY c.id, cb.current_balance, cb.total_debits, cb.total_credits`;
    query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = `SELECT COUNT(*) FROM customers c`;
    const countConditions = [];
    const countParams = [];

    if (search) {
      countConditions.push(`(c.name ILIKE $${countParams.length + 1} OR c.phone ILIKE $${countParams.length + 1})`);
      countParams.push(`%${search}%`);
    }

    if (module) {
      countConditions.push(`EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.customer_id = c.id AND t.module = $${countParams.length + 1}
      )`);
      countParams.push(module);
    }

    if (countConditions.length > 0) {
      countQuery += ` WHERE ` + countConditions.join(' AND ');
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Failed to get customers' });
  }
};

// ==================== GET CUSTOMER BY ID ====================
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customerResult = await pool.query(
      `SELECT 
        c.*,
        cb.current_balance,
        cb.total_debits,
        cb.total_credits
      FROM customers c
      LEFT JOIN customer_balances cb ON c.id = cb.customer_id
      WHERE c.id = $1`,
      [id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const transactionsResult = await pool.query(
      `SELECT
        *,
        SUM(
          CASE WHEN transaction_type = 'debit' THEN amount ELSE -amount END
        ) OVER (ORDER BY created_at ASC, id ASC) AS running_balance
       FROM transactions
       WHERE customer_id = $1
       ORDER BY created_at DESC, id DESC`,
      [id]
    );

    res.json({
      customer: customerResult.rows[0],
      transactions: transactionsResult.rows
    });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Failed to get customer' });
  }
};

// ==================== UPDATE CUSTOMER ====================
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (phone && !PHONE_REGEX.test(phone.trim())) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if phone exists for another customer (only if phone is provided)
    if (phone) {
      const existingCustomer = await pool.query(
        'SELECT id FROM customers WHERE phone = $1 AND id != $2',
        [phone.trim(), id]
      );

      if (existingCustomer.rows.length > 0) {
        return res.status(400).json({ error: 'Another customer with this phone number already exists' });
      }
    }

    const result = await pool.query(
      `UPDATE customers 
       SET name = $1, phone = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, phone, notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

// ==================== DELETE CUSTOMER ====================
const deleteCustomer = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const customerResult = await client.query('SELECT * FROM customers WHERE id = $1', [id]);

    if (customerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }

    await client.query('DELETE FROM transactions WHERE customer_id = $1', [id]);
    await client.query('DELETE FROM customer_balances WHERE customer_id = $1', [id]);
    await client.query('DELETE FROM customers WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  } finally {
    client.release();
  }
};

// ==================== SEARCH CUSTOMERS ====================
const searchCustomers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.phone,
        cb.current_balance
      FROM customers c
      LEFT JOIN customer_balances cb ON c.id = cb.customer_id
      WHERE c.name ILIKE $1 OR c.phone ILIKE $1
      ORDER BY c.name
      LIMIT 10`,
      [`%${query}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Search customers error:', err);
    res.status(500).json({ error: 'Failed to search customers' });
  }
};

const getTransactionsForCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM transactions WHERE customer_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    console.error('Get transactions for customer error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// ==================== EXPORTS ====================
module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getTransactionsForCustomer
};