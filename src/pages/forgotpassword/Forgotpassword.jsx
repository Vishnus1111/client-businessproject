import React, { useState } from "react";
import styles from "./ForgotPassword.module.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from '../config';
import loginimg from "../../assets/auth/forgotpswdmail.png";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle Send Mail
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
        localStorage.setItem("resetEmail", email); 
        navigate("/verify-otp");
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

  return (
    <div className={styles.container}>
      {/* Left Panel - Forgot Password Form */}
      <div className={styles.leftPanel}>
        <div className={styles.formCard}>
          <h1 className={styles.title}>Zipkart</h1>
          <p className={styles.subtitle}>
            Please enter your registered email ID <br></br> to receive an OTP
          </p>

          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>E-mail</label>
              <input
                type="email"
                placeholder="Enter your registered email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              className={styles.sendButton}
              onClick={handleSendMail}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Mail"}
            </button>
          </form>
        </div>
      </div>
      
      {/* Right Panel - Image Section */}
      <div className={styles.rightPanel}>
        <div className={styles.illustrationContainer}>
          <div className={styles.illustrationPlaceholder}>
            <img src={loginimg} alt="Forgot Password Illustration" />
          </div>
        </div>
      </div>
      
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default ForgotPassword;
