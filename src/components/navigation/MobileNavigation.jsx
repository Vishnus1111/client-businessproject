import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './MobileNavigation.module.css';
import home from "../../assets/mobile/desktophome.png"
import product from "../../assets/mobile/products.png"
import invoice from "../../assets/mobile/invoice.png"  
import statistics from '../../assets/mobile/statistics.png';

const MobileNavigation = () => {
  const location = useLocation();
  
  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/dashboard',
      icon: <img src={home} alt="Home" className={styles.iconImage} />
    },
    {
      id: 'product',
      label: 'Product',
      path: '/dashboard/product',
      icon: <img src={product} alt="Product" className={styles.iconImage} />
    },
    {
      id: 'invoice',
      label: 'Invoice',
      path: '/dashboard/invoice',
      icon: <img src={invoice} alt="Invoice" className={styles.iconImage} />
    },
    {
      id: 'statistics',
      label: 'Statistics',
      path: '/dashboard/statistics',
      icon: <img src={statistics} alt="Statistics" className={styles.iconImage} />
    }
    // Settings removed from bottom navigation
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
