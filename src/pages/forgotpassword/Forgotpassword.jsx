import React, { useState } from "react";
import styles from "./ForgotPassword.module.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from '../config';
import viewIcon from '../../assets/auth/view.png';
import hideIcon from '../../assets/auth/hide.png';
import forgotPswdImg from "../../assets/auth/forgotpswdmail.png";
import otpImg from "../../assets/auth/otp.png";
import loginlogo from "../../assets/auth/loginlogo.png";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ✅ Send OTP
  const handleSendMail = async () => {
    if (loading) return;
    
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        toast.success("OTP sent successfully");
        localStorage.setItem("resetEmail", email); // ✅ Store email for reset password page
        setStep(2);
      } else {
        // Check if the error is related to email not being registered
        if (res.status === 400 && (data.error && data.error.toLowerCase().includes('not found'))) {
          toast.error("Email not registered. Please check your email or sign up.");
        } else {
          toast.error(data.error || data.message || "Error sending OTP");
        }
      }
    } catch (err) {
      setLoading(false);
      toast.error("Server error. Please try again.");
    }
  };

  // ✅ Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }

    if (otp.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        toast.success("OTP verified successfully!");
        navigate("/reset-password", { state: { email } }); // ✅ Pass email to reset page
      } else {
        toast.error(data.error || "Invalid or expired OTP");
      }
    } catch (err) {
      setLoading(false);
      toast.error("Server error. Please try again.");
    }
  };

  // ✅ Go back to email step
  const handleGoBack = () => {
    setStep(1);
    setOtp("");
    setShowOtp(false);
  };

  return (
    <div className={styles.container}>
      {/* Left Panel - Forgot Password Form */}
      <div className={styles.leftPanel}>
        <div className={styles.loginCard}>
          {step === 1 ? (
            <>
              <h2 className={styles.title}>Zipkart</h2>
              <p className={styles.subtitle}>
                Please enter your registered email ID to receive an OTP
              </p>

              <form className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    placeholder="Enter your registered email"
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className={styles.signInButton}
                  onClick={handleSendMail}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Mail"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className={styles.backButton} onClick={handleGoBack}>
                ← Back to Email
              </div>
              
              <h2 className={styles.title}>Enter Your OTP</h2>
              <p className={styles.subtitle}>
                We've sent a 6-digit OTP to your registered mail.<br />
                Please enter it below to sign in.
              </p>

              <form className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>OTP</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showOtp ? "text" : "password"}
                      placeholder="xxxxxx"
                      className={styles.input}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                    />
                    <span
                      className={styles.eyeIcon}
                      onClick={() => setShowOtp(!showOtp)}
                    >
                      <img 
                        src={showOtp ? hideIcon : viewIcon} 
                        alt={showOtp ? 'Hide OTP' : 'Show OTP'} 
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.signInButton}
                  onClick={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Confirm"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right Panel - Welcome Section */}
      <div className={styles.rightPanel}>
        <div className={styles.logoSection}>
          <div className={styles.logoPlaceholder}>
            <img src={loginlogo} alt="Company Logo" />
            <div className={styles.chartIcon}></div>
          </div>
        </div>

        <div className={styles.welcomeContent}>
          
          <div className={styles.illustrationContainer}>
            <div className={styles.illustrationPlaceholder}>
              <img 
                src={step === 1 ? forgotPswdImg : otpImg} 
                alt={step === 1 ? 'Forgot Password Illustration' : 'OTP Illustration'} 
              />
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
}

export default ForgotPassword;

