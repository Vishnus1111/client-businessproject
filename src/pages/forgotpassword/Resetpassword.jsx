import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './Resetpassword.module.css';
import API_BASE_URL from '../config';
import viewIcon from '../../assets/auth/view.png';
import hideIcon from '../../assets/auth/hide.png';
import newPswdImg from "../../assets/auth/newpswd.png";

function Resetpassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || localStorage.getItem('resetEmail');

  useEffect(() => {
    if (!email) {
      toast.error('Invalid access. Please start the password reset process again.');
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  // Enhanced password validation function
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push("at least 8 characters");
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("at least one lowercase letter (a-z)");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("at least one uppercase letter (A-Z)");
    }
    
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)) {
      errors.push("at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)");
    }
    
    return errors;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    // Enhanced password validation
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      toast.error(`Password must contain: ${passwordErrors.join(', ')}`, {
        autoClose: 5000
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        toast.success('Password reset successfully!', {
          onClose: () => {
            localStorage.removeItem('resetEmail');
            navigate('/login');
          },
          autoClose: 2000
        });
      } else {
        toast.error(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setLoading(false);
      toast.error('Server error. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Panel - Reset Password Form */}
      <div className={styles.leftPanel}>
        <div className={styles.loginCard}>
          <h2 className={styles.title}>Create New Password</h2>
          <p className={styles.subtitle}>
            Today is a new day. It's your day. You shape it.<br />
            Sign in to start managing your projects.
          </p>

          <form className={styles.form} onSubmit={handleResetPassword}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Enter New Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="8+ chars, A-Z, a-z, special char"
                  className={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <span
                  className={styles.eyeIcon}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  <img 
                    src={showNewPassword ? hideIcon : viewIcon} 
                    alt={showNewPassword ? 'Hide password' : 'Show password'} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </span>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Confirm Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="confirm your new password"
                  className={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span
                  className={styles.eyeIcon}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <img 
                    src={showConfirmPassword ? hideIcon : viewIcon} 
                    alt={showConfirmPassword ? 'Hide password' : 'Show password'} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </span>
              </div>
            </div>

            <div className={styles.forgotPassword}>
              <span 
                className={styles.forgotPasswordLink}
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </span>
            </div>

            <button type="submit" className={styles.signInButton} disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel - Welcome Section */}
      <div className={styles.rightPanel}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle}>
            Create New<br />
            Password
          </h1>
          
          <div className={styles.illustrationContainer}>
            <div className={styles.illustrationPlaceholder}>
              <img src={newPswdImg} alt="Reset Password Illustration" />
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default Resetpassword;
