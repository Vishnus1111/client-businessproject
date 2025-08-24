import React from 'react';
import styles from './Statistics.module.css';

const Statistics = () => {
  return (
    <div className={styles.statisticsContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Statistics & Analytics</h1>
        <select className={styles.periodSelect}>
          <option>Last 30 days</option>
          <option>Last 7 days</option>
          <option>Last 90 days</option>
        </select>
      </div>
      
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>📊</div>
          <h2>Statistics & Analytics</h2>
          <p>View detailed analytics and reports about your business performance.</p>
          <div className={styles.featureList}>
            <div className={styles.feature}>✅ Sales Analytics</div>
            <div className={styles.feature}>✅ Revenue Tracking</div>
            <div className={styles.feature}>✅ Product Performance</div>
            <div className={styles.feature}>✅ Custom Reports</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
