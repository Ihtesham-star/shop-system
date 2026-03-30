import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './ModuleStyles.css';

function GeneralStore() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: null, ids: [], transaction: null });
  const [editTransaction, setEditTransaction] = useState(null);
  const [selectedCustomerBalance, setSelectedCustomerBalance] = useState(null);
  
  const [formData, setFormData] = useState({
    customerType: 'existing',
    customer_id: '',
    newCustomer: { name: '', phone: '', notes: '' },
    transaction_type: 'debit',
    amount: '',
    payment_method: 'cash',
    description: '',
    store_items: ''
  });

  const limit = 20;

  useEffect(() => {
    loadTransactions();
    loadCustomers();
  }, [page, searchTerm]);

  const loadTransactions = async () => {
    try {
      const response = await api.get(`/transactions/module/general_store`, {
        params: { page, limit, search: searchTerm }
      });
      // Filter out auto-payment transactions - users don't need to see them
      const filteredTransactions = response.data.transactions.filter(
        t => !t.description?.includes('Auto-payment for')
      );
      setTransactions(filteredTransactions);
      setTotal(response.data.total);
    } catch (err) {
      setMessage('Error loading transactions');
    }
  };

  const loadCustomers = async () => {
    try {
      // Get only customers who have transactions in this module - more efficient query
      const response = await api.get('/customers', {
        params: { limit: 1000, module: 'general_store' }
      });
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Error loading customers');
    }
  };

  const loadCustomerBalance = async (customerId) => {
    if (!customerId) {
      setSelectedCustomerBalance(null);
      return;
    }
    try {
      const response = await api.get(`/customers/${customerId}`);
      setSelectedCustomerBalance(response.data.customer);
    } catch (err) {
      console.error('Error loading customer balance');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (parseFloat(formData.amount) <= 0) {
      setMessage('Error: Amount must be greater than 0');
      return;
    }
    
    setMessage('Saving...');
    
    try {
      let customerId = formData.customer_id;

      if (formData.customerType === 'new') {
        const customerResponse = await api.post('/customers', formData.newCustomer);
        customerId = customerResponse.data.id;
      }

      await api.post('/transactions', {
        customer_id: customerId,
        module: 'general_store',
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        description: formData.description,
        store_items: formData.store_items
      });

      setMessage('Transaction added successfully!');
      setShowForm(false);
      resetForm();
      loadTransactions();
      loadCustomers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.error || 'Failed to add transaction'));
    }
  };

  const resetForm = () => {
    setFormData({
      customerType: 'existing',
      customer_id: '',
      newCustomer: { name: '', phone: '', notes: '' },
      transaction_type: 'debit',
      amount: '',
      payment_method: 'cash',
      description: '',
      store_items: ''
    });
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(transactions.map(t => t.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleDeleteClick = (transaction = null) => {
    if (transaction) {
      setDeleteTarget({ type: 'single', ids: [transaction.id], transaction });
    } else if (selectedRows.length > 0) {
      const selectedTransactions = transactions.filter(t => selectedRows.includes(t.id));
      setDeleteTarget({ type: 'bulk', ids: selectedRows, transaction: selectedTransactions[0] });
    }
    setShowDeleteDialog(true);
  };

  const confirmDelete = async (deleteType) => {
    try {
      if (deleteTarget.type === 'bulk') {
        for (const id of deleteTarget.ids) {
          if (deleteType === 'transaction') {
            await api.delete(`/transactions/${id}`);
          } else {
            const transaction = transactions.find(t => t.id === id);
            if (transaction) {
              await api.delete(`/customers/${transaction.customer_id}`);
            }
          }
        }
        setMessage(`Successfully deleted ${deleteTarget.ids.length} items`);
      } else {
        if (deleteType === 'transaction') {
          await api.delete(`/transactions/${deleteTarget.transaction.id}`);
          setMessage('Transaction deleted successfully!');
        } else {
          await api.delete(`/customers/${deleteTarget.transaction.customer_id}`);
          setMessage('Customer and all transactions deleted successfully!');
        }
      }
      
      setShowDeleteDialog(false);
      setSelectedRows([]);
      loadTransactions();
      loadCustomers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.error || 'Delete failed'));
      setShowDeleteDialog(false);
    }
  };

  const handleEditClick = (transaction) => {
    if (selectedRows.length === 1) {
      const trans = transactions.find(t => t.id === selectedRows[0]);
      setEditTransaction(trans);
    } else {
      setEditTransaction(transaction);
    }
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/transactions/${editTransaction.id}`, {
        transaction_type: editTransaction.transaction_type,
        amount: parseFloat(editTransaction.amount),
        payment_method: editTransaction.payment_method,
        description: editTransaction.description,
        store_items: editTransaction.store_items
      });

      setMessage('Transaction updated successfully!');
      setShowEditDialog(false);
      setEditTransaction(null);
      setSelectedRows([]);
      loadTransactions();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.error || 'Update failed'));
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>General Store</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            ← Back to Dashboard
          </button>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add New'}
          </button>
          {selectedRows.length === 1 && (
            <button className="btn-secondary" onClick={() => handleEditClick()}>
              Edit Selected
            </button>
          )}
          {selectedRows.length > 0 && (
            <button className="btn-danger" onClick={() => handleDeleteClick()}>
              Delete Selected ({selectedRows.length})
            </button>
          )}
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      {showForm && (
        <div className="form-card">
          <h3>Add New Transaction</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h4>Customer Information</h4>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    value="existing"
                    checked={formData.customerType === 'existing'}
                    onChange={(e) => setFormData({...formData, customerType: e.target.value})}
                  />
                  Existing Customer
                </label>
                <label>
                  <input
                    type="radio"
                    value="new"
                    checked={formData.customerType === 'new'}
                    onChange={(e) => setFormData({...formData, customerType: e.target.value})}
                  />
                  New Customer
                </label>
              </div>

              {formData.customerType === 'existing' ? (
                <select
                  value={formData.customer_id}
                  onChange={(e) => {
                    setFormData({...formData, customer_id: e.target.value});
                    loadCustomerBalance(e.target.value);
                  }}
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.phone || 'N/A'}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={formData.newCustomer.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      newCustomer: {...formData.newCustomer, name: e.target.value}
                    })}
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number (optional)"
                    value={formData.newCustomer.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      newCustomer: {...formData.newCustomer, phone: e.target.value}
                    })}
                  />
                  <textarea
                    placeholder="Notes (optional)"
                    value={formData.newCustomer.notes}
                    onChange={(e) => setFormData({
                      ...formData,
                      newCustomer: {...formData.newCustomer, notes: e.target.value}
                    })}
                  />
                </>
              )}
            </div>

            <div className="form-section">
              <h4>Transaction Details</h4>
              <label>Transaction Type:</label>
              <select
                value={formData.transaction_type}
                onChange={(e) => setFormData({...formData, transaction_type: e.target.value, payment_method: e.target.value === 'credit' ? 'cash' : formData.payment_method})}
              >
                <option value="debit">New Sale/Purchase</option>
                <option value="credit">Customer Payment (Pay Off Debt)</option>
              </select>

              {formData.transaction_type === 'credit' && selectedCustomerBalance && (
                <div style={{
                  padding: '12px',
                  backgroundColor: selectedCustomerBalance.current_balance > 0 ? '#fff5f5' : '#f0fdf4',
                  borderLeft: `4px solid ${selectedCustomerBalance.current_balance > 0 ? '#e53e3e' : '#38a169'}`,
                  marginBottom: '10px',
                  borderRadius: '4px'
                }}>
                  <strong>Current Outstanding Balance: </strong>
                  <span style={{ color: selectedCustomerBalance.current_balance > 0 ? '#e53e3e' : '#38a169', fontWeight: '700' }}>
                    {parseFloat(selectedCustomerBalance.current_balance || 0).toFixed(2)} PKR
                  </span>
                  {selectedCustomerBalance.current_balance > 0 && (
                    <button
                      type="button"
                      style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => setFormData({...formData, amount: selectedCustomerBalance.current_balance})}
                    >
                      Pay Full Amount
                    </button>
                  )}
                </div>
              )}

              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
              />

              <label>Payment Method:</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
              >
                <option value="cash">Cash (Paid)</option>
                <option value="card">Card (Paid)</option>
                {formData.transaction_type === 'debit' && (
                  <option value="udhaar">On Credit (Udhaar - Creates Debt)</option>
                )}
                <option value="bank_transfer">Bank Transfer (Paid)</option>
              </select>

              {formData.transaction_type === 'debit' && (
                <textarea
                  placeholder="Items Purchased"
                  value={formData.store_items}
                  onChange={(e) => setFormData({...formData, store_items: e.target.value})}
                />
              )}

              <input
                type="text"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <button type="submit" className="btn-primary">Add Transaction</button>
          </form>
        </div>
      )}

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by customer name, phone, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedRows.length === transactions.length && transactions.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(t.id)}
                    onChange={() => handleSelectRow(t.id)}
                  />
                </td>
                <td>{new Date(t.created_at).toLocaleString()}</td>
                <td>
                  <div className="customer-cell">
                    <strong>{t.customer_name}</strong>
                    <small>{t.customer_phone || 'N/A'}</small>
                  </div>
                </td>
                <td>{t.store_items || t.description || '-'}</td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: t.payment_method === 'udhaar' ? '#fed7d7' : '#c6f6d5',
                    color: t.payment_method === 'udhaar' ? '#c53030' : '#276749'
                  }}>
                    {t.payment_method === 'udhaar' ? 'Debt/Udhaar' : (t.transaction_type === 'credit' ? 'Payment' : 'Paid')}
                  </span>
                </td>
                <td style={{
                  fontWeight: '700',
                  fontSize: '16px',
                  color: t.payment_method === 'udhaar' ? '#e53e3e' : '#38a169'
                }}>
                  {parseFloat(t.amount).toFixed(2)} PKR
                </td>
                <td><span className="payment-method">{t.payment_method}</span></td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon edit" onClick={() => handleEditClick(t)} title="Edit">✏️</button>
                    <button className="btn-icon delete" onClick={() => handleDeleteClick(t)} title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </button>
        <span>Page {page} of {Math.ceil(total / limit)}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / limit)}>
          Next
        </button>
      </div>

      {showDeleteDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>Confirm Delete</h3>
            <p>What would you like to delete?</p>
            <div className="dialog-actions">
              <button className="btn-danger" onClick={() => confirmDelete('transaction')}>
                Delete Transaction{deleteTarget.type === 'bulk' ? 's' : ''} Only
              </button>
              <button className="btn-danger" onClick={() => confirmDelete('customer')}>
                Delete Customer + All Transactions
              </button>
              <button className="btn-secondary" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditDialog && editTransaction && (
        <div className="dialog-overlay">
          <div className="dialog edit-dialog">
            <h3>Edit Transaction</h3>
            <form onSubmit={handleEditSubmit}>
              <label>
                Transaction Type:
                <select
                  value={editTransaction.transaction_type}
                  onChange={(e) => setEditTransaction({...editTransaction, transaction_type: e.target.value})}
                >
                  <option value="debit">New Sale/Purchase</option>
                  <option value="credit">Customer Payment (Pay Off Debt)</option>
                </select>
              </label>

              <label>
                Amount:
                <input
                  type="number"
                  step="0.01"
                  value={editTransaction.amount}
                  onChange={(e) => setEditTransaction({...editTransaction, amount: e.target.value})}
                  required
                />
              </label>

              <label>
                Payment Method:
                <select
                  value={editTransaction.payment_method}
                  onChange={(e) => setEditTransaction({...editTransaction, payment_method: e.target.value})}
                >
                  <option value="cash">Cash (Paid)</option>
                  <option value="card">Card (Paid)</option>
                  <option value="udhaar">On Credit (Udhaar - Creates Debt)</option>
                  <option value="bank_transfer">Bank Transfer (Paid)</option>
                </select>
              </label>

              <label>
                Items:
                <textarea
                  value={editTransaction.store_items || ''}
                  onChange={(e) => setEditTransaction({...editTransaction, store_items: e.target.value})}
                />
              </label>

              <label>
                Description:
                <input
                  type="text"
                  value={editTransaction.description || ''}
                  onChange={(e) => setEditTransaction({...editTransaction, description: e.target.value})}
                />
              </label>

              <div className="dialog-actions">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GeneralStore;
