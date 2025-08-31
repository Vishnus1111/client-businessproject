import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import styles from './Home.module.css';
import salesale from '../../assets/dashboard/Sales.png';
import revenueIcon from '../../assets/dashboard/Revenue.png';
import profitIcon from '../../assets/dashboard/Profit.png';
import costIcon from '../../assets/dashboard/Cost.png';
import purchaseIcon from '../../assets/dashboard/Purchase.png';
import costIcon2 from '../../assets/dashboard/Cost (1).png';
import cancelIcon from '../../assets/dashboard/Cancel.png';
import returnIcon from '../../assets/dashboard/return.png';
import inventoryQuantityIcon from '../../assets/dashboard/Quantity.png';
import inventoryReceivedIcon from '../../assets/dashboard/inventoryreceived.png';
import supplierIcon from '../../assets/dashboard/pro. summary.png';
import categoryIcon from '../../assets/dashboard/pro. Categories.png';
import calendar from '../../assets/statistics/Calendar.png';

const Home = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  // Additional metrics derived from available endpoints
  const [cancelMetrics, setCancelMetrics] = useState({ count: 0 });
  const [returnMetrics, setReturnMetrics] = useState({ count: 0, amount: 0 });

  // Effects will be attached after fetch functions are defined

  const fetchDashboardData = useCallback(async () => {
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
        // In parallel, enrich with cancel/return invoice metrics if available
        // These endpoints already exist; we'll compute counts and totals client-side.
        try {
          // Get cancelled invoices once, use it for both cancel count and return amount (sum of selling price)
          const cancelRes = await fetch(`${API_BASE_URL}/api/invoices?status=Cancelled`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (cancelRes.ok) {
            const cancelData = await cancelRes.json();
            const invoices = cancelData.invoices || [];
            const cancelCount = cancelData.totalInvoices || invoices.length;
            const returnAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
            setCancelMetrics({ count: cancelCount });
            setReturnMetrics({ count: cancelCount, amount: returnAmount });
          }
        } catch (e) {
          console.warn('Optional cancel/return metrics fetch failed:', e);
        }
      } else {
        toast.error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Error loading dashboard');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchChartData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const t = Date.now();
      
      // Use a single, consistent endpoint for all periods
      const endpoint = `${API_BASE_URL}/api/statistics/chart-data-fixed?period=${selectedPeriod}&_t=${t}`;
      
      // Fetch data from the selected endpoint
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChartData(data);
        console.log(`Chart data for ${selectedPeriod} loaded:`, data);
      } else {
        toast.error('Failed to load chart data');
      }
    } catch (error) {
      console.error('Chart data fetch error:', error);
      toast.error('Error loading chart data');
    }
  }, [selectedPeriod]);
  
  const fetchTopProducts = useCallback(async () => {
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
  }, []);

  // Load dashboard + top products on mount
  useEffect(() => {
    fetchDashboardData();
    fetchTopProducts();
  }, [fetchDashboardData, fetchTopProducts]);

  // Load chart when period changes
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

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

      {/* Main Dashboard Grid */}
      <div className={styles.dashboardGrid}>
        <div className={styles.leftColumn}>
          {/* Overviews Section - within left column */}
          <div className={styles.overviewsContainer}>
            {/* Sales Overview */}
            <div className={styles.overviewSection}>
              <div className={styles.sectionHeader}>
                <h2>Sales Overview</h2>
              </div>
              <div className={styles.statsGrid}>
                <StatCard
                  title="Sales"
                  value={`${dashboardData?.detailed?.sales?.totalOrders || 0}`}
                  color="blue"
                  icon={<img src={salesale} alt="Sales Cost" />}
                />
                <StatCard
                  title="Revenue"
                  value={`₹ ${(dashboardData?.detailed?.sales?.totalRevenue || 0).toLocaleString()}`}
                  color="orange"
                  icon={<img src={revenueIcon} alt="Revenue" />}
                />
                <StatCard
                  title="Profit"
                  value={`₹ ${(dashboardData?.detailed?.sales?.profit || 0).toLocaleString()}`}
                  color="green"
                  icon={<img src={profitIcon} alt="Profit" />}
                />
                <StatCard
                  title="Cost"
                  value={`₹ ${(dashboardData?.detailed?.sales?.totalCost || 0).toLocaleString()}`}
                  color="purple"
                  icon={<img src={costIcon} alt="Cost" />}
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
                  value={dashboardData?.overallInventory?.totalProducts?.recent || 0}
                  color="blue"
                  icon={<img src={purchaseIcon} alt="Purchase" />}
                />
                <StatCard
                  title="Cost"
                  value={`₹ ${((((chartData?.data?.summary?.totalPurchases) || 0) * 2).toLocaleString())}`}
                  color="orange"
                  icon={<img src={costIcon2} alt="Cost" />}
                />
                <StatCard
                  title="Cancel"
                  value={cancelMetrics.count || 0}
                  color="green"
                  icon={<img src={cancelIcon} alt="Cancel" />}
                />
                <StatCard
                  title="Return"
                  value={`₹ ${(returnMetrics.amount || 0).toLocaleString()}`}
                  color="purple"
                  icon={<img src={returnIcon} alt="Return" />}
                />
              </div>
            </div>
          </div>

          {/* Sales & Purchase Chart */}
          <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h3>Sales & Purchase</h3>
            <div className={styles.periodSelector}>
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className={styles.periodSelect}
                style={{
                  backgroundImage: `url(${calendar})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: '10px center',
                  backgroundSize: '18px',
                  paddingLeft: '36px'
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <div className={styles.chartPlaceholder}>
              <div className={styles.yAxis}>
                {(() => {
                  // Dynamic y-axis based on max value
                  const maxValue = chartData && chartData.data ? (() => {
                    if (selectedPeriod === 'weekly' && chartData.data.dailyBreakdown) {
                      return Math.max(...chartData.data.dailyBreakdown.map(d => 
                        Math.max(((d.purchases || 0) * 2), d.sales || 0)
                      ));
                    }
                    if (selectedPeriod === 'monthly' && chartData.data.monthlyBreakdown) {
                      return Math.max(...chartData.data.monthlyBreakdown.map(d => 
                        Math.max(((d.purchases || 0) * 2), d.sales || 0)
                      ));
                    }
                    if (selectedPeriod === 'yearly' && chartData.data.yearlyData) {
                      return Math.max(((chartData.data.yearlyData.purchases || 0) * 2), chartData.data.yearlyData.sales || 0);
                    }
                    return 60000;
                  })() : 60000;
                  
                  // Round to next nice number (multiple of 10000)
                  let roundedMax = Math.ceil(maxValue / 10000) * 10000;
                  if (!roundedMax || roundedMax === 0) roundedMax = 1000;
                  const yAxisValues = [];
                  const step = roundedMax / 6;
                  
                  for (let i = 6; i >= 0; i--) {
                    yAxisValues.push(Math.round(step * i));
                  }
                  
                  return yAxisValues.map((value, index) => (
                    <div key={index} className={styles.yAxisLabel}>
                      {value.toLocaleString()}
                    </div>
                  ));
                })()}
              </div>
              
              <div className={styles.chartContent}>
                <div className={styles.chartGrid}>
                  {(() => {
                    // Use same values as y-axis
                    const maxValue = chartData && chartData.data ? (() => {
                      if (selectedPeriod === 'weekly' && chartData.data.dailyBreakdown) {
                        return Math.max(...chartData.data.dailyBreakdown.map(d => 
                          Math.max(((d.purchases || 0) * 2), d.sales || 0)
                        ));
                      }
                      if (selectedPeriod === 'monthly' && chartData.data.monthlyBreakdown) {
                        return Math.max(...chartData.data.monthlyBreakdown.map(d => 
                          Math.max(((d.purchases || 0) * 2), d.sales || 0)
                        ));
                      }
                      if (selectedPeriod === 'yearly' && chartData.data.yearlyData) {
                        return Math.max(((chartData.data.yearlyData.purchases || 0) * 2), chartData.data.yearlyData.sales || 0);
                      }
                      return 60000;
                    })() : 60000;
                    
                    let roundedMax = Math.ceil(maxValue / 10000) * 10000;
                    if (!roundedMax || roundedMax === 0) roundedMax = 1000;
                    const yAxisValues = [];
                    const step = roundedMax / 6;
                    
                    for (let i = 6; i >= 0; i--) {
                      yAxisValues.push(Math.round(step * i));
                    }
                    
                    return yAxisValues.map((value, index) => (
                      <div key={index} className={styles.gridLine}></div>
                    ));
                  })()}
                </div>
                
                <div className={styles.chartBars}>
                  {selectedPeriod === 'weekly' && chartData?.data?.dailyBreakdown && (
                    chartData.data.dailyBreakdown.map((dayData, index) => {
                      // Calculate max value from all data for proper scaling
                      const maxValue = Math.max(...chartData.data.dailyBreakdown.map(d => 
                          Math.max(((d.purchases || 0) * 2), d.sales || 0)
                        ));
                      // Round to next nice number
                      const roundedMax = Math.ceil(maxValue / 10000) * 10000;

                        const purchaseHeight = roundedMax ? (((dayData.purchases || 0) * 2) / roundedMax) * 100 : 0;
                      const salesHeight = roundedMax ? ((dayData.sales || 0) / roundedMax) * 100 : 0;
                      
                      return (
                        <div key={index} className={styles.chartBar}>
                          <div className={styles.barContainer}>
                            <div 
                              className={styles.barPurchase} 
                              style={{height: `${purchaseHeight}%`}}
                              title={`Purchases: ₹${(((dayData.purchases || 0) * 2)).toLocaleString()}`}
                            ></div>
                            <div 
                              className={styles.barSales} 
                              style={{height: `${salesHeight}%`}}
                              title={`Sales: ₹${(dayData.sales || 0).toLocaleString()}`}
                            ></div>
                          </div>
                          <div className={styles.barLabel}>{dayData.day.substring(0, 3)}</div>
                        </div>
                      );
                    })
                  )}
                  
                  {selectedPeriod === 'monthly' && chartData?.data?.monthlyBreakdown && (
                    chartData.data.monthlyBreakdown.map((monthData, index) => {
                      // Calculate max value from all data for proper scaling
                      const maxValue = Math.max(...chartData.data.monthlyBreakdown.map(d => 
                          Math.max(((d.purchases || 0) * 2), d.sales || 0)
                        ));
                      // Round to next nice number
                      const roundedMax = Math.ceil(maxValue / 10000) * 10000;

                      const purchaseHeight = roundedMax ? (((monthData.purchases || 0) * 2) / roundedMax) * 100 : 0;
                      const salesHeight = roundedMax ? ((monthData.sales || 0) / roundedMax) * 100 : 0;
                      
                      return (
                        <div key={index} className={styles.chartBar}>
                          <div className={styles.barContainer}>
                            <div 
                              className={styles.barPurchase} 
                              style={{height: `${purchaseHeight}%`}}
                              title={`Purchases: ₹${(((monthData.purchases || 0) * 2)).toLocaleString()}`}
                            ></div>
                            <div 
                              className={styles.barSales} 
                              style={{height: `${salesHeight}%`}}
                              title={`Sales: ₹${(monthData.sales || 0).toLocaleString()}`}
                            ></div>
                          </div>
                          <div className={styles.barLabel}>{monthData.month.substring(0, 3)}</div>
                        </div>
                      );
                    })
                  )}
                  
                  {selectedPeriod === 'yearly' && chartData?.data?.yearlyData && (
                    <div className={styles.chartBar}>
                      <div className={styles.barContainer}>
                        {/* Calculate max value for proper scaling */}
                        {(() => {
                          const maxValue = Math.max(
                            ((chartData.data.yearlyData.purchases || 0) * 2),
                            chartData.data.yearlyData.sales || 0
                          );
                          const roundedMax = Math.ceil(maxValue / 10000) * 10000;

                          const purchaseHeight = roundedMax ? (((chartData.data.yearlyData.purchases || 0) * 2) / roundedMax) * 100 : 0;
                          const salesHeight = roundedMax ? ((chartData.data.yearlyData.sales || 0) / roundedMax) * 100 : 0;
                          
                          return (
                            <>
                              <div 
                                className={styles.barPurchase} 
                                style={{height: `${purchaseHeight}%`}}
                                title={`Purchases: ₹${(((chartData.data.yearlyData.purchases || 0) * 2)).toLocaleString()}`}
                              ></div>
                              <div 
                                className={styles.barSales} 
                                style={{height: `${salesHeight}%`}}
                                title={`Sales: ₹${(chartData.data.yearlyData.sales || 0).toLocaleString()}`}
                              ></div>
                            </>
                          );
                        })()}
                      </div>
                      <div className={styles.barLabel}>{chartData.data.year}</div>
                    </div>
                  )}
                  
                  {(!chartData?.data?.dailyBreakdown && selectedPeriod === 'weekly') && (
                    [...Array(7)].map((_, index) => (
                      <div key={index} className={styles.chartBar}>
                        <div className={styles.barContainer}>
                          <div className={styles.barPurchase} style={{height: `${Math.random() * 40 + 10}%`}}></div>
                          <div className={styles.barSales} style={{height: `${Math.random() * 35 + 20}%`}}></div>
                        </div>
                        <div className={styles.barLabel}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index]}</div>
                      </div>
                    ))
                  )}
                  
                  {(!chartData?.data?.monthlyBreakdown && selectedPeriod === 'monthly') && (
                    [...Array(12)].map((_, index) => (
                      <div key={index} className={styles.chartBar}>
                        <div className={styles.barContainer}>
                          <div className={styles.barPurchase} style={{height: `${Math.random() * 40 + 10}%`}}></div>
                          <div className={styles.barSales} style={{height: `${Math.random() * 35 + 20}%`}}></div>
                        </div>
                        <div className={styles.barLabel}>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}</div>
                      </div>
                    ))
                  )}
                  
                  {(!chartData?.data?.yearlyData && selectedPeriod === 'yearly') && (
                    <div className={styles.chartBar}>
                      <div className={styles.barContainer}>
                        <div className={styles.barPurchase} style={{height: '40%'}}></div>
                        <div className={styles.barSales} style={{height: '60%'}}></div>
                      </div>
                      <div className={styles.barLabel}>{new Date().getFullYear()}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={styles.chartSummary}>
                {chartData && chartData.data && chartData.data.summary && (
                  <div className={styles.chartTotals}>
                    <div>Total Sales: ₹{(chartData.data.summary.totalSales || 0).toLocaleString()}</div>
                    <div>Total Purchases: ₹{(((chartData.data.summary.totalPurchases || 0) * 2)).toLocaleString()}</div>
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
  </div>

  {/* Right Column (Summaries + Top Products) */}
  <div className={styles.rightColumn}>
          {/* Inventory Summary */}
          <div className={styles.summaryCard}>
            <h3>Inventory Summary</h3>
            <div className={styles.inventoryItems}>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}><img src={inventoryQuantityIcon} alt="Inventory" /></div>
                <div className={styles.inventoryContent}>
                  <span className={styles.inventoryLabel}>Quantity in Hand</span>
                  <span className={styles.inventoryValue}>
                    {dashboardData?.inventoryMetrics?.totalQuantity || 0}
                  </span>
                </div>
              </div>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}><img src={inventoryReceivedIcon} alt="Incoming" /></div>
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
                <div className={styles.inventoryIcon}><img src={supplierIcon} alt="Suppliers" /></div>
                <div className={styles.inventoryContent}>
                  <span className={styles.inventoryLabel}>Number of Suppliers</span>
                  <span className={styles.inventoryValue}>
                    {dashboardData?.productMetrics?.suppliersCount || 0}
                  </span>
                </div>
              </div>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}><img src={categoryIcon} alt="Categories" /></div>
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
                    <div className={styles.productImage}>
                    {product.imageUrl ? (
                      <img 
                        src={(() => {
                          let url = product.imageUrl;
                          if (!url) return '';
                          if (url.startsWith('http')) return url;
                          // Normalize backslashes to forward slashes (if any)
                          url = url.replace(/\\\\/g, '/');
                          const clean = url.startsWith('/') ? url.slice(1) : url;
                          const path = clean.includes('uploads/') ? clean : `uploads/${clean}`;
                          return `${API_BASE_URL}/${path}`;
                        })()}
                        alt={product.productName}
                      />
                    ) : null}
                  </div>
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
