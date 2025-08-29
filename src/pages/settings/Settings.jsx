import React, { useState, useEffect } from 'react';
import styles from './Settings.module.css';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Track which fields are in edit mode
  const [editableFields, setEditableFields] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Fetch user profile when component mounts
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('You are not logged in');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Split the name into first and last name
          const nameParts = userData.name.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          setFormData({
            firstName: firstName,
            lastName: lastName,
            email: userData.email,
            password: '',
            confirmPassword: ''
          });
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || 'Failed to load profile');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Toggle field editability on double click
  const handleDoubleClick = (field) => {
    setEditableFields(prev => ({
      ...prev,
      [field]: true
    }));
  };

  // Handle input change for form fields
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  // Handle input blur to exit edit mode
  const handleBlur = (field) => {
    setEditableFields(prev => ({
      ...prev,
      [field]: false
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You are not logged in');
        return;
      }

      // Combine first and last name
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();

      const updateData = {
        name: fullName,
        email: formData.email,
      };

      // Only include password if it was changed
      if (formData.password) {
        updateData.newPassword = formData.password;
        // For a real implementation, you would need the current password as well
        // This is just a placeholder
        updateData.currentPassword = formData.password; 
      }

      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Get the response data to use the API's returned values
        const responseData = await response.json();
        
        // Update localStorage with the new user data from the API
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        // Use the user data returned from API if available, otherwise use what we sent
        const updatedUser = { 
          ...currentUser, 
          name: responseData.user?.name || fullName,
          email: responseData.user?.email || formData.email
        };
        
        // Update localStorage with new user info
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Dispatch custom event to notify other components of user data change
        const userUpdateEvent = new CustomEvent('userDataChanged', {
          detail: { user: updatedUser }
        });
        window.dispatchEvent(userUpdateEvent);
        
        toast.success('Profile updated successfully');
        // Reset password fields
        setFormData({
          ...formData,
          password: '',
          confirmPassword: ''
        });
      } else {
        const errorData = await response.json();
        if (errorData.error === "Email already in use") {
          toast.error('Email already exists. Please use a different email.');
        } else {
          toast.error(errorData.error || 'Failed to update profile');
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Settings</h1>
      </div>
      
      <div className={`${styles.content} ${isMobile ? styles.mobileContent : ''}`}>
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${styles.activeTab}`}
          >
            Edit Profile
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <p>Loading...</p>
          </div>
        ) : (
          <form className={styles.profileForm} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName">First name</label>
              {editableFields.firstName ? (
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  onBlur={() => handleBlur('firstName')}
                  autoFocus
                  required
                />
              ) : (
                <div 
                  className={styles.readOnlyField}
                  onDoubleClick={() => handleDoubleClick('firstName')}
                >
                  {formData.firstName || 'Double click to edit'}
                </div>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="lastName">Last name</label>
              {editableFields.lastName ? (
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  onBlur={() => handleBlur('lastName')}
                  autoFocus
                  required
                />
              ) : (
                <div 
                  className={styles.readOnlyField}
                  onDoubleClick={() => handleDoubleClick('lastName')}
                >
                  {formData.lastName || 'Double click to edit'}
                </div>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              {editableFields.email ? (
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  onBlur={() => handleBlur('email')}
                  autoFocus
                  required
                />
              ) : (
                <div 
                  className={styles.readOnlyField}
                  onDoubleClick={() => handleDoubleClick('email')}
                >
                  {formData.email || 'Double click to edit'}
                </div>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              {editableFields.password ? (
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  onBlur={() => handleBlur('password')}
                  autoFocus
                  placeholder="Enter new password"
                />
              ) : (
                <div 
                  className={styles.readOnlyField}
                  onDoubleClick={() => handleDoubleClick('password')}
                >
                  **********
                </div>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              {editableFields.confirmPassword || editableFields.password ? (
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="Confirm new password"
                />
              ) : (
                <div 
                  className={styles.readOnlyField}
                  onDoubleClick={() => handleDoubleClick('confirmPassword')}
                >
                  **********
                </div>
              )}
            </div>
            
            <button type="submit" className={styles.saveButton}>
              Save
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Settings;
