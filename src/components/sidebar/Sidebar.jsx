import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import logo from "../../assets/dashboard/logo.png"

const Sidebar = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userName, setUserName] = useState('User');
  
  // Load user name from localStorage and update when it changes
  useEffect(() => {
    // Initial load of user name
    const loadUserName = () => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUserName(user.name || 'User');
    };
    
    // Load initially
    loadUserName();
    
    // Listen for user data change events
    const handleUserDataChange = (event) => {
      const updatedUser = event.detail.user;
      setUserName(updatedUser.name || 'User');
    };
    
    // Listen for custom events
    window.addEventListener('userDataChanged', handleUserDataChange);
    
    // Set up interval to check for changes in localStorage every second
    const checkInterval = setInterval(() => {
      loadUserName();
    }, 1000);
    
    // Clean up
    return () => {
      window.removeEventListener('userDataChanged', handleUserDataChange);
      clearInterval(checkInterval);
    };
  }, []);

  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/dashboard',
      icon: <img src={require("../../assets/mobile/desktophome.png")} alt="Home" />
    },
    {
      id: 'product',
      label: 'Product',
      path: '/dashboard/product',
      icon: <img src={require("../../assets/mobile/desktopproducts.png")} alt="Product" />
    },
    {
      id: 'invoice',
      label: 'Invoice',
      path: '/dashboard/invoice',
      icon: <img src={require("../../assets/mobile/desktopinvoice.png")} alt="Invoice" />
    },
    {
      id: 'statistics',
      label: 'Statistics',
      path: '/dashboard/statistics',
      icon: <img src={require("../../assets/mobile/desktopstatistics.png")} alt="Statistics" />
    },
    {
      id: 'settings',
      label: 'Setting',
      path: '/dashboard/settings',
      icon: <img src={require("../../assets/mobile/Setting.png")} alt="Settings" />
    }
  ];

  // Helper function to check if a route is active
  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* Logo Section */}
      <div className={styles.logoSection}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}><img src={logo} alt="Logo" /></div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className={styles.navigation}>
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`${styles.menuItem} ${isActive(item.path) ? styles.active : ''}`}
          >
            <span className={styles.menuIcon}>{item.icon}</span>
            {!isCollapsed && <span className={styles.menuLabel}>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User Section */}
      <div className={styles.userSection}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}></div>
          {!isCollapsed && (
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {userName}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
