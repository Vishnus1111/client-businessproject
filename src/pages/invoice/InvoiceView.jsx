import React from 'react';
import styles from './InvoiceView.module.css';

const InvoiceView = ({ invoice, onClose }) => {
  // Format currency with Indian Rupee symbol
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString()}`;
  };

  // Format date in DD-MMM-YYYY format
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.closeButtonWrapper}>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.invoiceContainer}>
          <h2 className={styles.invoiceTitle}>Invoice</h2>
          
          <div className={styles.invoiceDetails}>
            <div className={styles.detail}>
              <span className={styles.label}>Invoice #:</span>
              <span className={styles.value}>{invoice?.invoiceId || '-'}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>Date:</span>
              <span className={styles.value}>{invoice?.createdAt ? formatDate(invoice.createdAt) : '-'}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>Due Date:</span>
              <span className={styles.value}>{invoice?.dueDate ? formatDate(invoice.dueDate) : '-'}</span>
            </div>
          </div>
          
          <div className={styles.section}>
            <h3>Product Details</h3>
            <div className={styles.productDetails}>
              <div className={styles.productName}>{invoice?.productName || 'Product'}</div>
              <div className={styles.productPrice}>{formatCurrency(invoice?.pricePerUnit || 0)} × {invoice?.quantityOrdered || 0}</div>
            </div>
          </div>
          
          <div className={styles.section}>
            <h3>Total</h3>
            <div className={styles.total}>
              {formatCurrency(invoice?.totalAmount || 0)}
            </div>
          </div>
          
          <div className={styles.actions}>
            <button className={styles.downloadButton}>Download</button>
            <button className={styles.printButton}>Print</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
