import { Link } from "react-router-dom";
import React, { useState } from 'react';
import styles from "./Login.module.css";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import viewIcon from '../../assets/auth/view.png';
import hideIcon from '../../assets/auth/hide.png';
import loginimg from "../../assets/auth/loginimg.png";
import loginlogo from "../../assets/auth/loginlogo.png";

function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (!email || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Handle specific error messages based on status code and error content
                if (res.status === 400) {
                    if (data.error && data.error.toLowerCase().includes('user not found')) {
                        toast.error("User not found. Please check your email or sign up.");
                    } else if (data.error && data.error.toLowerCase().includes('invalid credentials')) {
                        toast.error("Incorrect password. Please try again.");
                    } else {
                        toast.error(data.error || "Login failed. Please check your credentials.");
                    }
                } else if (res.status === 404) {
                    toast.error("User not found. Please check your email or sign up.");
                } else {
                    toast.error(data.error || "Login failed. Please try again.");
                }
                setLoading(false);
            } else {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                toast.success("Login successful! Redirecting...", {
                    onClose: () => navigate('/dashboard'),
                    autoClose: 2000
                });
            }
        } catch (error) {
            console.error("Login error:", error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                toast.error("Unable to connect to server. Please check your internet connection.");
            } else {
                toast.error("Something went wrong. Please try again later.");
            }
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Left Panel - Login Form */}
            <div className={styles.leftPanel}>
                <div className={styles.loginCard}>
                    <h2 className={styles.title}>Log in to your account</h2>
                    <p className={styles.subtitle}>
                        Welcome back! Please enter your details.
                    </p>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Email</label>
                            <input
                                type="email"
                                placeholder="Example@email.com"
                                className={styles.input}
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Password</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="enter your password"
                                    className={styles.input}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <span
                                    className={styles.eyeIcon}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <img 
                                        src={showPassword ? hideIcon : viewIcon} 
                                        alt={showPassword ? 'Hide password' : 'Show password'} 
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                    />
                                </span>
                            </div>
                        </div>

                        <div className={styles.forgotPassword}>
                            <Link to="/forgot-password" className={styles.forgotPasswordLink}>
                                Forgot Password?
                            </Link>
                        </div>

                        <button type="submit" className={styles.signInButton} disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    <p className={styles.footerText}>
                        Don't you have an account?{" "}
                        <Link to="/signup" className={styles.signUpLink}>
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Panel - Welcome Section */}
            <div className={styles.rightPanel}>
                <div className={styles.logoSection}>
                    {/* Placeholder for company logo */}
                    <div className={styles.logoPlaceholder}>
                        <img src={loginlogo} alt="Company Logo" />
                        <div className={styles.chartIcon}></div>
                    </div>
                </div>

                <div className={styles.welcomeContent}>
                    <h1 className={styles.welcomeTitle}>
                        Welcome to<br />
                        Zipkart
                    </h1>
                    
                    <div className={styles.illustrationContainer}>
                        {/* Placeholder for your business illustration */}
                        <div className={styles.illustrationPlaceholder}>
                            <img src={loginimg} alt="Login Illustration" />
                        </div>
                    </div>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={2000} />
        </div>
    );
}

export default Login;