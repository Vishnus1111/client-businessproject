import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import components one by one to identify any problematic imports
import Login from './pages/login/Login';
import Signup from './pages/signup/Signup';
import Forgotpassword from './pages/forgotpassword/Forgotpassword';
import VerifyOTP from './pages/forgotpassword/VerifyOTP';
import Resetpassword from './pages/forgotpassword/Resetpassword';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Home from './pages/dashboard/Home';
import Product from './pages/product/Product';
// Re-created Invoice component
import Invoice from './pages/invoice/Invoice';
import Statistics from './pages/statistics/Statistics.jsx';
import Settings from './pages/settings/Settings';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>          
          {/* Authentication routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<Forgotpassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/reset-password" element={<Resetpassword />} />
          
          {/* Protected Dashboard routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Home />} />
            <Route path="product" element={<Product />} />
            <Route path="invoice" element={<Invoice />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;