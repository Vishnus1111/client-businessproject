import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import AddProductForm from './AddProductForm';
import CSVUploadModal from './CSVUploadModal';
import ProductOrderHandler from './ProductOrderHandler';
import styles from './Product.module.css';
import infoIcon from '../../assets/mobile/i btn.png';
import logo from '../../assets/dashboard/logo.png';
import settingsIcon from '../../assets/mobile/Setting.png';
import './SidebarFix.css';

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
  // Session-local counter to make the Low Stocks -> Ordered metric responsive
  const [lowStockOrdersSession, setLowStockOrdersSession] = useState(0);
  
  // State for product ordering
  const [selectedProductId, setSelectedProductId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const searchInputRef = useRef(null);
  // Mobile-only info modal state
  const [mobileInfoProduct, setMobileInfoProduct] = useState(null);

  const fetchProducts = useCallback(async (searchTerm = '') => {
    console.log("🔍 fetchProducts called - starting to fetch products...");
    
    try {
      setLoading(true);
      setIsSearching(!!searchTerm);
      const token = localStorage.getItem('token');
      
      // Enhanced cache-busting to ensure we always get the latest data from the server
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const url = `${API_BASE_URL}/api/products/all?_t=${timestamp}-${randomStr}`;
      
      console.log("🌐 Making API request to:", url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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
          setTotalPages(Math.ceil(filteredProducts.length / 9));
          console.log("📊 Filtered products:", filteredProducts.length);
        } else {
          // No search term, show all products
          setProducts(allProducts);
          setTotalPages(Math.ceil(allProducts.length / 9));
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

      let base = {
        categories: 0,
        totalProducts: 0,
        totalRevenue: 0,
        lowStocks: { ordered: 0, notInStock: 0 }
      };

      if (response.ok) {
        const data = await response.json();
        base = {
          categories: data.overallInventory?.categories?.count || 0,
          totalProducts: data.overallInventory?.totalProducts?.count || 0,
          // Use backend revenue as-is to stay responsive to DB and avoid phantom ₹50
          totalRevenue: Number(data.overallInventory?.totalProducts?.revenue || 0),
          lowStocks: {
            // Start Ordered at 0; it will increment when a Low stock product is ordered
            ordered: 0,
            // Keep backend-provided notInStock if present
            notInStock: data.overallInventory?.lowStocks?.notInStock || 0
          }
        };
      }

      // Top selling: derive from top-products API; cap count at 5; if none, show 0
      let topSellingCount = 0;
      let topSellingCost = 0;
      try {
        const tpRes = await fetch(`${API_BASE_URL}/api/top-products/top-products`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (tpRes.ok) {
          const tpData = await tpRes.json();
          const topList = Array.isArray(tpData.products) ? tpData.products : [];
          topSellingCount = Math.min(5, topList.length);

          // Build a quick lookup for product costPrice from loaded products
          const prodMap = new Map((products || []).map(p => [p.productId, p]));
          topSellingCost = topList.slice(0, 5).reduce((sum, item) => {
            // Prefer productId when present; fall back to _id
            const pid = item.productId || item._id || item.id;
            // Use costPrice from API if provided; else fall back to local product map
            const costPriceFromApi = typeof item.costPrice === 'number' ? item.costPrice : undefined;
            const costPrice = costPriceFromApi !== undefined ? costPriceFromApi : (prodMap.get(pid)?.costPrice || 0);
            // Frontend-only: without sales quantities, treat cost as per-item and sum for up to 5 items
            return sum + costPrice;
          }, 0);
        }
      } catch (e) {
        // Non-fatal: keep zeros if request fails
        console.warn('Top products fetch failed:', e.message || e);
      }

      setInventoryStats({
        ...base,
        topSelling: topSellingCount,
        totalCost: topSellingCost
      });
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    }
  }, [products]);

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

  // Recompute inventory stats whenever products change to keep counts responsive
  useEffect(() => {
    if (Array.isArray(products)) {
      fetchInventoryStats();
    }
  }, [products, fetchInventoryStats]);

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
  
  // (Removed tax/shipping adjustment; revenue is taken as-is from backend)

  const AddProductModal = () => (
    <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalContent}>
          <div className={styles.productOptionsVertical}>
            <button 
              className={styles.verticalOptionButton}
              onClick={() => {
                setShowAddModal(false);
                setShowIndividualForm(true);
              }}
            >
              Individual product
            </button>
            
            <button 
              className={styles.verticalOptionButton}
              onClick={() => {
                setShowAddModal(false);
                setShowCSVUpload(true);
              }}
            >
              Multiple product
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced product refresh function with improved CSV handling
  const handleProductAdded = useCallback(async (isCsvUpload = false, uploadMetadata = null) => {
    console.log("🔄 ENHANCED REFRESH: handleProductAdded called", isCsvUpload ? "(CSV UPLOAD)" : "");
    if (uploadMetadata) {
      console.log("📊 Upload metadata:", uploadMetadata);
    }
    
    // Clear any active search; avoid full-page loading overlay for CSV uploads
    setSearchQuery('');
    setIsSearchActive(false);
    if (!isCsvUpload) {
      setLoading(true);
    }
    
    // Show loading notification with more specific info if available
    if (isCsvUpload && uploadMetadata?.count) {
      toast.info(`Processing ${uploadMetadata.count} products from CSV upload...`);
      // Do not show full-page loading message for CSV uploads
    } else {
      toast.info(isCsvUpload ? "Processing CSV upload..." : "Adding new product...");
      if (!isCsvUpload) {
        setLoadingMessage("Refreshing product list...");
      }
    }
    
    // Define a function to fetch with maximum cache busting
    const fetchWithNoCaching = async () => {
      // Generate a unique timestamp to prevent any caching
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const uniqueId = uploadMetadata?.uploadId || `${timestamp}-${randomStr}`;
      let noCacheParam = `?_nocache=${uniqueId}&_t=${timestamp}`;
      
      // Add any CSV metadata if available
      if (uploadMetadata) {
        noCacheParam += `&csvUpload=true&count=${uploadMetadata.count || 0}`;
      }
      
      // Get a fresh token
      const token = localStorage.getItem('token');
      
      // Log fetch attempt with detailed information
      console.log(`🔍 Making enhanced no-cache fetch request: attempt=${attempt}, isCsvUpload=${isCsvUpload}, time=${new Date().toISOString()}`);
      
      // Make a direct fetch with all cache prevention headers
      const controller = new AbortController();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000);
      });
      
      try {
        // Use Promise.race to implement timeout
        const fetchPromise = fetch(`${API_BASE_URL}/api/products/all${noCacheParam}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error in fetchWithNoCaching:", error);
        throw error;
      } finally {
        controller.abort(); // Clean up
      }
    };
    
    // Implement multiple retry attempts with increasing delays
    let success = false;
    let attempt = 0;
    const maxAttempts = isCsvUpload ? 8 : 5; // More retries for CSV uploads
    
    while (!success && attempt < maxAttempts) {
      attempt++;
      console.log(`🔄 Refresh attempt ${attempt}/${maxAttempts}`);
      
      try {
        // For CSV uploads, add an initial delay to allow server processing
        if (isCsvUpload && attempt === 1) {
          console.log("📊 CSV Upload detected - Adding initial delay for server processing");
          // Skip full-page loading message for CSV uploads
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second initial delay for CSV
        }
        // Wait longer between each attempt
        else if (attempt > 1) {
          const delay = (attempt - 1) * (isCsvUpload ? 800 : 500); // Longer delays for CSV uploads
          if (!isCsvUpload) {
            setLoadingMessage(`Refreshing product list (Attempt ${attempt}/${maxAttempts})...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Get fresh data
        const data = await fetchWithNoCaching();
        console.log(`✅ Attempt ${attempt}: Fresh data received:`, data.products?.length || 0, "products");
        
        // Verify we have products in the response
        const hasProducts = Array.isArray(data.products) && data.products.length > 0;
        console.log(`Received ${data.products?.length || 0} products in response`);
        
        // Update state with fresh data
        setProducts(data.products || []);
        setTotalPages(Math.ceil((data.products?.length || 0) / 9));
        
        // Refresh stats too
        await fetchInventoryStats();
        
        // Mark success
        success = hasProducts;
        
        // Show appropriate notification based on result
        if (hasProducts) {
          if (attempt === 1) {
            toast.success(isCsvUpload ? "CSV products loaded successfully!" : "Product list updated immediately!");
          } else {
            toast.success(`Product list updated successfully! (attempt ${attempt})`);
          }
          if (!isCsvUpload) {
            setLoadingMessage("");
          }
        } else if (isCsvUpload) {
          // No products received but this is a CSV upload
          // We should try another time to make sure products are loaded
          console.log("No products found in response yet, will retry...");
          // Do not show blocking message for CSV uploads
          
          // Don't mark success yet, we need to try again
          success = false;
        } else {
          // Not a CSV upload, so we can consider this a success even if no products
          success = true;
          setLoadingMessage("");
        }
        
      } catch (error) {
        console.error(`Error in refresh attempt ${attempt}:`, error);
        
        // Only show error on final attempt
        if (attempt === maxAttempts) {
          toast.error("Could not refresh product list automatically. Please refresh the page.");
          if (!isCsvUpload) {
            setLoadingMessage("Failed to refresh products. Please reload the page manually.");
          }
        } else {
          // Update loading message with retry information
          if (!isCsvUpload) {
            setLoadingMessage(`Retry attempt ${attempt + 1}/${maxAttempts} in progress...`);
          }
        }
      }
    }
    
    // Regardless of success/failure, end loading state
    if (success && !isCsvUpload) {
      setLoadingMessage("");
    }
    if (!isCsvUpload) {
      setLoading(false);
    }
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

  // When an order is placed, if the product was Low stock, add +1 to the session counter
  const handleOrderPlaced = useCallback((order, ctx) => {
    try {
      const pid = ctx?.productId || order?.productId || order?.product?.productId || order?.product?._id || null;
      if (!pid) return;
      const prod = (products || []).find(p => (p.productId || p._id) === pid);
      const wasLowStock = ctx?.initialAvailability === 'Low stock' || prod?.availability === 'Low stock';
      if (wasLowStock) {
        setLowStockOrdersSession((n) => n + 1);
      }
    } catch (_) {
      // no-op: keep changes minimal per request
    }
  }, [products]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>{loadingMessage || "Loading products..."}</p>
      </div>
    );
  }

  // Paginate products for display
  const startIndex = (currentPage - 1) * 9;
  const endIndex = startIndex + 9;
  const displayedProducts = products.slice(startIndex, endIndex);

  return (
    <div className={styles.productContainer}>
      {/* Mobile-only header (hidden on desktop via CSS) */}
      <div className={styles.mobileHeader}>
        <img src={logo} alt="Logo" className={styles.mobileLogo} />
        <a href="/dashboard/settings" className={styles.mobileSettings} aria-label="Settings">
          <img src={settingsIcon} alt="Settings" />
        </a>
      </div>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Product</h1>
        <div className={`${styles.searchContainer} ${isSearchActive ? styles.activeSearch : ''}`}>
          <button className={styles.searchButton} type="button" aria-label="Search">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </button>
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

          {isSearching && (
            <div className={styles.searchIndicator}>
              Searching...
            </div>
          )}
        </div>
      </div>

      {/* Overall Inventory Stats */}
      <div className={styles.inventoryOverview}>
        <h1>Overall Inventory</h1>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Categories</span>
            </div>
            <div className={styles.statValue}>{inventoryStats.categories}</div>
            <div className={styles.statInfoContainer}>
              <div className={styles.statLeftColumn}>
                <span className={styles.statSubtext}>Last 7 days</span>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Total Products</span>
            </div>
            <div className={styles.statValue}>{inventoryStats.totalProducts}</div>
            <div className={styles.statInfoContainer}>
              <div className={styles.statLeftColumn}>
                <span className={styles.statSubtext}>Last 7 days</span>
              </div>
              <div className={styles.statRightColumn}>
                <span className={styles.statRevenueValue}>₹{inventoryStats.totalRevenue}</span>
                <span className={styles.statRevenueLabel}>Revenue</span>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Top Selling</span>
            </div>
            <div className={styles.statValue}>{inventoryStats.topSelling}</div>
            <div className={styles.statInfoContainer}>
              <div className={styles.statLeftColumn}>
                <span className={styles.statSubtext}>Last 7 days</span>
              </div>
              <div className={styles.statRightColumn}>
                <span className={styles.statCostValue}>₹{inventoryStats.totalCost}</span>
                <span className={styles.statCostLabel}>Cost</span>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Low Stocks</span>
            </div>
            <div className={styles.statValue}>{inventoryStats.lowStocks.ordered + lowStockOrdersSession}</div>
            <div className={styles.statInfoContainer}>
              <div className={styles.statLeftColumn}>
                <span className={styles.statSubtext}>Ordered</span>
              </div>
              <div className={styles.statRightColumn}>
                <span className={styles.statNotInStockValue}>{inventoryStats.lowStocks.notInStock}</span>
                <span className={styles.statNotInStockLabel}>Not in stock</span>
              </div>
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
                    {/* Mobile-only info button */}
                    <button
                      type="button"
                      className={styles.infoBtn}
                      aria-label="Product details"
                      onClick={(e) => { e.stopPropagation(); setMobileInfoProduct(product); }}
                    >
                      <img src={infoIcon} alt="info" />
                    </button>
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
            <div className={styles.paginationLeft}>
              <button 
                className={styles.pageButton}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
            </div>
            
            <div className={styles.paginationCenter}>
              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
            </div>
            
            <div className={styles.paginationRight}>
              <button 
                className={styles.pageButton}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add Product button (mobile only) */}
      <button
        type="button"
        className={styles.fabAddButton}
        onClick={() => setShowAddModal(true)}
        aria-label="Add Product"
      >
        Add Product
      </button>

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
          onProductsAdded={(isCsvUpload, metadata) => handleProductAdded(isCsvUpload, metadata)}
        />
      )}

      {/* Product Order Handler */}
      {selectedProductId && (
        <ProductOrderHandler
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          refreshInventory={handleRefreshInventory}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      {/* Mobile info modal */}
      {mobileInfoProduct && (
        <div className={styles.mobileInfoOverlay} onClick={() => setMobileInfoProduct(null)}>
          <div className={styles.mobileInfoCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoHeader}>
              <div className={styles.infoTitle}>Products Details</div>
              <button className={styles.infoClose} onClick={() => setMobileInfoProduct(null)} aria-label="Close">×</button>
            </div>
            <div className={styles.infoName}>{mobileInfoProduct.productName}</div>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Price</span>
                <span className={styles.infoValue}>{formatCurrency(mobileInfoProduct.sellingPrice)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Quantity</span>
                <span className={styles.infoValue}>{mobileInfoProduct.quantity} {mobileInfoProduct.unit || 'Packets'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Threshold Value</span>
                <span className={styles.infoValue}>{mobileInfoProduct.thresholdValue} {mobileInfoProduct.unit || 'Packets'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Expiry Date</span>
                <span className={styles.infoValue}>{formatDate(mobileInfoProduct.expiryDate)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Product;
