import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import AddProductForm from './AddProductForm';
import CSVUploadModal from './CSVUploadModal';
import ProductOrderHandler from './ProductOrderHandler';
import styles from './Product.module.css';

const Product = () => {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIndividualForm, setShowIndividualForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: { count: 0, label: 'Products' },
    lowStock: { count: 0, label: 'Low Stock' },
    totalRevenue: 0,
    totalCost: 0
  });
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [categories, setCategories] = useState([]);
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
      
      // Always fetch all products first
      const url = `${API_BASE_URL}/api/products/all`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching products: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Fetched ${data.products?.length || 0} products from API`);
        
        // Extract categories for filtering
        const uniqueCategories = [...new Set(data.products.map(product => product.category))];
        setCategories(uniqueCategories);
        
        // Store all products for client-side filtering
        const allProductsData = data.products;
        setAllProducts(allProductsData);
        
        // If search term is provided, filter products locally for better UX
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          
          // Filter products based on multiple criteria (excluding productId)
          const filteredProducts = allProductsData.filter(product => {
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
        } else {
          // No search term, use all products
          setProducts(allProductsData);
          setTotalPages(Math.ceil(allProductsData.length / 10));
        }
      } else {
        console.error("❌ API returned success: false when fetching products");
        toast.error(data.message || "Failed to fetch products");
        setProducts([]);
        setAllProducts([]);
      }
    } catch (error) {
      console.error("❌ Error in fetchProducts:", error);
      toast.error(`Error: ${error.message}`);
      setProducts([]);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInventoryStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/products/inventory-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching inventory stats: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log("📊 Received inventory statistics:", data);
        setInventoryStats({
          totalProducts: {
            count: data.overallInventory?.totalProducts?.count || 0,
            label: 'Products'
          },
          lowStock: {
            count: data.overallInventory?.lowStock?.count || 0,
            label: 'Low Stock'
          },
          totalRevenue: calculateTotalWithTaxAndShipping(data.overallInventory?.totalProducts?.revenue || 0),
          totalCost: data.overallInventory?.totalProducts?.cost || 0
        });
      }
    } catch (error) {
      console.error("❌ Error fetching inventory stats:", error);
    }
  }, []);

  // Initial load with periodic refresh
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchProducts();
      await fetchInventoryStats();
    };
    
    loadInitialData();
    
    // Set up refresh interval to check for updates from other users/sessions
    const refreshInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing product data...");
      fetchProducts();
      fetchInventoryStats();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(refreshInterval);
  }, [fetchProducts, fetchInventoryStats]);
  
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
        
        // Restore focus and cursor position if search was focused
        if (wasSearchFocused && searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
      };
      
      performSearch();
    }, 300); // Debounce time in milliseconds
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchProducts]);

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Calculate total with tax (10%) and shipping (₹50)
  const calculateTotalWithTaxAndShipping = (amount) => {
    const baseAmount = Number(amount || 0);
    const tax = baseAmount * 0.10; // 10% tax
    const shipping = 50; // Fixed shipping charge
    return baseAmount + tax + shipping;
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toFixed(0) || 0}`;
  };

  // Pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleSearchClick = () => {
    setIsSearchActive(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleSearchBlur = (e) => {
    // Keep search active if there's text or if the blur was caused by clicking something else within our component
    if (searchQuery.trim() !== '') {
      return; // Keep active if there's search text
    }
    
    // Otherwise, check if we're clicking elsewhere in our component
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      // Only deactivate if we're not clicking within our search component
      setIsSearchActive(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    
    // Always keep search active while typing, regardless of content
    setIsSearchActive(true);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchActive(false);
    fetchProducts(); // Reset to showing all products
  };

  const handleRefreshInventory = () => {
    fetchInventoryStats();
    fetchProducts();
  };

  const getAvailabilityClass = (availability) => {
    if (availability === 'In stock') {
      return styles.inStock;
    } else if (availability === 'Low stock') {
      return styles.lowStock;
    } else if (availability === 'Out of stock') {
      return styles.outOfStock;
    } else {
      return styles.unknown;
    }
  };

  // Calculate displayed products for current page
  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedProducts = products.slice(startIndex, startIndex + itemsPerPage);

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
                // Pre-clear search to ensure products will be visible after upload
                setSearchQuery('');
                setIsSearching(false);
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
    // Clear search query to ensure we show all products including newly added ones
    setSearchQuery('');
    setIsSearching(false);
    
    // Force UI to reset state
    setLoading(true);
    
    // Force refresh all products regardless of previous search state
    fetchProducts('')
      .then(() => {
        console.log("✅ Products refreshed successfully");
      })
      .catch(err => {
        console.error("❌ Error refreshing products:", err);
      });
    
    // Also refresh inventory stats
    fetchInventoryStats()
      .then(() => {
        console.log("✅ Inventory stats refreshed successfully");
      })
      .catch(err => {
        console.error("❌ Error refreshing inventory stats:", err);
      });
    
    // Force UI to update after a delay to ensure backend has processed everything
    setTimeout(() => {
      console.log("🔄 Forced refresh after timeout");
      fetchProducts('');
    }, 1500);
    
    console.log("📝 Refresh functions called with forced reload");
  };

  return (
    <div className={styles.productPage}>
      {/* Header Section */}
      <div className={styles.header}>
        <h1>Product</h1>
      </div>

      {/* Dashboard Section */}
      <div className={styles.dashboard}>
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <div className={styles.statIcon1}>
              <div className={styles.productBox}></div>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{inventoryStats.totalProducts.count}</div>
              <div className={styles.statLabel}>{inventoryStats.totalProducts.label}</div>
            </div>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statIcon2}>
              <div className={styles.lowStockIcon}></div>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{inventoryStats.lowStock.count}</div>
              <div className={styles.statLabel}>{inventoryStats.lowStock.label}</div>
            </div>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statIcon3}>
              <div className={styles.revenueIcon}></div>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
              {formatCurrency(inventoryStats.totalRevenue)} Revenue
              </div>
            </div>
          </div>

          <div className={styles.statItem}>
            <div className={styles.statIcon4}>
              <div className={styles.costIcon}></div>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
              {formatCurrency(inventoryStats.totalCost)} Cost
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
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
                    <span className={getAvailabilityClass(product.availability)}>
                      {product.availability}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className={styles.noProducts}>
                    {loading ? 'Loading products...' : 'No products found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button 
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <button 
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Form Modal */}
      {showIndividualForm && (
        <AddProductForm 
          onClose={() => setShowIndividualForm(false)}
          onProductAdded={handleProductAdded}
        />
      )}
      
      {/* Add Product Options Modal */}
      {showAddModal && <AddProductModal />}
      
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
