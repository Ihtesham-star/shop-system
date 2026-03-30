import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import GeneralStore from './components/GeneralStore';
import BarberShop from './components/BarberShop';
import TravelAgency from './components/TravelAgency';
import CustomerDetails from './components/CustomerDetails';
import Reports from './components/Reports';
import './App.css';

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  const PrivateRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <PrivateRoute>
              <CustomerManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/general-store"
          element={
            <PrivateRoute>
              <GeneralStore />
            </PrivateRoute>
          }
        />
        <Route
          path="/barber"
          element={
            <PrivateRoute>
              <BarberShop />
            </PrivateRoute>
          }
        />
        <Route
          path="/travel"
          element={
            <PrivateRoute>
              <TravelAgency />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/:id"
          element={
            <PrivateRoute>
              <CustomerDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Reports />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;