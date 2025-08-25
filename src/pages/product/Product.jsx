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

  const handleProductAdded = () => {
    console.log("🔄 handleProductAdded called - refreshing product list...");
    
    // Clear any active search query to ensure we see all products including the newly added ones
    setSearchQuery('');
    setIsSearchActive(false);
    
    // Set loading state to show feedback to user
    setLoading(true);
    
    // Show initial toast notification
    toast.info("Refreshing product list...");
    
    // First immediate refresh attempt
    const refreshProductList = async () => {
      try {
        // Force clear browser cache for this request by adding unique timestamp
        const timestamp = Date.now();
        const forceCacheBuster = `?_t=${timestamp}`;
        
        // Make a direct fetch to force fresh data
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/products/all${forceCacheBuster}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store' // Tell browser not to use cache
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("✅ Fresh data fetched directly:", data.products?.length || 0, "products");
          
          // Update the state with fresh data
          setProducts(data.products || []);
          setTotalPages(Math.ceil((data.products?.length || 0) / 10));
          
          // Also update inventory stats
          await fetchInventoryStats();
          
          // Success notification
          toast.success("Product list updated with new products!");
          console.log("📝 Initial refresh completed");
          setLoading(false);
        } else {
          throw new Error('Failed to fetch fresh data');
        }
        
        // Additional refresh after a delay to ensure everything is updated
        setTimeout(async () => {
          console.log("📝 Final verification refresh...");
          try {
            await fetchProducts();
            console.log("📝 Final refresh completed");
            setLoading(false);
          } catch (error) {
            console.error("Error in final refresh:", error);
            setLoading(false);
          }
        }, 1500);
        
      } catch (error) {
        console.error("Error in refresh:", error);
        toast.error("Error refreshing product list. Please try again.");
        setLoading(false);
        
        // Try a regular refresh as fallback
        await fetchProducts();
      }
    };
    
    refreshProductList();
    console.log("📝 Enhanced refresh cycle initiated");
  };
  
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
