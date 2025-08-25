import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import AddProductForm from './AddProductForm';
import CSVUploadModal from './CSVUploadModal';
import ProductOrderHandler from './ProductOrderHandler';
import styles from './Product.module.css';

const Product = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIndividualForm, setShowIndividualForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [inventoryStats, setInventoryStats] = useState({
    categories: 0,
    totalProducts: 0,
    totalRevenue: 0,
    totalCost: 0,
    topSelling: 0,
    lowStocks: { ordered: 0, notInStock: 0 }
  });
  
  // State for product ordering
  const [selectedProductId, setSelectedProductId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef(null);

  const fetchProducts = useCallback(async (searchTerm = '') => {
    console.log("🔍 fetchProducts called - starting to fetch products...");
    
    try {
      setLoading(true);
      setIsSearching(!!searchTerm);
      const token = localStorage.getItem('token');
      
      // Add timestamp parameter to prevent caching issues after CSV upload
      // This ensures we always get the latest data from the server
      const timestamp = Date.now();
      const url = `${API_BASE_URL}/api/products/all?_t=${timestamp}`;
      
      console.log("🌐 Making API request to:", url);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Ensure no caching
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ API response received:", data);
        
        const allProducts = data.products || [];
        
        // If search term is provided, filter products locally for better UX
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          
          // Filter products based on multiple criteria (excluding productId)
          const filteredProducts = allProducts.filter(product => {
            // Use only the selling price for product page (without tax and shipping)
            const sellingPrice = product.sellingPrice;
            const sellingPriceString = sellingPrice.toString();
            const sellingPriceFixed = sellingPrice.toFixed(0); // No decimal places
            
            // Price with currency symbol as shown in the UI
            const formattedPrice = formatCurrency(sellingPrice);
            // Price without currency symbol for searching
            const priceWithoutSymbol = formattedPrice.replace('₹', '');
            
            // Format quantity with unit as it appears in the UI
            const quantityWithUnit = `${product.quantity} ${product.unit || 'Packets'}`;
            const quantityString = product.quantity.toString();
            
            // Format threshold value with unit as it appears in the UI
            const thresholdWithUnit = `${product.thresholdValue} ${product.unit || 'Packets'}`;
            const thresholdString = product.thresholdValue.toString();
            
            // Check only the fields visible in the table
            return (
              // Product Name (visible in the table)
              (product.productName && product.productName.toLowerCase().includes(term)) ||
              
              // Price matching - multiple formats for maximum searchability
              (term.startsWith('₹') && priceWithoutSymbol.includes(term.substring(1))) || // If search includes ₹ symbol
              (sellingPriceString.includes(term)) ||
              (sellingPriceFixed.includes(term)) ||
              (priceWithoutSymbol.includes(term)) ||
              
              // Quantity matching - both raw number and with unit
              (quantityString.includes(term)) ||
              (quantityWithUnit.toLowerCase().includes(term)) ||
              
              // Threshold Value matching - both raw number and with unit
              (thresholdString.includes(term)) ||
              (thresholdWithUnit.toLowerCase().includes(term)) ||
              
              // Expiry Date (visible in the table)
              (product.expiryDate && formatDate(product.expiryDate).toLowerCase().includes(term)) ||
              
              // Availability status (visible in the table)
              (product.availability && product.availability.toLowerCase().includes(term))
            );
          });
          
          setProducts(filteredProducts);
          setTotalPages(Math.ceil(filteredProducts.length / 10));
          console.log("📊 Filtered products:", filteredProducts.length);
        } else {
          // No search term, show all products
          setProducts(allProducts);
          setTotalPages(Math.ceil(allProducts.length / 10));
          console.log("📊 All products loaded:", allProducts.length);
        }
        
      } else {
        console.error("❌ API response not OK:", response.status, response.statusText);
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
      setIsSearching(false);
      console.log("🏁 fetchProducts completed");
    }
  }, []);

  const fetchInventoryStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/dashboard/inventory-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInventoryStats({
          categories: data.overallInventory?.categories?.count || 0,
          totalProducts: data.overallInventory?.totalProducts?.count || 0,
          totalRevenue: calculateTotalWithTaxAndShipping(data.overallInventory?.totalProducts?.revenue || 0),
          totalCost: data.overallInventory?.topSelling?.cost || 0,
          topSelling: Math.min(5, data.overallInventory?.topSelling?.count || 5), // Force max 5 for top selling
          lowStocks: data.overallInventory?.lowStocks || { ordered: 0, notInStock: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchProducts();
      await fetchInventoryStats();
    };
    loadInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search effect with improved focus management
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Always store current focus state and cursor position
      const wasSearchFocused = document.activeElement === searchInputRef.current;
      const cursorPosition = searchInputRef.current?.selectionStart || 0;
      
      const performSearch = async () => {
        if (searchQuery !== '') {
          await fetchProducts(searchQuery);
        } else if (searchQuery === '') {
          await fetchProducts();
        }
        
        // Always restore focus and cursor position after search completes
        // This ensures the search stays focused until user explicitly clicks away
        if (wasSearchFocused && searchInputRef.current) {
          requestAnimationFrame(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
            setIsSearchActive(true); // Keep search active
          });
        }
      };
      
      performSearch();
    }, 300); // Reduced debounce time for better responsiveness

    return () => clearTimeout(timeoutId);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCurrentPage(1);
    
    // Always keep search active when typing
    setIsSearchActive(true);
    
    // Local filtering is done in the fetchProducts function
    // that gets triggered by the useEffect dependent on searchQuery
  };

  // Handle search field blur
  const handleSearchBlur = (e) => {
    // Keep search active regardless of content
    // Only deactivate if user clicks elsewhere
  };

  // Handle search field focus
  const handleSearchFocus = () => {
    setIsSearchActive(true);
  };

  const getStatusColor = (availability) => {
    switch (availability) {
      case 'In stock':
        return styles.inStock;
      case 'Low stock':
        return styles.lowStock;
      case 'Out of stock':
        return styles.outOfStock;
      default:
        return styles.unknown;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toFixed(0) || 0}`;
  };
  
  // Calculate total with tax (10%) and shipping (₹50)
  const calculateTotalWithTaxAndShipping = (amount) => {
    const baseAmount = Number(amount || 0);
    const tax = baseAmount * 0.10; // 10% tax
    const shipping = 50; // Fixed shipping charge
    return baseAmount + tax + shipping;
  };

  const AddProductModal = () => (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <h3>Add Product</h3>
          <p>Choose how you want to add products:</p>
          
          <div className={styles.productOptions}>
            <button 
              className={styles.optionButton}
              onClick={() => {
                setShowAddModal(false);
                setShowIndividualForm(true);
              }}
            >
              <div className={styles.optionIcon}>📦</div>
              <div className={styles.optionText}>Individual product</div>
            </button>
            
            <button 
              className={styles.optionButton}
              onClick={() => {
                setShowAddModal(false);
                setShowCSVUpload(true);
              }}
            >
              <div className={styles.optionIcon}>📋</div>
              <div className={styles.optionText}>Multiple product</div>
            </button>
          </div>
          
          <button 
            className={styles.closeButton}
            onClick={() => setShowAddModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Completely revamped product refresh function with guaranteed update
  const handleProductAdded = useCallback(async () => {
    console.log("🔄 BULLETPROOF REFRESH: handleProductAdded called");
    
    // Clear any active search and set loading state
    setSearchQuery('');
    setIsSearchActive(false);
    setLoading(true);
    
    // Show loading notification
    toast.info("Loading new products...");
    
    // Define a function to fetch with maximum cache busting
    const fetchWithNoCaching = async () => {
      try {
        // Generate a unique timestamp to prevent any caching
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const noCacheParam = `?_nocache=${timestamp}-${randomStr}`;
        
        // Get a fresh token
        const token = localStorage.getItem('token');
        
        // Make a direct fetch with all cache prevention headers
        const response = await fetch(`${API_BASE_URL}/api/products/all${noCacheParam}`, {
          method: 'GET', // Explicitly set method
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Request-Time': timestamp.toString() // Add custom header to prevent caching
          },
          cache: 'no-store',
          credentials: 'same-origin', // Include credentials
          redirect: 'follow',
          referrerPolicy: 'no-referrer'
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error in fetchWithNoCaching:", error);
        throw error;
      }
    };
    
    // Implement multiple retry attempts with increasing delays
    let success = false;
    let attempt = 0;
    const maxAttempts = 5;
    
    while (!success && attempt < maxAttempts) {
      attempt++;
      console.log(`🔄 Refresh attempt ${attempt}/${maxAttempts}`);
      
      try {
        // Wait longer between each attempt
        if (attempt > 1) {
          const delay = (attempt - 1) * 500; // 0ms, 500ms, 1000ms, 1500ms, 2000ms
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Get fresh data
        const data = await fetchWithNoCaching();
        console.log(`✅ Attempt ${attempt}: Fresh data received:`, data.products?.length || 0, "products");
        
        // Update state with fresh data
        setProducts(data.products || []);
        setTotalPages(Math.ceil((data.products?.length || 0) / 10));
        
        // Refresh stats too
        await fetchInventoryStats();
        
        // Mark success
        success = true;
        
        // Show success notification based on attempt number
        if (attempt === 1) {
          toast.success("Product list updated immediately!");
        } else {
          toast.success(`Product list updated successfully! (attempt ${attempt})`);
        }
        
      } catch (error) {
        console.error(`Error in refresh attempt ${attempt}:`, error);
        
        // Only show error on final attempt
        if (attempt === maxAttempts) {
          toast.error("Could not refresh product list automatically. Please refresh the page.");
        }
      }
    }
    
    // Regardless of success/failure, end loading state
    setLoading(false);
    console.log(`🏁 Refresh complete. Success: ${success}, Attempts: ${attempt}`);
  }, [fetchInventoryStats]); // Only depend on fetchInventoryStats
  
  // Function to refresh inventory after placing an order
  const handleRefreshInventory = useCallback(() => {
    console.log("🔄 handleRefreshInventory called - refreshing inventory after order placement");
    // Force full refresh of products and stats
    if (searchQuery.trim()) {
      fetchProducts(searchQuery);
    } else {
      fetchProducts();
    }
    fetchInventoryStats();
  }, [fetchProducts, fetchInventoryStats, searchQuery]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading products...</p>
      </div>
    );
  }

  // Paginate products for display
  const startIndex = (currentPage - 1) * 10;
  const endIndex = startIndex + 10;
  const displayedProducts = products.slice(startIndex, endIndex);

  return (
    <div className={styles.productContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Product</h1>
        <div className={`${styles.searchContainer} ${isSearchActive ? styles.activeSearch : ''}`}>
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search products..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={handleSearch}
            onBlur={handleSearchBlur}
            onFocus={handleSearchFocus}
            autoComplete="off"
            autoFocus={isSearchActive}
          />
          <button className={styles.searchButton} type="button" aria-label="Search">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </button>
          {isSearching && (
            <div className={styles.searchIndicator}>
              Searching...
            </div>
          )}
        </div>
      </div>

      {/* Overall Inventory Stats */}
      <div className={styles.inventoryOverview}>
        <h2>Overall Inventory</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Categories</span>
            </div>
            <div className={styles.statValue}>{inventoryStats.categories}</div>
            <div className={styles.statSubtext}>Last 7 days</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Total Products</span>
            </div>
            <div className={styles.statValue}>{inventoryStats.totalProducts}</div>
            <div className={styles.statSubtext}>Last 7 days</div>
            <div className={styles.statRevenue}>
              {formatCurrency(inventoryStats.totalRevenue)} Revenue
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Top Selling</span>
            </div>
            <div className={styles.statValue}>{inventoryStats.topSelling}</div>
            <div className={styles.statSubtext}>Last 7 days</div>
            <div className={styles.statCost}>
              {formatCurrency(inventoryStats.totalCost)} Cost
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Low Stocks</span>
            </div>
            <div className={styles.statValue}>{inventoryStats.lowStocks.ordered}</div>
            <div className={styles.statSubtext}>Ordered</div>
            <div className={styles.statNotInStock}>
              {inventoryStats.lowStocks.notInStock} Not in stock
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className={styles.productsSection}>
        <div className={styles.sectionHeader}>
          <h2>Products</h2>
          <button 
            className={styles.addButton}
            onClick={() => setShowAddModal(true)}
          >
            Add Product
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.productsTable}>
            <thead>
              <tr>
                <th>Products</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Threshold Value</th>
                <th>Expiry Date</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.length > 0 ? displayedProducts.map((product) => (
                <tr 
                  key={product._id} 
                  onClick={() => setSelectedProductId(product.productId)}
                  className={styles.productRow}
                >
                  <td className={styles.productCell}>{product.productName}</td>
                  <td>{formatCurrency(product.sellingPrice)}</td>
                  <td>{product.quantity} {product.unit || 'Packets'}</td>
                  <td>{product.thresholdValue} {product.unit || 'Packets'}</td>
                  <td>{formatDate(product.expiryDate)}</td>
                  <td>
                    <span className={`${styles.status} ${getStatusColor(product.availability)}`}>
                      {product.availability}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className={styles.noData}>
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              className={styles.pageButton}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </button>
            
            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            
            <button 
              className={styles.pageButton}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && <AddProductModal />}

      {/* Individual Product Form */}
      {showIndividualForm && (
        <AddProductForm
          onClose={() => setShowIndividualForm(false)}
          onProductAdded={handleProductAdded}
        />
      )}

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <CSVUploadModal
          onClose={() => setShowCSVUpload(false)}
          onProductsAdded={handleProductAdded}
        />
      )}

      {/* Product Order Handler */}
      {selectedProductId && (
        <ProductOrderHandler
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          refreshInventory={handleRefreshInventory}
        />
      )}
    </div>
  );
};

export default Product;
