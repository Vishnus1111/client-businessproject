import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import styles from "./Invoice.module.css";
import logo from '../../assets/dashboard/logo.png';
import settingsIcon from '../../assets/mobile/Setting.png';
import InvoiceView from "./InvoiceView";
import API_BASE_URL from "../config";
import viewInvoiceImg from '../../assets/invoice/viewinvoice.png';
import deleteInvoiceImg from "../../assets/invoice/invoicedelete.png"

const Invoice = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [statistics, setStatistics] = useState({
    recentTransactions: 0,
    totalInvoices: { total: 0, processed: 0 },
    paidAmount: { amount: 0, customers: 0 },
    unpaidAmount: { amount: 0, pending: 0 }
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [invoicesPerPage] = useState(9);
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  // Detect mobile to alter table structure per requirements
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 600px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 600px)');
    const onChange = (e) => setIsMobile(e.matches);
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else if (mql.removeListener) mql.removeListener(onChange);
    };
  }, []);

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
  
  // Calculate total with tax (10%) and shipping (₹50)
  const calculateTotalWithTaxAndShipping = (amount) => {
    const baseAmount = Number(amount || 0);
    const tax = baseAmount * 0.10; // 10% tax
    const shipping = 50; // Fixed shipping charge
    return baseAmount + tax + shipping;
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle dropdown menu
  const toggleDropdown = (id) => {
    setOpenDropdownId(prevId => prevId === id ? null : id);
  };
  
  // Handle search functionality
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    // Only filter if there's actual text entered
    if (!term || !isSearchActive) {
      setFilteredInvoices(invoices); // Reset to all invoices when empty
      return;
    }
    
    // Filter invoices based on all properties
    const filtered = invoices.filter(invoice => {
      // Check if term is in any items (products) in the invoice
      const itemsMatch = invoice.items && invoice.items.some(item => {
        return (
          (item.productName && item.productName.toLowerCase().includes(term)) ||
          (item.quantity && item.quantity.toString().includes(term)) ||
          (item.price && item.price.toString().includes(term))
        );
      });
      
      // Check all searchable fields
      const referenceMatch = (invoice.reference && invoice.reference.toLowerCase().includes(term)) || 
                             (invoice.invoiceId && `INV-${invoice.invoiceId.substring(invoice.invoiceId.length - 3)}`.toLowerCase().includes(term));
      
      return (
        (invoice.invoiceId && invoice.invoiceId.toLowerCase().includes(term)) ||
        referenceMatch ||
        (invoice.totalAmount && invoice.totalAmount.toString().includes(term)) ||
        (invoice.status && invoice.status.toLowerCase().includes(term)) ||
        (invoice.dueDate && formatDate(invoice.dueDate).toLowerCase().includes(term)) ||
        (invoice.customerName && invoice.customerName.toLowerCase().includes(term)) ||
        (invoice.createdAt && formatDate(invoice.createdAt).toLowerCase().includes(term)) ||
        itemsMatch
      );
    });
    
    setFilteredInvoices(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  };
  
  // Handle search field focus
  const handleSearchFocus = () => {
    setIsSearchActive(true);
  };
  
  // Handle search field blur
  const handleSearchBlur = (e) => {
    // Only deactivate search if the field is empty
    if (!e.target.value) {
      setIsSearchActive(false);
    }
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/invoices`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          setInvoices(response.data.invoices);
          setFilteredInvoices(response.data.invoices);
          
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
          
          // Calculate total paid and unpaid amounts with tax and shipping
          const paidAmount = paid.reduce((total, invoice) => total + calculateTotalWithTaxAndShipping(invoice.totalAmount), 0);
          const unpaidAmount = unpaid.reduce((total, invoice) => total + calculateTotalWithTaxAndShipping(invoice.totalAmount), 0);
          
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
        
        // Also update filtered invoices
        setFilteredInvoices(prevFiltered => 
          prevFiltered.map(inv => 
            inv.invoiceId === invoice.invoiceId ? { ...inv, status: "Paid" } : inv
          )
        );
        
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
            amount: paid.reduce((sum, inv) => sum + calculateTotalWithTaxAndShipping(inv.totalAmount), 0),
            customers: paid.length 
          },
          unpaidAmount: { 
            amount: unpaid.reduce((sum, inv) => sum + calculateTotalWithTaxAndShipping(inv.totalAmount), 0), 
            pending: unpaid.length 
          }
        }));
        
        // Show success message with toast instead of alert
        toast.success("Invoice paid successfully");
      } else {
        toast.error(response.data.message || "Failed to pay invoice");
      }
    } catch (error) {
      toast.error("Error paying invoice");
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
        
        // Also update filtered invoices
        setFilteredInvoices(prevFiltered => 
          prevFiltered.map(inv => 
            inv.invoiceId === invoice.invoiceId ? { ...inv, status: "Returned" } : inv
          )
        );
        
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
            amount: paid.reduce((sum, inv) => sum + calculateTotalWithTaxAndShipping(inv.totalAmount), 0),
            customers: paid.length 
          },
          unpaidAmount: { 
            amount: unpaid.reduce((sum, inv) => sum + calculateTotalWithTaxAndShipping(inv.totalAmount), 0), 
            pending: unpaid.length 
          }
        }));
        
        // Show success message with toast
        toast.success("Invoice returned/cancelled successfully");
      } else {
        toast.error(response.data.message || "Failed to return/cancel invoice");
      }
    } catch (error) {
      toast.error("Error returning/cancelling invoice");
    }
  };
  
  // Handle initiating the delete process - shows confirmation dialog
  const handleDeleteInvoice = (invoice) => {
    // Show delete confirmation dialog
    setInvoiceToDelete(invoice);
    setShowDeleteConfirm(true);
  };
  
  // Handle confirming the deletion
  const confirmDeleteInvoice = () => {
    if (!invoiceToDelete) return;
    
    try {
      // For now we're just removing it from UI since delete endpoint isn't implemented
      // In production, you would make a DELETE API call here
      const updatedInvoices = invoices.filter(inv => inv.invoiceId !== invoiceToDelete.invoiceId);
      setInvoices(updatedInvoices);
      
      // Also update filtered invoices
      setFilteredInvoices(prevFiltered => 
        prevFiltered.filter(inv => inv.invoiceId !== invoiceToDelete.invoiceId)
      );
      
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
          amount: paid.reduce((sum, inv) => sum + calculateTotalWithTaxAndShipping(inv.totalAmount), 0),
          customers: paid.length 
        },
        unpaidAmount: { 
          amount: unpaid.reduce((sum, inv) => sum + calculateTotalWithTaxAndShipping(inv.totalAmount), 0), 
          pending: unpaid.length 
        }
      });
      
      toast.success("Invoice deleted successfully");
      setShowDeleteConfirm(false);
      setInvoiceToDelete(null);
    } catch (error) {
      toast.error("Error deleting invoice");
      setShowDeleteConfirm(false);
      setInvoiceToDelete(null);
    }
  };
  
  // Handle canceling the deletion
  const cancelDeleteInvoice = () => {
    setShowDeleteConfirm(false);
    setInvoiceToDelete(null);
  };

  if (loading) {
    return <div className={styles.loading}>Loading invoices...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.invoiceContainer}>
      {/* Mobile-only header (hidden on desktop via CSS) */}
      <div className={styles.mobileHeader}>
        <img src={logo} alt="Logo" className={styles.mobileLogo} />
        <a href="/dashboard/settings" className={styles.mobileSettings} aria-label="Settings">
          <img src={settingsIcon} alt="Settings" />
        </a>
      </div>
      {/* Header with search */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Invoice</h1>
        <div className={`${styles.searchContainer} ${isSearchActive ? styles.activeSearch : ''}`}>
          <button 
            className={styles.searchButton} 
            onClick={() => {
              const searchInput = document.querySelector(`.${styles.searchInput}`);
              setIsSearchActive(true);
              searchInput.focus();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="searchavatar">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </button>
          <input 
            type="text" 
            className={styles.searchInput} 
            placeholder="Search by ID, reference, amount, status, date..." 
            value={searchTerm}
            onChange={handleSearch}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
        </div>
      </div>
      
      {/* Invoice Statistics Dashboard */}
      <div className={styles.dashboard}>
        <h2 className={styles.dashboardTitle}>Overall Invoice</h2>
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <div className={styles.statTitle}>Recent Transactions</div>
            <div className={styles.statValue}>{statistics.recentTransactions}</div>
            <div className={styles.statSubText}>Last 7 days</div>
          </div>
          
          <div className={styles.statBox}>
            <div className={styles.statTitle}>Total Invoices</div>
            <div className={styles.statValue}>{statistics.totalInvoices.total}</div>
            <div className={styles.statSubText}>Last 7 days</div>
            <div className={styles.statProcessed}>{statistics.totalInvoices.processed}</div>
            <div className={styles.statfieldname}>Processed</div>
          </div>
          
          <div className={styles.statBox}>
            <div className={styles.statTitle}>Paid Amount</div>
            <div className={styles.statValue}>{formatCurrency(statistics.paidAmount.amount)}</div>
            <div className={styles.statSubText}>Last 7 days</div>
            <div className={styles.statProcessed}>{statistics.paidAmount.customers}</div>
            <div className={styles.statfieldname}>customers</div>
          </div>
          
          <div className={styles.statBox}>
            <div className={styles.statTitle}>Unpaid Amount</div>
            <div className={styles.statValue}>{formatCurrency(statistics.unpaidAmount.amount)}</div>
            <div className={styles.statSubText}>Last 7 days</div>
            <div className={styles.statProcessed}>{statistics.unpaidAmount.pending}</div>
            <div className={styles.statfieldname}>Pending Payment</div>
          </div>
        </div>
      </div>
      
      {/* Invoice List */}
      <div className={styles.invoiceListContainer}>
        <div className={styles.listHeaderRow}>
          <h2 className={styles.listTitle}>Invoices List</h2>
          {isSearchActive && searchTerm && (
            <div className={styles.searchIndicator}>
              <span>Showing results for: "{searchTerm}"</span>
              <button 
                className={styles.clearSearch} 
                onClick={() => {
                  setSearchTerm("");
                  setFilteredInvoices(invoices);
                  setIsSearchActive(false);
                  document.querySelector(`.${styles.searchInput}`).blur();
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.invoiceTable}>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Reference Number</th>
                <th>Amount (₹)</th>
                <th>Status</th>
                <th>Due Date</th>
                {isMobile && (<th>Actions</th>)}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const indexOfLastInvoice = currentPage * invoicesPerPage;
                const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
                const currentInvoices = filteredInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
                
                if (currentInvoices.length === 0 && filteredInvoices.length > 0 && currentPage > 1) {
                  // If current page has no invoices but there are invoices, go to previous page
                  setCurrentPage(currentPage - 1);
                  return null;
                }
                
                return currentInvoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td>{invoice.invoiceId}</td>
                    <td>{invoice.reference || `INV-${invoice.invoiceId.substring(invoice.invoiceId.length - 3)}`}</td>
                    <td>₹ {calculateTotalWithTaxAndShipping(invoice.totalAmount).toLocaleString()}</td>
                    <td>
                      <span className={`${styles.status} ${styles[invoice.status.toLowerCase()]}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                        <span>{formatDate(invoice.dueDate)}</span>
                        {!isMobile && (
                          <div className={styles.actionDropdown} ref={invoice._id === openDropdownId ? dropdownRef : null}>
                            <button 
                              className={styles.actionButton} 
                              onClick={() => toggleDropdown(invoice._id)}
                            >⋮</button>
                            <div className={`${styles.dropdownContent} ${invoice._id === openDropdownId ? styles.show : ''}`}>
                              {invoice.status === "Paid" && (
                                <>
                                  <button 
                                    className={styles.viewButton}
                                    onClick={() => {
                                      handleViewInvoice(invoice);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <span className={styles.viewIcon}><img src={viewInvoiceImg} alt="View Invoice" /></span> View Invoice
                                  </button>
                                  <button 
                                    className={styles.deleteButton}
                                    onClick={() => {
                                      handleDeleteInvoice(invoice);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <span className={styles.deleteIcon}><img src={deleteInvoiceImg} alt="Delete Invoice" /></span> Delete
                                  </button>
                                </>
                              )}
                              {invoice.status === "Returned" && (
                                <button 
                                  className={styles.viewButton}
                                  onClick={() => {
                                    handleViewInvoice(invoice);
                                    setOpenDropdownId(null);
                                  }}
                                >
                                  <span className={styles.viewIcon}><img src={viewInvoiceImg} alt="View Invoice" /></span> View Invoice
                                </button>
                              )}
                              {invoice.status === "Unpaid" && (
                                <>
                                  <button 
                                    className={styles.payButton}
                                    onClick={() => {
                                      handlePayInvoice(invoice);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <span className={styles.payIcon}>💲</span> Pay
                                  </button>
                                  <button 
                                    className={styles.returnButton}
                                    onClick={() => {
                                      handleReturnInvoice(invoice);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <span className={styles.returnIcon}>↩️</span> Return/Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
          {isMobile && (
                      <td>
            {(invoice.status === "Returned" || invoice.status === "Cancelled") ? (
                          <span className={styles.cancelledText}>Cancelled</span>
                        ) : (
                          <div className={styles.actionDropdown} ref={invoice._id === openDropdownId ? dropdownRef : null}>
                            <button 
                              className={styles.actionButton} 
                              onClick={() => toggleDropdown(invoice._id)}
                            >⋮</button>
                            <div className={`${styles.dropdownContent} ${invoice._id === openDropdownId ? styles.show : ''}`}>
                              {invoice.status === "Paid" && (
                                <>
                                  <button 
                                    className={styles.viewButton}
                                    onClick={() => {
                                      handleViewInvoice(invoice);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <span className={styles.viewIcon}><img src={viewInvoiceImg} alt="View Invoice" /></span> View Invoice
                                  </button>
                                  <button 
                                    className={styles.deleteButton}
                                    onClick={() => {
                                      handleDeleteInvoice(invoice);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <span className={styles.deleteIcon}><img src={deleteInvoiceImg} alt="Delete Invoice" /></span> Delete
                                  </button>
                                </>
                              )}
                              {invoice.status === "Unpaid" && (
                                <>
                                  <button 
                                    className={styles.payButton}
                                    onClick={() => {
                                      handlePayInvoice(invoice);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <span className={styles.payIcon}>💲</span> Pay
                                  </button>
                                  <button 
                                    className={styles.returnButton}
                                    onClick={() => {
                                      handleReturnInvoice(invoice);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <span className={styles.returnIcon}>↩️</span> Return/Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ));
              })()}
        {filteredInvoices.length === 0 && (
                <tr>
          <td colSpan={isMobile ? 6 : 5} style={{ textAlign: "center", padding: "20px" }}>
                    {searchTerm ? "No matching invoices found" : "No invoices found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className={styles.pagination}>
          <button 
            className={styles.paginationButton} 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {Math.max(1, Math.ceil(filteredInvoices.length / invoicesPerPage))}
          </span>
          <button 
            className={styles.paginationButton}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredInvoices.length / invoicesPerPage)))}
            disabled={currentPage >= Math.ceil(filteredInvoices.length / invoicesPerPage)}
            style={{ opacity: currentPage >= Math.ceil(filteredInvoices.length / invoicesPerPage) ? 0.5 : 1, cursor: currentPage >= Math.ceil(filteredInvoices.length / invoicesPerPage) ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>
      
      {/* Invoice View Modal */}
      {selectedInvoice && (
        <InvoiceView invoice={selectedInvoice} onClose={handleCloseInvoiceView} />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmDeleteModal}>
            <h3>Confirm Delete</h3>
            <p>This invoice will be deleted.</p>
            <div className={styles.confirmButtonGroup}>
              <button 
                className={styles.cancelButton} 
                onClick={cancelDeleteInvoice}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmButton} 
                onClick={confirmDeleteInvoice}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Make sure we're exporting the component correctly
export default Invoice;
