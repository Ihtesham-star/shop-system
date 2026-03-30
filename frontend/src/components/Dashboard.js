import React from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Shop Management System</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '30px', color: '#2d3748' }}>Main Menu</h2>
        
        <div className="menu-grid">
          <div className="menu-item" onClick={() => navigate('/customers')}>
            <div className="menu-icon">👥</div>
            <h3>Customer Management</h3>
            <p>Add, edit, search customers</p>
          </div>

          <div className="menu-item" onClick={() => navigate('/general-store')}>
            <div className="menu-icon">🛒</div>
            <h3>General Store</h3>
            <p>Groceries & daily items transactions</p>
          </div>

          <div className="menu-item" onClick={() => navigate('/barber')}>
            <div className="menu-icon">✂️</div>
            <h3>Barber Shop</h3>
            <p>Haircut, shave & grooming services</p>
          </div>

          <div className="menu-item" onClick={() => navigate('/travel')}>
            <div className="menu-icon">✈️</div>
            <h3>Travel Agency</h3>
            <p>Ticket booking & travel services</p>
          </div>

          <div className="menu-item" onClick={() => navigate('/reports')}>
            <div className="menu-icon">📊</div>
            <h3>Reports</h3>
            <p>Daily summary & outstanding balances</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;