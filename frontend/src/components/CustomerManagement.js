import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './ModuleStyles.css';

function CustomerManagement() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  const limit = 20;

  useEffect(() => {
    loadCustomers();
  }, [page, searchTerm]);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers', {
        params: { page, limit, search: searchTerm }
      });
      setCustomers(response.data.customers || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      setMessage('Error loading customers');
      setCustomers([]);
      setTotal(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCustomer) {
        await api.put(`/customers/${editCustomer.id}`, formData);
        setMessage('Customer updated successfully!');
      } else {
        await api.post('/customers', formData);
        setMessage('Customer added successfully!');
      }
      
      setShowForm(false);
      setEditCustomer(null);
      resetForm();
      loadCustomers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.error || 'Operation failed'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      notes: ''
    });
  };

  const handleEdit = (customer) => {
    setEditCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (customer) => {
    if (window.confirm(`Delete ${customer.name} and all their transactions?`)) {
      try {
        await api.delete(`/customers/${customer.id}`);
        setMessage('Customer deleted successfully!');
        loadCustomers();
        setTimeout(() => setMessage(''), 3000);
      } catch (err) {
        setMessage('Error: ' + (err.response?.data?.error || 'Delete failed'));
      }
    }
  };

  const handleViewDetails = (customer) => {
    navigate(`/customer/${customer.id}`);
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Customer Management</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            ← Back to Dashboard
          </button>
          <button className="btn-primary" onClick={() => {
            setShowForm(!showForm);
            setEditCustomer(null);
            resetForm();
          }}>
            {showForm ? 'Cancel' : '+ Add Customer'}
          </button>
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      {showForm && (
        <div className="form-card">
          <h3>{editCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Customer Name *"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />

            <input
              type="tel"
              placeholder="Phone Number (optional)"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />

            <textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="3"
            />

            <button type="submit" className="btn-primary">
              {editCustomer ? 'Update Customer' : 'Add Customer'}
            </button>
          </form>
        </div>
      )}

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone</th>
              <th>Service Areas</th>
              <th>Current Balance</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers && customers.length > 0 ? (
              customers.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.phone || 'N/A'}</td>
                  <td>
                    {c.modules ? (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {c.modules.split(',').map(m => (
                          <span key={m} style={{ 
                            fontSize: '20px',
                            title: m === 'general_store' ? 'General Store' : m === 'barber' ? 'Barber' : 'Travel'
                          }}>
                            {m === 'general_store' ? '🛒' : m === 'barber' ? '✂️' : m === 'travel' ? '✈️' : ''}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{
                    fontWeight: '700',
                    fontSize: '16px',
                    color: parseFloat(c.current_balance || 0) > 0 ? '#e53e3e' : 
                           parseFloat(c.current_balance || 0) < 0 ? '#38a169' : '#718096'
                  }}>
                    {parseFloat(c.current_balance || 0).toFixed(2)} PKR
                  </td>
                  <td>{c.notes || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon edit" 
                        onClick={() => handleViewDetails(c)} 
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button 
                        className="btn-icon edit" 
                        onClick={() => handleEdit(c)} 
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon delete" 
                        onClick={() => handleDelete(c)} 
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                  {searchTerm ? 'No customers found matching your search' : 'No customers yet. Click "+ Add Customer" to get started!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </button>
          <span>Page {page} of {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / limit)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default CustomerManagement;
