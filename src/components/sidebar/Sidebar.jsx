import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './Sidebar.module.css';
import logo from "../../assets/dashboard/logo.png"

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/dashboard',
      icon: '🏠'
    },
    {
      id: 'product',
      label: 'Product',
      path: '/dashboard/product',
      icon: '📦'
    },
    {
      id: 'invoice',
      label: 'Invoice',
      path: '/dashboard/invoice',
      icon: '📄'
    },
    {
      id: 'statistics',
      label: 'Statistics',
      path: '/dashboard/statistics',
      icon: '📊'
    },
    {
      id: 'settings',
      label: 'Setting',
      path: '/dashboard/settings',
      icon: '⚙️'
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('resetEmail');
    toast.success('Logged out successfully');
    navigate('/login');
  };

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
          <div className={styles.avatar}>👤</div>
          {!isCollapsed && (
            <div className={styles.userDetails}>
              <div className={styles.userName}>
                {JSON.parse(localStorage.getItem('user') || '{}').email?.split('@')[0] || 'User'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
