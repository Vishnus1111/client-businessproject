import { Link } from "react-router-dom";
import React, { useState } from 'react';
import styles from "./Signup.module.css";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import viewIcon from '../../assets/auth/view.png';
import hideIcon from '../../assets/auth/hide.png';
import loginimg from "../../assets/auth/loginimg.png";
import loginlogo from "../../assets/auth/loginlogo.png";

function Signup() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    
    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        
        const { name, email, password, confirmPassword } = formData;
        
        if (!name || !email || !password || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        // Enhanced password validation
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            toast.error(`Password must contain: ${passwordErrors.join(', ')}`, {
                autoClose: 5000
            });
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Registration failed");
                setLoading(false);
            } else {
                toast.success("Account created successfully! Please login.", {
                    onClose: () => navigate('/login'),
                    autoClose: 2000
                });
            }
        } catch (error) {
            toast.error("Server error");
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Left Panel - Signup Form */}
            <div className={styles.leftPanel}>
                <div className={styles.signupCard}>
                    <h2 className={styles.title}>Create an account</h2>
                    <p className={styles.subtitle}>
                        Start inventory management.
                    </p>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Name</label>
                            <input
                                type="text"
                                name="name"
                                placeholder="Name"
                                className={styles.input}
                                required
                                value={formData.name}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Email</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="Example@email.com"
                                className={styles.input}
                                required
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Create Password</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="8+ chars, A-Z, a-z, special char"
                                    className={styles.input}
                                    required
                                    value={formData.password}
                                    onChange={handleInputChange}
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

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Confirm Password</label>
                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    placeholder="confirm your password"
                                    className={styles.input}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
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

                        <button type="submit" className={styles.signUpButton} disabled={loading}>
                            {loading ? "Creating account..." : "Sign up"}
                        </button>
                    </form>

                    <p className={styles.footerText}>
                        Do you have an account?{" "}
                        <Link to="/login" className={styles.signInLink}>
                            Sign in
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

export default Signup;
