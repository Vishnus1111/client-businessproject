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

  // Calculate tax (10% GST)
  const calculateTax = (amount) => {
    return amount * 0.10;
  };

  // Fixed shipping charge
  const shippingCharge = 50;

  // Calculate final total with tax and shipping
  const calculateTotal = (amount) => {
    return amount + calculateTax(amount) + shippingCharge;
  };

  // Handle print functionality without third-party libraries
  const handlePrint = () => {
    const printContents = document.getElementById('invoice-printable').innerHTML;
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  // Handle download functionality without third-party libraries
  const handleDownload = () => {
    const invoiceContent = document.getElementById('invoice-printable').innerText;
    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${invoice?.invoiceId || 'INV-1067'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.actionButtonsColumn}>
          <button className={styles.closeButton} onClick={onClose}>×</button>
          <button className={styles.downloadButton} onClick={handleDownload} title="Download Invoice">
            <span className={styles.icon}>⬇️</span>
          </button>
          <button className={styles.printButton} onClick={handlePrint} title="Print Invoice">
            <span className={styles.icon}>🖨️</span>
          </button>
        </div>
        
        <div className={styles.invoiceLayout}>          
          <div className={styles.invoiceContainer} id="invoice-printable">
            <h1 className={styles.invoiceTitle}>INVOICE</h1>
            
            <div className={styles.addressSection}>
              <div className={styles.billedTo}>
                <h4>Billed to</h4>
                <p>Global Solutions Company</p>
                <p>Company address</p>
                <p>City, Country - 00000</p>
                <p>TAX ID: 90360270900</p>
              </div>
              <div className={styles.businessAddress}>
                <h4>Business Address</h4>
                <p>ZipKart</p>
                <p>KR Puram, Bengaluru - 560049</p>
                <p>TAX ID: 90360270900</p>
              </div>
            </div>
            
            <div className={styles.invoiceInfo}>
              <div className={styles.invoiceInfoColumn}>
                <div className={styles.detailRow}>
                  <h4>Invoice date</h4>
                  <p>{invoice?.createdAt ? formatDate(invoice.createdAt) : '01-Apr-2025'}</p>
                </div>
              </div>
              
              <div className={styles.referenceColumn}>
                <div className={styles.detailRow}>
                  <h4>Reference</h4>
                  <p>{invoice?.reference || 'INV-057'}</p>
                </div>
                <div className={styles.detailRow}>
                  <h4>Invoice #</h4>
                  <p>{invoice?.invoiceId || 'INV-1067'}</p>
                </div>
                <div className={styles.detailRow}>
                  <h4>Due date</h4>
                  <p>{invoice?.dueDate ? formatDate(invoice.dueDate) : '15-Apr-2025'}</p>
                </div>
              </div>
            </div>
            
            <div className={styles.productTable}>
              <table>
                <thead>
                  <tr>
                    <th>Products</th>
                    <th>Qty</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice?.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.price)}</td>
                      </tr>
                    ))
                  ) : (
                    // Sample product display if no items in invoice
                    <tr>
                      <td>{invoice?.productName || 'Product'}</td>
                      <td>{invoice?.quantityOrdered || 1}</td>
                      <td>{formatCurrency(invoice?.pricePerUnit || 1000)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className={styles.summary}>
              <div className={styles.summaryDetails}>
                <h4>Subtotal</h4>
                <p>{formatCurrency(invoice?.totalAmount || 5000)}</p>
              </div>
              <div className={styles.summaryDetails}>
                <h4>Tax (10%)</h4>
                <p>{formatCurrency(calculateTax(invoice?.totalAmount || 5000))}</p>
              </div>
              <div className={styles.summaryDetails}>
                <h4>Shipping</h4>
                <p>{formatCurrency(shippingCharge)}</p>
              </div>
              <div className={`${styles.summaryDetails} ${styles.total}`}>
                <h4>Total due</h4>
                <p>{formatCurrency(calculateTotal(invoice?.totalAmount || 5000))}</p>
              </div>
            </div>
            
            <div className={styles.paymentNote}>
              <input type="checkbox" checked readOnly />
              <span>Please pay within 15 days of receiving this invoice.</span>
            </div>
            
            <div className={styles.footer}>
              <div className={styles.footerItem}>www.zipkart.com</div>
              <div className={styles.footerItem}>+91 1234567890</div>
              <div className={styles.footerItem}>vishnu@email.com</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
