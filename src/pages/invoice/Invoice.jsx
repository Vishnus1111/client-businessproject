import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./Invoice.module.css";
import InvoiceView from "./InvoiceView";
import API_BASE_URL from "../config";

const Invoice = () => {
  const [invoices, setInvoices] = useState([]);
  const [statistics, setStatistics] = useState({
    recentTransactions: 0,
    totalInvoices: { total: 0, processed: 0 },
    paidAmount: { amount: 0, customers: 0 },
    unpaidAmount: { amount: 0, pending: 0 }
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format currency with Indian Rupee symbol
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString()}`;
  };

  // Format date in DD-MMM-YY format
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit"
    });
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/invoices`);
        
        if (response.data.success) {
          setInvoices(response.data.invoices);
          
          // Calculate statistics
          const now = new Date();
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          
          // Recent transactions (last 7 days)
          const recentInvoices = response.data.invoices.filter(invoice => 
            new Date(invoice.createdAt) >= sevenDaysAgo
          );
          
          // Separate paid and unpaid invoices
          const paid = response.data.invoices.filter(invoice => invoice.status === "Paid");
          const unpaid = response.data.invoices.filter(invoice => invoice.status === "Unpaid");
          
          // Calculate total paid and unpaid amounts
          const paidAmount = paid.reduce((total, invoice) => total + Number(invoice.totalAmount), 0);
          const unpaidAmount = unpaid.reduce((total, invoice) => total + Number(invoice.totalAmount), 0);
          
          setStatistics({
            recentTransactions: recentInvoices.length,
            totalInvoices: {
              total: response.data.invoices.length,
              processed: paid.length
            },
            paidAmount: {
              amount: paidAmount,
              customers: paid.length
            },
            unpaidAmount: {
              amount: unpaidAmount,
              pending: unpaid.length
            }
          });
        } else {
          setError("Failed to fetch invoices");
        }
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError("Error loading invoices");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoices();
  }, []);

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleCloseInvoiceView = () => {
    setSelectedInvoice(null);
  };
  
  const handlePayInvoice = async (invoice) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/invoices/${invoice.invoiceId}/pay`,
        {},
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      if (response.data.success) {
        // Update the invoice in the local state
        const updatedInvoices = invoices.map(inv => 
          inv.invoiceId === invoice.invoiceId ? { ...inv, status: "Paid" } : inv
        );
        setInvoices(updatedInvoices);
        
        // Recalculate statistics
        const paid = updatedInvoices.filter(inv => inv.status === "Paid");
        const unpaid = updatedInvoices.filter(inv => inv.status === "Unpaid");
        
        setStatistics(prev => ({
          ...prev,
          totalInvoices: { 
            ...prev.totalInvoices, 
            processed: paid.length 
          },
          paidAmount: { 
            amount: paid.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
            customers: paid.length 
          },
          unpaidAmount: { 
            amount: unpaid.reduce((sum, inv) => sum + Number(inv.totalAmount), 0), 
            pending: unpaid.length 
          }
        }));
        
        // Show success message
        alert("Invoice paid successfully");
      } else {
        alert(response.data.message || "Failed to pay invoice");
      }
    } catch (error) {
      console.error("Error paying invoice:", error);
      alert("Error paying invoice");
    }
  };
  
  const handleReturnInvoice = async (invoice) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/invoices/${invoice.invoiceId}/return`,
        {},
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      if (response.data.success) {
        // Update the invoice in the local state
        const updatedInvoices = invoices.map(inv => 
          inv.invoiceId === invoice.invoiceId ? { ...inv, status: "Returned" } : inv
        );
        setInvoices(updatedInvoices);
        
        // Recalculate statistics (same as above but considering returned status)
        const paid = updatedInvoices.filter(inv => inv.status === "Paid");
        const unpaid = updatedInvoices.filter(inv => inv.status === "Unpaid");
        
        setStatistics(prev => ({
          ...prev,
          totalInvoices: { 
            ...prev.totalInvoices,
            processed: paid.length 
          },
          paidAmount: { 
            amount: paid.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
            customers: paid.length 
          },
          unpaidAmount: { 
            amount: unpaid.reduce((sum, inv) => sum + Number(inv.totalAmount), 0), 
            pending: unpaid.length 
          }
        }));
        
        // Show success message
        alert("Invoice returned/cancelled successfully");
      } else {
        alert(response.data.message || "Failed to return/cancel invoice");
      }
    } catch (error) {
      console.error("Error returning invoice:", error);
      alert("Error returning/cancelling invoice");
    }
  };
  
  const handleDeleteInvoice = async (invoice) => {
    // Confirm before deleting
    if (!window.confirm("Are you sure you want to delete this invoice?")) {
      return;
    }
    
    try {
      // For now were just removing it from UI since delete endpoint isnt implemented
      // In production, you would make a DELETE API call here
      const updatedInvoices = invoices.filter(inv => inv.invoiceId !== invoice.invoiceId);
      setInvoices(updatedInvoices);
      
      // Recalculate statistics
      const paid = updatedInvoices.filter(inv => inv.status === "Paid");
      const unpaid = updatedInvoices.filter(inv => inv.status === "Unpaid");
      
      setStatistics({
        ...statistics,
        totalInvoices: { 
          total: updatedInvoices.length,
          processed: paid.length 
        },
        paidAmount: { 
          amount: paid.reduce((sum, inv) => sum + Number(inv.totalAmount), 0),
          customers: paid.length 
        },
        unpaidAmount: { 
          amount: unpaid.reduce((sum, inv) => sum + Number(inv.totalAmount), 0), 
          pending: unpaid.length 
        }
      });
      
      alert("Invoice deleted successfully");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Error deleting invoice");
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading invoices...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.invoiceContainer}>
      {/* Header with search */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Invoice</h1>
        <div className={styles.searchContainer}>
          <input type="text" className={styles.searchInput} placeholder="Search..." />
          <button className={styles.searchButton}>���</button>
        </div>
      </div>
      
      {/* Invoice Statistics Dashboard */}
      <div className={styles.dashboard}>
        <h2 className={styles.dashboardTitle}>Recent Transactions</h2>
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <div className={styles.statTitle}>Total Invoices</div>
            <div className={styles.statValue}>{statistics.totalInvoices.total}</div>
            <div className={styles.statSubText}>Last 7 days</div>
            <div className={styles.statProcessed}>{statistics.totalInvoices.processed} Processed</div>
          </div>
          
          <div className={styles.statBox}>
            <div className={styles.statTitle}>Paid Amount</div>
            <div className={styles.statValue}>{formatCurrency(statistics.paidAmount.amount)}</div>
            <div className={styles.statSubText}>Last 7 days</div>
            <div className={styles.statContent}>
              <span className={styles.statProcessed}>{statistics.paidAmount.customers} Customers</span>
            </div>
          </div>
          
          <div className={styles.statBox}>
            <div className={styles.statTitle}>Unpaid Amount</div>
            <div className={styles.statValue}>{formatCurrency(statistics.unpaidAmount.amount)}</div>
            <div className={styles.statSubText}>Last 7 days</div>
            <div className={styles.statContent}>
              <span className={styles.statProcessed}>{statistics.unpaidAmount.pending} Pending</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Invoice List */}
      <div className={styles.invoiceListContainer}>
        <h2 className={styles.listTitle}>Invoices</h2>
        <div className={styles.tableContainer}>
          <table className={styles.invoiceTable}>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice._id}>
                  <td>{invoice.invoiceId}</td>
                  <td>{formatDate(invoice.createdAt)}</td>
                  <td>{invoice.customerInfo?.name || "N/A"}</td>
                  <td>₹ {Number(invoice.totalAmount).toLocaleString()}</td>
                  <td>
                    <span className={`${styles.status} ${styles[invoice.status.toLowerCase()]}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td>
                    <div className={styles.actionDropdown}>
                      <button className={styles.actionButton}>⋮</button>
                      <div className={styles.dropdownContent}>
                        {/* Only show View Invoice button for Paid and Returned invoices */}
                        {(invoice.status === "Paid" || invoice.status === "Returned") && (
                          <button 
                            className={styles.viewButton}
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <span className={styles.viewIcon}>���️</span> View Invoice
                          </button>
                        )}
                        
                        {/* Different actions based on invoice status */}
                        {invoice.status === "Unpaid" && (
                          <>
                            <button 
                              className={styles.payButton}
                              onClick={() => handlePayInvoice(invoice)}
                            >
                              <span className={styles.payIcon}>���</span> Pay
                            </button>
                            <button 
                              className={styles.returnButton}
                              onClick={() => handleReturnInvoice(invoice)}
                            >
                              <span className={styles.returnIcon}>↩️</span> Return/Cancel
                            </button>
                          </>
                        )}
                        
                        {/* Only show delete option for paid invoices */}
                        {invoice.status === "Paid" && (
                          <button 
                            className={styles.deleteButton}
                            onClick={() => handleDeleteInvoice(invoice)}
                          >
                            <span className={styles.deleteIcon}>���️</span> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className={styles.pagination}>
          <button className={styles.paginationButton}>Previous</button>
          <span className={styles.pageInfo}>Page 1 of 1</span>
          <button className={styles.paginationButton}>Next</button>
        </div>
      </div>
      
      {/* Invoice View Modal */}
      {selectedInvoice && (
        <InvoiceView invoice={selectedInvoice} onClose={handleCloseInvoiceView} />
      )}
    </div>
  );
};

export default Invoice;
