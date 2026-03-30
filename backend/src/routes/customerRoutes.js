// COMPLETE customerRoutes.js with ALL CRUD routes
// Replace your entire customerRoutes.js with this file

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers
} = require('../controllers/customerController');

const { getTransactionsForCustomer } = require('../controllers/customerController');

// All routes require authentication
router.use(authMiddleware);

// CRUD Operations
router.post('/', createCustomer);
router.get('/', getAllCustomers);
router.get('/search', searchCustomers);
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/transactions', getTransactionsForCustomer);

module.exports = router;
