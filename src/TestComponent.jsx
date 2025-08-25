// This file is used to test imports and exports of components
import React from 'react';
import Login from './pages/login/Login';
import Signup from './pages/signup/Signup';
import Forgotpassword from './pages/forgotpassword/Forgotpassword';
import Resetpassword from './pages/forgotpassword/Resetpassword';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Home from './pages/dashboard/Home';
import Product from './pages/product/Product';
import Invoice from './pages/invoice/Invoice';
import Statistics from './pages/statistics/Statistics';
import Settings from './pages/settings/Settings';
import ProtectedRoute from './components/auth/ProtectedRoute';
import API_BASE_URL from './pages/config';

// Test if all components are properly exported
console.log({
  Login,
  Signup,
  Forgotpassword,
  Resetpassword,
  DashboardLayout,
  Home,
  Product,
  Invoice,
  Statistics,
  Settings,
  ProtectedRoute,
  API_BASE_URL
});

// This is just a test component, not used in production
const TestComponent = () => {
  return (
    <div>
      <h1>Test Component</h1>
    </div>
  );
};

export default TestComponent;
