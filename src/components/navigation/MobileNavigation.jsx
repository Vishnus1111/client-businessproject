import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './MobileNavigation.module.css';

const MobileNavigation = () => {
  const location = useLocation();
  
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
      label: 'Settings',
      path: '/dashboard/settings',
      icon: '⚙️'
    }
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={styles.mobileNavigation}>
      {menuItems.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
        >
          <span className={styles.navIcon}>{item.icon}</span>
          <span className={styles.navLabel}>{item.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default MobileNavigation;
