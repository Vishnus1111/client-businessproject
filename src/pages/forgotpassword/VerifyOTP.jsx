import React, { useState, useEffect } from "react";
import styles from "./Resetpassword.module.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from '../config';

function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  
  useEffect(() => {
    // Get email from local storage
    const storedEmail = localStorage.getItem("resetEmail");
    if (!storedEmail) {
      // Redirect to forgot password if email is not found
      navigate("/forgot-password");
      return;
    }
    setEmail(storedEmail);
  }, [navigate]);

  // Handle Verify OTP
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
        toast.success("OTP verified successfully");
        navigate("/reset-password");
      } else {
        toast.error(data.error || data.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      setLoading(false);
      console.error("Error verifying OTP:", err);
      toast.error("Server error. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Enter Your OTP</h1>
        <p className={styles.subtitle}>
          We've sent a 6-digit OTP to your registered mail.
          <br />Please enter it below to sign in.
        </p>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>OTP</label>
            <input
              type="text"
              placeholder="xxxxxx"
              className={styles.input}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
            />
          </div>

          <button
            className={styles.confirmButton}
            onClick={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Confirm"}
          </button>
        </form>
      </div>
      
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default VerifyOTP;
