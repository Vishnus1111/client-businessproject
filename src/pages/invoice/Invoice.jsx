import React from 'react';
import styles from './Invoice.module.css';

const Invoice = () => {
  return (
    <div className={styles.invoiceContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Invoice Management</h1>
        <button className={styles.addButton}>+ Create Invoice</button>
      </div>
      
      <div className={styles.content}>
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>📄</div>
          <h2>Invoice Management</h2>
          <p>Create, manage, and track invoices for your business transactions.</p>
          <div className={styles.featureList}>
            <div className={styles.feature}>✅ Create Invoices</div>
            <div className={styles.feature}>✅ Track Payments</div>
            <div className={styles.feature}>✅ Generate Reports</div>
            <div className={styles.feature}>✅ Send Reminders</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
