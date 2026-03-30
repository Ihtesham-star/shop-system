// COMPLETE transactionRoutes.js with ALL CRUD routes
// Replace your entire transactionRoutes.js with this file

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createTransaction,
  getTransactionsByModule,
  getReportTransactions,
  updateTransaction,
  deleteTransaction,
  deleteCustomer,
  getDailySummary,
  getOutstandingBalances
} = require('../controllers/transactionController');

// All routes require authentication
router.use(authMiddleware);

// CRUD Operations
router.post('/', createTransaction);
router.get('/module/:module', getTransactionsByModule);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);
router.delete('/customer/:id', deleteCustomer);

// Reports
router.get('/reports/transactions', getReportTransactions);
router.get('/reports/daily-summary', getDailySummary);
router.get('/reports/outstanding', getOutstandingBalances);

module.exports = router;
