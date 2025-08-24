import React, { useState } from 'react';
import styles from './Settings.module.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    language: 'en',
    currency: 'INR'
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Settings</h1>
      </div>
      
      <div className={styles.content}>
        <div className={styles.settingsGrid}>
          {/* Account Settings */}
          <div className={styles.settingCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>👤</div>
              <h3>Account Settings</h3>
            </div>
            <div className={styles.settingItem}>
              <label>Email Notifications</label>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              />
            </div>
            <div className={styles.settingItem}>
              <label>Language</label>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
          </div>

          {/* Appearance */}
          <div className={styles.settingCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>🎨</div>
              <h3>Appearance</h3>
            </div>
            <div className={styles.settingItem}>
              <label>Dark Mode</label>
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
              />
            </div>
          </div>

          {/* Business Settings */}
          <div className={styles.settingCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>💼</div>
              <h3>Business Settings</h3>
            </div>
            <div className={styles.settingItem}>
              <label>Default Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => handleSettingChange('currency', e.target.value)}
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
          </div>

          {/* Security */}
          <div className={styles.settingCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>🔒</div>
              <h3>Security</h3>
            </div>
            <div className={styles.settingItem}>
              <button className={styles.actionButton}>Change Password</button>
            </div>
            <div className={styles.settingItem}>
              <button className={styles.actionButton}>Two-Factor Authentication</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
