import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import AddProductForm from './AddProductForm';
import CSVUploadModal from './CSVUploadModal';
import ProductDetailModal from './ProductDetailModal';
import styles from './Product.module.css';

const Product = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIndividualForm, setShowIndividualForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inventoryStats, setInventoryStats] = useState({
    categories: 0,
    totalProducts: 0,
    totalRevenue: 0,
    totalCost: 0,
    topSelling: 0,
    lowStocks: { ordered: 0, notInStock: 0 }
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const searchInputRef = useRef(null);

  const fetchProducts = useCallback(async (searchTerm = '') => {
    console.log("🔍 fetchProducts called - starting to fetch products...");
    
    try {
      setLoading(true);
      setIsSearching(!!searchTerm);
      const token = localStorage.getItem('token');
      
      let url = `${API_BASE_URL}/api/products/all`;
      if (searchTerm.trim()) {
        url = `${API_BASE_URL}/api/products/search?query=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=10`;
      }

      console.log("🌐 Making API request to:", url);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ API response received:", data);
        
        if (searchTerm.trim()) {
          setProducts(data.results?.products || []);
          setTotalPages(data.results?.pagination?.totalPages || 1);
          console.log("📊 Updated products (search mode):", data.results?.products?.length || 0);
        } else {
          setProducts(data.products || []);
          setTotalPages(Math.ceil((data.products?.length || 0) / 10));
          console.log("📊 Updated products (all mode):", data.products?.length || 0);
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
  }, [currentPage]);

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
          totalRevenue: data.overallInventory?.totalProducts?.revenue || 0,
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

  // Debounced search effect with better focus management
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Store current focus state and cursor position
      const wasSearchFocused = document.activeElement === searchInputRef.current;
      const cursorPosition = searchInputRef.current?.selectionStart || 0;
      
      const performSearch = async () => {
        if (searchQuery !== '') {
          await fetchProducts(searchQuery);
        } else if (searchQuery === '') {
          await fetchProducts();
        }
        
        // Restore focus and cursor position after search completes
        if (wasSearchFocused && searchInputRef.current) {
          requestAnimationFrame(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
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
  };

  // Prevent blur on search input during search operations
  const handleSearchBlur = (e) => {
    setSearchInputFocused(false);
  };

  // Handle search input focus
  const handleSearchFocus = () => {
    setSearchInputFocused(true);
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
    if (searchQuery.trim()) {
      fetchProducts(searchQuery);
    } else {
      fetchProducts();
    }
    fetchInventoryStats();
    console.log("📝 Refresh functions called: fetchProducts() and fetchInventoryStats()");
  };

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
  const displayedProducts = searchQuery.trim() ? products : products.slice(startIndex, endIndex);

  return (
    <div className={styles.productContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Product</h1>
        <div className={styles.searchContainer}>
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search products by name, ID, category, price, quantity, expiry date..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={handleSearch}
            onBlur={handleSearchBlur}
            onFocus={handleSearchFocus}
            autoComplete="off"
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
                  onClick={() => setSelectedProduct(product)}
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
      
      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onPlaceOrder={(orderData) => {
            console.log('Order placed:', orderData);
            toast.success(`Order placed for ${orderData.quantity} ${selectedProduct.unit || 'units'} of ${selectedProduct.productName}`);
            // Here you would typically call an API to place the order
          }}
        />
      )}
    </div>
  );
};

export default Product;
