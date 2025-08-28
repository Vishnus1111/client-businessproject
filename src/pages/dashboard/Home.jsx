import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import styles from './Home.module.css';

const Home = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');

  useEffect(() => {
    fetchDashboardData();
    fetchChartData();
    fetchTopProducts();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch dashboard statistics
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        console.log('Dashboard data loaded:', data);
      } else {
        toast.error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchChartData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch sales and purchase data for charts
      const response = await fetch(`${API_BASE_URL}/api/statistics/chart-data-fixed?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChartData(data);
        console.log(`Chart data for ${selectedPeriod} period loaded:`, data);
      } else {
        toast.error('Failed to load chart data');
      }
    } catch (error) {
      console.error('Chart data fetch error:', error);
      toast.error('Error loading chart data');
    }
  };
  
  const fetchTopProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch top products
      const response = await fetch(`${API_BASE_URL}/api/top-products/top-products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTopProducts(data.products || []);
        console.log('Top products loaded:', data.products);
      } else {
        toast.error('Failed to load top products');
      }
    } catch (error) {
      console.error('Top products fetch error:', error);
      toast.error('Error loading top products');
    }
  };

  const StatCard = ({ title, value, subtitle, color, icon }) => (
    <div className={`${styles.statCard} ${styles[color]}`}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statContent}>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statTitle}>{title}</div>
        {subtitle && <div className={styles.statSubtitle}>{subtitle}</div>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.homeContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Home</h1>
          <input 
            type="text" 
            placeholder="Search here..." 
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Sales Overview */}
      <div className={styles.overviewSection}>
        <div className={styles.sectionHeader}>
          <h2>Sales Overview</h2>
        </div>
        <div className={styles.statsGrid}>
          <StatCard
            title="Sales"
            value={`₹ ${dashboardData?.salesOverview?.totalOrders || 0}`}
            color="blue"
            icon="💰"
          />
          <StatCard
            title="Revenue"
            value={`₹ ${dashboardData?.salesOverview?.totalRevenue?.toLocaleString() || 0}`}
            color="orange"
            icon="💳"
          />
          <StatCard
            title="Profit"
            value={`₹ ${dashboardData?.profitMetrics?.totalProfit?.toLocaleString() || 0}`}
            color="green"
            icon="📊"
          />
          <StatCard
            title="Cost"
            value={`₹ ${dashboardData?.inventoryCost?.totalCost?.toLocaleString() || 0}`}
            color="purple"
            icon="💸"
          />
        </div>
      </div>

      {/* Purchase Overview */}
      <div className={styles.overviewSection}>
        <div className={styles.sectionHeader}>
          <h2>Purchase Overview</h2>
        </div>
        <div className={styles.statsGrid}>
          <StatCard
            title="Purchase"
            value={dashboardData?.purchaseOverview?.totalPurchases || 0}
            color="blue"
            icon="🛒"
          />
          <StatCard
            title="Cost"
            value={`₹ ${dashboardData?.purchaseOverview?.totalCost?.toLocaleString() || 0}`}
            color="orange"
            icon="💰"
          />
          <StatCard
            title="Cancel"
            value={dashboardData?.orderMetrics?.cancelledOrders || 0}
            color="green"
            icon="❌"
          />
          <StatCard
            title="Return"
            value={`₹ ${dashboardData?.orderMetrics?.returnAmount?.toLocaleString() || 0}`}
            color="purple"
            icon="🔄"
          />
        </div>
      </div>

      {/* Bottom Section */}
      <div className={styles.bottomSection}>
        {/* Sales & Purchase Chart */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h3>Sales & Purchase</h3>
            <div className={styles.periodSelector}>
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className={styles.periodSelect}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <div className={styles.chartPlaceholder}>
              <div className={styles.chartBars}>
                {chartData && chartData.data && chartData.data.dailyBreakdown ? (
                  Object.keys(chartData.data.dailyBreakdown).map((day, index) => {
                    const dayData = chartData.data.dailyBreakdown[day];
                    const maxValue = Math.max(
                      ...Object.values(chartData.data.dailyBreakdown).map(d => Math.max(d.purchases || 0, d.sales || 0))
                    );
                    const purchaseHeight = maxValue ? ((dayData.purchases || 0) / maxValue) * 80 : 0;
                    const salesHeight = maxValue ? ((dayData.sales || 0) / maxValue) * 80 : 0;
                    
                    return (
                      <div key={index} className={styles.chartBar}>
                        <div className={styles.barLabel}>{day.substring(0, 3)}</div>
                        <div 
                          className={styles.barPurchase} 
                          style={{height: `${purchaseHeight}%`}}
                          title={`Purchases: ₹${(dayData.purchases || 0).toLocaleString()}`}
                        ></div>
                        <div 
                          className={styles.barSales} 
                          style={{height: `${salesHeight}%`}}
                          title={`Sales: ₹${(dayData.sales || 0).toLocaleString()}`}
                        ></div>
                      </div>
                    );
                  })
                ) : (
                  [...Array(7)].map((_, index) => (
                    <div key={index} className={styles.chartBar}>
                      <div className={styles.barPurchase} style={{height: `${Math.random() * 80 + 10}%`}}></div>
                      <div className={styles.barSales} style={{height: `${Math.random() * 60 + 20}%`}}></div>
                    </div>
                  ))
                )}
              </div>
              <div className={styles.chartSummary}>
                {chartData && chartData.data && chartData.data.summary && (
                  <div className={styles.chartTotals}>
                    <div>Total Sales: ₹{(chartData.data.summary.totalSales || 0).toLocaleString()}</div>
                    <div>Total Purchases: ₹{(chartData.data.summary.totalPurchases || 0).toLocaleString()}</div>
                    <div>Profit: ₹{(chartData.data.summary.profit || 0).toLocaleString()}</div>
                  </div>
                )}
              </div>
              <div className={styles.chartLegend}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{background: '#3498db'}}></div>
                  <span>Purchase</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{background: '#2ecc71'}}></div>
                  <span>Sales</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={styles.rightSidebar}>
          {/* Inventory Summary */}
          <div className={styles.summaryCard}>
            <h3>Inventory Summary</h3>
            <div className={styles.inventoryItems}>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}>📦</div>
                <div className={styles.inventoryContent}>
                  <span className={styles.inventoryLabel}>Quantity in Hand</span>
                  <span className={styles.inventoryValue}>
                    {dashboardData?.inventoryMetrics?.totalQuantity || 0}
                  </span>
                </div>
              </div>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}>📥</div>
                <div className={styles.inventoryContent}>
                  <span className={styles.inventoryLabel}>To be received</span>
                  <span className={styles.inventoryValue}>
                    {dashboardData?.inventoryMetrics?.expectedStock || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Summary */}
          <div className={styles.summaryCard}>
            <h3>Product Summary</h3>
            <div className={styles.inventoryItems}>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}>🏪</div>
                <div className={styles.inventoryContent}>
                  <span className={styles.inventoryLabel}>Number of Suppliers</span>
                  <span className={styles.inventoryValue}>
                    {dashboardData?.productMetrics?.suppliersCount || 0}
                  </span>
                </div>
              </div>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}>📋</div>
                <div className={styles.inventoryContent}>
                  <span className={styles.inventoryLabel}>Number of Categories</span>
                  <span className={styles.inventoryValue}>
                    {dashboardData?.productMetrics?.categoriesCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className={styles.summaryCard}>
            <h3>Top Products</h3>
            <div className={styles.topProductsList}>
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={product._id || index} className={styles.topProductItem}>
                    {product.imageUrl && (
                      <div className={styles.productImage}>
                        <img 
                          src={product.imageUrl}
                          alt={product.productName}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder-image.png';
                          }}
                        />
                      </div>
                    )}
                    <span className={styles.productName}>{product.productName}</span>
                    <div className={styles.productRating}>
                      {product.ratingStars || '★'.repeat(Math.round(product.averageRating || 0))}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noProducts}>No top-rated products found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
