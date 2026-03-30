import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './ModuleStyles.css';

function Reports() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [filters, setFilters] = useState({
    module: 'all',
    customer_id: 'all',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error('Error loading customers:', err);
      setCustomers([]);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    setMessage('');

    try {
      const params = {};
      if (filters.module !== 'all') params.module = filters.module;
      if (filters.customer_id !== 'all') params.customer_id = filters.customer_id;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await api.get('/transactions/reports/transactions', { params });
      const data = response.data.transactions || [];

      setTransactions(data);
      setMessage(data.length === 0 ? 'No transactions found for selected filters' : '');
    } catch (err) {
      setMessage('Error loading transactions: ' + (err.response?.data?.error || err.message));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const summary = {
      totalDebits: 0,
      totalCredits: 0,
      netBalance: 0,
      transactionCount: transactions.length
    };

    transactions.forEach(t => {
      if (t.transaction_type === 'debit') {
        summary.totalDebits += parseFloat(t.amount);
      } else {
        summary.totalCredits += parseFloat(t.amount);
      }
    });

    summary.netBalance = summary.totalDebits - summary.totalCredits;
    return summary;
  };

  const downloadCSV = () => {
    if (transactions.length === 0) {
      setMessage('No data to export');
      return;
    }

    const headers = [
      'Date',
      'Module',
      'Customer Name',
      'Customer Phone',
      'Type',
      'Amount',
      'Payment Method',
      'Description',
      'Balance'
    ];

    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.module,
      t.customer_name,
      t.customer_phone,
      t.transaction_type,
      t.amount,
      t.payment_method,
      t.description || '-',
      t.current_balance || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setMessage('Report downloaded successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleQuickReport = (type) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    switch (type) {
      case 'today':
        setFilters({
          ...filters,
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        });
        break;
      case 'month':
        setFilters({
          ...filters,
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        });
        break;
      case 'store':
        setFilters({ ...filters, module: 'general_store' });
        break;
      case 'barber':
        setFilters({ ...filters, module: 'barber' });
        break;
      case 'travel':
        setFilters({ ...filters, module: 'travel' });
        break;
      default:
        break;
    }
  };

  const summary = calculateSummary();

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Reports & Analytics</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="form-card">
        <h3>Filter Reports</h3>

        <div className="form-section">
          <label>Module:</label>
          <select
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
          >
            <option value="all">All Modules</option>
            <option value="general_store">General Store</option>
            <option value="barber">Barber Shop</option>
            <option value="travel">Travel Agency</option>
          </select>

          <label>Customer:</label>
          <select
            value={filters.customer_id}
            onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
          >
            <option value="all">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.phone}
              </option>
            ))}
          </select>

          <label>Start Date:</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />

          <label>End Date:</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />

          <div className="header-actions">
            <button
              className="btn-primary"
              onClick={loadTransactions}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
            <button
              className="btn-secondary"
              onClick={downloadCSV}
              disabled={transactions.length === 0}
            >
              Download CSV
            </button>
          </div>
        </div>

        <div className="form-section">
          <h4>Quick Reports</h4>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => handleQuickReport('today')}>
              Today's Report
            </button>
            <button className="btn-secondary" onClick={() => handleQuickReport('month')}>
              This Month
            </button>
            <button className="btn-secondary" onClick={() => handleQuickReport('store')}>
              All Store
            </button>
            <button className="btn-secondary" onClick={() => handleQuickReport('barber')}>
              All Barber
            </button>
            <button className="btn-secondary" onClick={() => handleQuickReport('travel')}>
              All Travel
            </button>
          </div>
        </div>
      </div>

      {transactions.length > 0 && (
        <>
          <div className="form-card">
            <h3>Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <strong>Total Transactions:</strong>
                <div style={{ fontSize: '24px', color: '#3498db' }}>{summary.transactionCount}</div>
              </div>
              <div>
                <strong>Total Debits:</strong>
                <div style={{ fontSize: '24px', color: '#2e7d32' }}>
                  {summary.totalDebits.toFixed(2)} PKR
                </div>
              </div>
              <div>
                <strong>Total Credits:</strong>
                <div style={{ fontSize: '24px', color: '#e65100' }}>
                  {summary.totalCredits.toFixed(2)} PKR
                </div>
              </div>
              <div>
                <strong>Net Balance:</strong>
                <div style={{ fontSize: '24px', color: summary.netBalance >= 0 ? '#2e7d32' : '#c62828' }}>
                  {summary.netBalance.toFixed(2)} PKR
                </div>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Module</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.created_at).toLocaleString()}</td>
                    <td>
                      <span className="payment-method">
                        {t.module === 'general_store' ? 'Store' :
                         t.module === 'barber' ? 'Barber' : 'Travel'}
                      </span>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <strong>{t.customer_name}</strong>
                        <small>{t.customer_phone || 'N/A'}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${t.transaction_type}`}>
                        {t.transaction_type === 'debit' ? 'Debt' : 'Payment'}
                      </span>
                    </td>
                    <td className={`amount ${t.transaction_type}`}>
                      {t.transaction_type === 'debit' ? '+' : '-'}
                      {parseFloat(t.amount).toFixed(2)}
                    </td>
                    <td>
                      <span className="payment-method">{t.payment_method}</span>
                    </td>
                    <td>
                      <strong>{parseFloat(t.current_balance || 0).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {transactions.length === 0 && !loading && (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#7f8c8d', fontSize: '16px' }}>
            Select filters and click "Generate Report" to view transactions
          </p>
        </div>
      )}
    </div>
  );
}

export default Reports;
