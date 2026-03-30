import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

const loadCustomerData = async () => {
  try {
    const res = await api.get(`/customers/${id}`);
    // backend returns { customer: ..., transactions: [...] }
    setCustomer(res.data.customer);
    // Filter out auto-payment transactions from display
    const filteredTransactions = (res.data.transactions || []).filter(
      t => !t.description?.includes('Auto-payment for')
    );
    setTransactions(filteredTransactions);
  } catch (err) {
    console.error('Error loading customer:', err);
  } finally {
    setLoading(false);
  }
};

const formatBalance = (balance) => {
    const balanceNum = parseFloat(balance || 0);
    const amount = Math.abs(balanceNum).toFixed(2);
    
    if (balanceNum === 0) {
      return { text: 'Settled', amount: '0.00 PKR', class: 'balance-settled', label: 'Account Status' };
    } else if (balanceNum > 0) {
      return { text: 'Outstanding', amount: `${amount} PKR`, class: 'balance-outstanding', label: 'Outstanding Balance' };
    } else {
      return { text: 'Credit Balance', amount: `${amount} PKR`, class: 'balance-credit', label: 'Credit Balance' };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getModuleIcon = (module) => {
    switch(module) {
      case 'general_store': return '🛒';
      case 'barber': return '✂️';
      case 'travel': return '✈️';
      default: return '📝';
    }
  };

  const getModuleName = (module) => {
    switch(module) {
      case 'general_store': return 'General Store';
      case 'barber': return 'Barber Shop';
      case 'travel': return 'Travel Agency';
      default: return module;
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading customer details...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container">
        <div className="card">
          <h3>Customer not found</h3>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const balance = formatBalance(customer.current_balance);
  const totalDebits = parseFloat(customer.total_debits || 0).toFixed(2);
  const totalCredits = parseFloat(customer.total_credits || 0).toFixed(2);

  return (
    <div className="container">
      <div className="header">
        <h1>Customer Details</h1>
        <button onClick={() => navigate('/customers')} className="logout-btn">
          ← Back to Customer Management
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div>
            <h2 style={{ color: '#2d3748', marginBottom: '10px' }}>{customer.name}</h2>
            <p style={{ color: '#718096', marginBottom: '5px' }}>
              <strong>Customer ID:</strong> {customer.customer_code}
            </p>
            <p style={{ color: '#718096', marginBottom: '5px' }}>
              <strong>Phone:</strong> {customer.phone || 'N/A'}
            </p>
            {customer.notes && (
              <p style={{ color: '#718096', marginTop: '10px' }}>
                <strong>Notes:</strong> {customer.notes}
              </p>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#718096', marginBottom: '10px', fontSize: '14px' }}>{balance.label}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
              <span className={`status-badge ${balance.class}`} style={{ fontSize: '14px', fontWeight: '600', padding: '6px 12px', borderRadius: '6px' }}>
                {balance.text}
              </span>
              <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#2d3748', margin: '0' }}>
                {balance.amount}
              </h1>
            </div>
            <p style={{ color: '#718096', fontSize: '14px', marginTop: '10px' }}>
              Total Purchases: {totalDebits} PKR
            </p>
            <p style={{ color: '#718096', fontSize: '14px' }}>
              Total Payments: {totalCredits} PKR
            </p>
          </div>
        </div>

        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

        <h3 style={{ color: '#2d3748', marginBottom: '20px' }}>Transaction History</h3>

        {transactions.length === 0 ? (
          <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>
            No transactions yet
          </p>
        ) : (
          <div className="transaction-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div>
                  <p style={{ fontWeight: '600', marginBottom: '5px' }}>
                    {getModuleIcon(transaction.module)} {getModuleName(transaction.module)}
                  </p>
                  <p className="transaction-date">{formatDate(transaction.created_at)}</p>
                  {transaction.description && (
                    <p style={{ color: '#718096', fontSize: '14px', marginTop: '5px' }}>
                      {transaction.description}
                    </p>
                  )}
                  {transaction.store_items && (
                    <p style={{ color: '#4299e1', fontSize: '14px', marginTop: '5px' }}>
                      Items: {transaction.store_items}
                    </p>
                  )}
                  {transaction.barber_service && (
                    <p style={{ color: '#4299e1', fontSize: '14px', marginTop: '5px' }}>
                      Service: {transaction.barber_service}
                      {transaction.barber_staff && ` • Staff: ${transaction.barber_staff}`}
                    </p>
                  )}
                  {transaction.travel_airline && (
                    <p style={{ color: '#4299e1', fontSize: '14px', marginTop: '5px' }}>
                      {transaction.travel_airline} • PNR: {transaction.travel_pnr}
                      {transaction.travel_date && ` • Travel: ${new Date(transaction.travel_date).toLocaleDateString()}`}
                    </p>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: transaction.payment_method === 'udhaar' ? '#e53e3e' : '#38a169',
                    marginBottom: '5px'
                  }}>
                    {transaction.payment_method === 'udhaar' ? '📤 Debt/Udhaar' : (transaction.transaction_type === 'credit' ? '📥 Payment' : '📥 Paid')}
                  </p>
                  <p style={{ 
                    fontWeight: '700',
                    fontSize: '18px',
                    color: transaction.payment_method === 'udhaar' ? '#e53e3e' : '#38a169'
                  }}>
                    {parseFloat(transaction.amount).toFixed(2)} PKR
                  </p>
                  <p style={{ color: '#718096', fontSize: '12px', marginTop: '5px', textTransform: 'capitalize' }}>
                    {transaction.payment_method}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#718096', fontSize: '14px' }}>Running Balance</p>
                  <p style={{ fontWeight: '600', fontSize: '16px' }}>
                    {parseFloat(transaction.running_balance || 0).toFixed(2)} PKR
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerDetails;