import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/sidebar/Sidebar';
import MobileNavigation from '../../components/navigation/MobileNavigation';
import styles from './DashboardLayout.module.css';

const DashboardLayout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      {!isMobile && <Sidebar />}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          <Outlet />
        </div>
      </div>
      {isMobile && <MobileNavigation />}
    </div>
  );
};

export default DashboardLayout;
