// COMPLETE transactionController.js with ALL CRUD operations
// Replace your entire transactionController.js with this file

const pool = require('../config/db');

// ==================== CREATE TRANSACTION ====================
const createTransaction = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      customer_id,
      module,
      transaction_type,
      amount,
      payment_method,
      description,
      barber_service,
      barber_staff,
      travel_airline,
      travel_passenger_name,
      travel_passport,
      travel_pnr,
      travel_ticket_issue_date,
      travel_date,
      store_items
    } = req.body;

    if (!customer_id || !module || !transaction_type || !amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Missing required fields: customer_id, module, transaction_type, amount'
      });
    }

    if (!['general_store', 'barber', 'travel'].includes(module)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid module' });
    }

    if (!['debit', 'credit'].includes(transaction_type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Amount must be a valid non-negative number' });
    }

    // Insert the main transaction (debit/sale or credit/payment)
    const insertResult = await client.query(
      `INSERT INTO transactions (
        customer_id, module, transaction_type, amount, payment_method,
        description, barber_service, barber_staff,
        travel_airline, travel_passenger_name, travel_passport,
        travel_pnr, travel_ticket_issue_date, travel_date, store_items,
        is_auto_payment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, FALSE)
      RETURNING *`,
      [
        customer_id, module, transaction_type, parsedAmount, payment_method,
        description, barber_service, barber_staff,
        travel_airline, travel_passenger_name, travel_passport,
        travel_pnr, travel_ticket_issue_date, travel_date, store_items
      ]
    );

    // If this is a DEBIT (sale) with cash/card/bank_transfer payment,
    // automatically create a matching CREDIT (payment) transaction.
    // This ensures cash sales don't create debt — only 'udhaar' sales do.
    if (transaction_type === 'debit' && ['cash', 'card', 'bank_transfer'].includes(payment_method)) {
      await client.query(
        `INSERT INTO transactions (
          customer_id, module, transaction_type, amount, payment_method, description, is_auto_payment
        ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [
          customer_id,
          module,
          'credit',
          parsedAmount,
          payment_method,
          `Auto-payment for ${module} transaction (${payment_method})`
        ]
      );
    }

    const balanceResult = await client.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits
       FROM transactions 
       WHERE customer_id = $1`,
      [customer_id]
    );

    const { total_debits, total_credits } = balanceResult.rows[0];
    const current_balance = parseFloat(total_debits) - parseFloat(total_credits);

    const existingBalance = await client.query(
      'SELECT * FROM customer_balances WHERE customer_id = $1',
      [customer_id]
    );

    if (existingBalance.rows.length === 0) {
      await client.query(
        `INSERT INTO customer_balances (customer_id, current_balance, total_debits, total_credits)
         VALUES ($1, $2, $3, $4)`,
        [customer_id, current_balance, total_debits, total_credits]
      );
    } else {
      await client.query(
        `UPDATE customer_balances 
         SET current_balance = $1, total_debits = $2, total_credits = $3
         WHERE customer_id = $4`,
        [current_balance, total_debits, total_credits, customer_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      transaction: insertResult.rows[0],
      balance: {
        current_balance,
        total_debits,
        total_credits
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  } finally {
    client.release();
  }
};

// ==================== GET TRANSACTIONS BY MODULE ====================
const getTransactionsByModule = async (req, res) => {
  try {
    const { module } = req.params;
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    if (!['general_store', 'barber', 'travel'].includes(module)) {
      return res.status(400).json({ error: 'Invalid module' });
    }

    let query = `
      SELECT
        t.*,
        c.name as customer_name,
        c.phone as customer_phone,
        cb.current_balance
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN customer_balances cb ON c.id = cb.customer_id
      WHERE t.module = $1 AND t.is_auto_payment = FALSE
    `;

    const params = [module];

    if (search) {
      query += ` AND (
        c.name ILIKE $${params.length + 1} OR
        c.phone ILIKE $${params.length + 1} OR
        t.description ILIKE $${params.length + 1}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countQuery = `
      SELECT COUNT(*)
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.module = $1 AND t.is_auto_payment = FALSE
      ${search ? `AND (c.name ILIKE $2 OR c.phone ILIKE $2 OR t.description ILIKE $2)` : ''}
    `;
    const countParams = search ? [module, `%${search}%`] : [module];
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
};

// ==================== UPDATE TRANSACTION ====================
const updateTransaction = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      transaction_type,
      amount,
      payment_method,
      description,
      barber_service,
      barber_staff,
      travel_airline,
      travel_passenger_name,
      travel_passport,
      travel_pnr,
      travel_ticket_issue_date,
      travel_date,
      store_items
    } = req.body;

    // Get existing transaction
    const existing = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
    
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const customer_id = existing.rows[0].customer_id;
    const oldPaymentMethod = existing.rows[0].payment_method;
    const oldTransactionType = existing.rows[0].transaction_type;
    const module = existing.rows[0].module;

    // Handle auto-payment logic when payment method changes
    // Only applies to debit transactions
    if (oldTransactionType === 'debit' && transaction_type === 'debit') {
      const wasPaidImmediately = ['cash', 'card', 'bank_transfer'].includes(oldPaymentMethod);
      const isPaidImmediately = ['cash', 'card', 'bank_transfer'].includes(payment_method);

      // If changed from paid method to udhaar, delete auto-payment
      if (wasPaidImmediately && payment_method === 'udhaar') {
        const deleteResult = await client.query(
          `DELETE FROM transactions 
           WHERE customer_id = $1 
           AND transaction_type = 'credit' 
           AND payment_method = $2
           AND description = $3`,
          [customer_id, oldPaymentMethod, `Auto-payment for ${module} transaction (${oldPaymentMethod})`]
        );
        console.log(`Deleted ${deleteResult.rowCount} auto-payment(s) for transaction #${id}`);
      }

      // If changed from udhaar to paid method, create auto-payment
      if (oldPaymentMethod === 'udhaar' && isPaidImmediately) {
        const parsedAmt = parseFloat(amount);
        if (isNaN(parsedAmt) || parsedAmt < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Amount must be a valid non-negative number' });
        }
        await client.query(
          `INSERT INTO transactions
           (customer_id, module, transaction_type, amount, payment_method, description, is_auto_payment)
           VALUES ($1, $2, 'credit', $3, $4, $5, TRUE)`,
          [
            customer_id,
            module,
            parsedAmt,
            payment_method,
            `Auto-payment for ${module} transaction (${payment_method})`
          ]
        );
      }
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Amount must be a valid non-negative number' });
    }

    // Update transaction
    const updateResult = await client.query(
      `UPDATE transactions
       SET transaction_type = $1, amount = $2, payment_method = $3, description = $4,
           barber_service = $5, barber_staff = $6, travel_airline = $7,
           travel_passenger_name = $8, travel_passport = $9, travel_pnr = $10,
           travel_ticket_issue_date = $11, travel_date = $12, store_items = $13
       WHERE id = $14
       RETURNING *`,
      [
        transaction_type, parsedAmount, payment_method, description,
        barber_service, barber_staff, travel_airline, travel_passenger_name,
        travel_passport, travel_pnr, travel_ticket_issue_date, travel_date,
        store_items, id
      ]
    );

    // Recalculate balance
    const balanceResult = await client.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits
       FROM transactions 
       WHERE customer_id = $1`,
      [customer_id]
    );

    const { total_debits, total_credits } = balanceResult.rows[0];
    const current_balance = parseFloat(total_debits) - parseFloat(total_credits);

    await client.query(
      `UPDATE customer_balances 
       SET current_balance = $1, total_debits = $2, total_credits = $3
       WHERE customer_id = $4`,
      [current_balance, total_debits, total_credits, customer_id]
    );

    await client.query('COMMIT');

    res.json({
      transaction: updateResult.rows[0],
      balance: { current_balance, total_debits, total_credits }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  } finally {
    client.release();
  }
};

// ==================== DELETE TRANSACTION ====================
const deleteTransaction = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const transactionResult = await client.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );

    if (transactionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];
    const customer_id = transaction.customer_id;

    await client.query('DELETE FROM transactions WHERE id = $1', [id]);

    // Recalculate balance
    const balanceResult = await client.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as total_credits
       FROM transactions 
       WHERE customer_id = $1`,
      [customer_id]
    );

    const { total_debits, total_credits } = balanceResult.rows[0];
    const current_balance = parseFloat(total_debits) - parseFloat(total_credits);

    if (parseFloat(total_debits) === 0 && parseFloat(total_credits) === 0) {
      await client.query('DELETE FROM customer_balances WHERE customer_id = $1', [customer_id]);
    } else {
      await client.query(
        `UPDATE customer_balances 
         SET current_balance = $1, total_debits = $2, total_credits = $3
         WHERE customer_id = $4`,
        [current_balance, total_debits, total_credits, customer_id]
      );
    }

    await client.query('COMMIT');

    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  } finally {
    client.release();
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

    res.json({ success: true, message: 'Customer and all transactions deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  } finally {
    client.release();
  }
};

// ==================== GET REPORT TRANSACTIONS (server-side filtered) ====================
const getReportTransactions = async (req, res) => {
  try {
    const { module, customer_id, startDate, endDate, page = 1, limit = 200 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const params = [];
    const conditions = ['t.is_auto_payment = FALSE'];

    if (module && module !== 'all') {
      if (!['general_store', 'barber', 'travel'].includes(module)) {
        return res.status(400).json({ error: 'Invalid module' });
      }
      conditions.push(`t.module = $${params.length + 1}`);
      params.push(module);
    }

    if (customer_id && customer_id !== 'all') {
      conditions.push(`t.customer_id = $${params.length + 1}`);
      params.push(parseInt(customer_id));
    }

    if (startDate) {
      conditions.push(`DATE(t.created_at) >= $${params.length + 1}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`DATE(t.created_at) <= $${params.length + 1}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        t.*,
        c.name as customer_name,
        c.phone as customer_phone,
        cb.current_balance
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN customer_balances cb ON c.id = cb.customer_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    const countParams = params.slice(0, -2);
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions t JOIN customers c ON t.customer_id = c.id ${whereClause}`,
      countParams
    );

    res.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get report transactions error:', err);
    res.status(500).json({ error: 'Failed to get report transactions' });
  }
};

// ==================== GET DAILY SUMMARY ====================
const getDailySummary = async (req, res) => {
  try {
    const { module, startDate, endDate } = req.query;

    let query = `
      SELECT 
        DATE(created_at) as date,
        module,
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (module && module !== 'all') {
      query += ` AND module = $${paramCount}`;
      params.push(module);
      paramCount++;
    }

    if (startDate) {
      query += ` AND DATE(created_at) >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND DATE(created_at) <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` GROUP BY DATE(created_at), module, transaction_type ORDER BY date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get daily summary error:', err);
    res.status(500).json({ error: 'Failed to get daily summary' });
  }
};

// ==================== GET OUTSTANDING BALANCES ====================
const getOutstandingBalances = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        cb.current_balance,
        cb.total_debits,
        cb.total_credits
      FROM customers c
      JOIN customer_balances cb ON c.id = cb.customer_id
      WHERE cb.current_balance > 0
      ORDER BY cb.current_balance DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Get outstanding balances error:', err);
    res.status(500).json({ error: 'Failed to get outstanding balances' });
  }
};

// ==================== EXPORTS ====================
module.exports = {
  createTransaction,
  getTransactionsByModule,
  getReportTransactions,
  updateTransaction,
  deleteTransaction,
  deleteCustomer,
  getDailySummary,
  getOutstandingBalances
};