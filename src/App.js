import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login/Login';
import Signup from './pages/signup/Signup';
import Forgotpassword from './pages/forgotpassword/Forgotpassword';
import Resetpassword from './pages/forgotpassword/Resetpassword';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>          
          {/* Authentication routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<Forgotpassword  />} />
          <Route path="/reset-password" element={<Resetpassword />} />
          
          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
