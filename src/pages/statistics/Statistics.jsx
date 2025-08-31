import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import styles from './Statistics.module.css';
import calendar from '../../assets/statistics/Calendar.png';
import revenueIcon from '../../assets/statistics/dollar-sign.png';
import salesIcon from '../../assets/statistics/credit-card.png';
import inventoryQuantityIcon from '../../assets/statistics/activity.png';

const Statistics = () => {
  // Removed unused state variable: dashboardData
  const [chartData, setChartData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    productsSold: 0,
    productsInStock: 0,
    revenueChange: 0,
    soldChange: 0,
  stockChange: 0,
  // previous period values for correct label logic
  revenuePrev: 0,
  soldPrev: 0,
  stockPrev: 0
  });

  useEffect(() => {
    fetchChartData();
    fetchDashboardData();
    fetchTopProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      // Map UI period to backend expected values
      const periodMap = { weekly: 'week', monthly: 'month', yearly: 'year' };
      const period = periodMap[selectedPeriod] || 'week';
      const t = Date.now();

      const response = await fetch(`${API_BASE_URL}/api/statistics/dashboard-summary?period=${period}&_t=${t}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const m = data?.metrics || {};
        let nextStats = {
          totalRevenue: m.revenue?.current || 0,
          productsSold: m.productsSold?.current || 0,
          productsInStock: m.productsInStock?.current || 0,
          revenueChange: m.revenue?.change || 0,
          soldChange: m.productsSold?.change || 0,
          stockChange: m.productsInStock?.change || 0,
          revenuePrev: m.revenue?.previous || 0,
          soldPrev: m.productsSold?.previous || 0,
          stockPrev: m.productsInStock?.previous || 0
        };

        // Frontend-only fallback: if both revenue and productsSold are 0, compute from orders
        if ((nextStats.totalRevenue === 0) && (nextStats.productsSold === 0)) {
          try {
            const ordersRes = await fetch(`${API_BASE_URL}/api/orders/orders?limit=500&_t=${t}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            if (ordersRes.ok) {
              const ordersJson = await ordersRes.json();
              const orders = Array.isArray(ordersJson.orders) ? ordersJson.orders : [];

              // Determine time window based on selectedPeriod
              const now = new Date();
              let start;
              if (selectedPeriod === 'weekly') {
                start = new Date(now);
                start.setDate(now.getDate() - 6);
                start.setHours(0, 0, 0, 0);
              } else if (selectedPeriod === 'monthly') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
              } else {
                // yearly
                start = new Date(now.getFullYear(), 0, 1);
              }
              const end = new Date(now);
              end.setHours(23, 59, 59, 999);

              const inWindow = (d) => d >= start && d <= end;
              const notCancelled = (o) => (o.orderStatus || '').toLowerCase() !== 'cancelled';
              const parseDate = (o) => new Date(o.createdAt || o.orderDate || o.date || 0);

              let computedRevenue = 0;
              let computedQty = 0;
              orders.filter(notCancelled).forEach(o => {
                const d = parseDate(o);
                if (inWindow(d)) {
                  computedRevenue += Number(o.totalAmount || 0);
                  computedQty += Number(o.quantityOrdered || 0);
                }
              });

              nextStats.totalRevenue = computedRevenue;
              nextStats.productsSold = computedQty;
            }
          } catch (e) {
            console.warn('Stats fallback from orders failed:', e);
          }
        }

        setStats(nextStats);
        console.log('Dashboard summary loaded:', { period, stats: m });
      } else {
        toast.error('Failed to load dashboard summary');
      }
    } catch (error) {
      console.error('Dashboard summary fetch error:', error);
      toast.error('Error loading dashboard summary');
    }
  };
  
  const fetchChartData = async () => {
    try {
      const token = localStorage.getItem('token');
      const t = Date.now();
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

        // Always recompute sales from orders and patch only sales + totalSales (keep purchases/others intact)
        try {
          const isWeekly = selectedPeriod === 'weekly';
          const isMonthly = selectedPeriod === 'monthly';
          const isYearly = selectedPeriod === 'yearly';

          const ordersRes = await fetch(`${API_BASE_URL}/api/orders/orders?limit=500&_t=${t}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (ordersRes.ok) {
            const ordersJson = await ordersRes.json();
            const orders = Array.isArray(ordersJson.orders) ? ordersJson.orders : [];

            const safeDate = (o) => new Date(o.createdAt || o.orderDate || o.date || 0);
            const amount = (o) => Number(o.totalAmount || 0);
            const notCancelled = (o) => (o.orderStatus || '').toLowerCase() !== 'cancelled';

            if (isWeekly && Array.isArray(data?.data?.dailyBreakdown)) {
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              const start = new Date(today);
              start.setDate(today.getDate() - 6);
              start.setHours(0, 0, 0, 0);

              const dayKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
              const salesMap = new Map();
              for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                salesMap.set(dayKey(d), 0);
              }

              orders.filter(notCancelled).forEach(o => {
                const d = safeDate(o);
                if (d >= start && d <= today) {
                  const key = dayKey(d);
                  if (salesMap.has(key)) {
                    salesMap.set(key, salesMap.get(key) + amount(o));
                  }
                }
              });

              const patched = data.data.dailyBreakdown.map(entry => {
                const key = dayKey(new Date(entry.date));
                const sales = salesMap.has(key) ? salesMap.get(key) : (entry.sales || 0);
                return { ...entry, sales };
              });
              data.data.dailyBreakdown = patched;

              const totalSales = patched.reduce((sum, e) => sum + (Number(e.sales) || 0), 0);
              const totalPurchases = patched.reduce((sum, e) => sum + (Number(e.purchases) || 0), 0);
              data.data.summary = { ...(data.data.summary || {}), totalSales, totalPurchases };
            }

            if (isMonthly && Array.isArray(data?.data?.monthlyBreakdown)) {
              const now = new Date();
              const year = now.getFullYear();
              const byMonth = Array(12).fill(0);

              orders.filter(notCancelled).forEach(o => {
                const d = safeDate(o);
                if (d.getFullYear() === year) {
                  byMonth[d.getMonth()] += amount(o);
                }
              });

              const monthIndex = (name) => new Date(`${name} 1, ${year}`).getMonth();
              const patched = data.data.monthlyBreakdown.map(entry => {
                const idx = monthIndex(entry.month);
                const sales = Number.isFinite(byMonth[idx]) ? byMonth[idx] : (entry.sales || 0);
                return { ...entry, sales };
              });
              data.data.monthlyBreakdown = patched;

              const totalSales = patched.reduce((sum, e) => sum + (Number(e.sales) || 0), 0);
              const totalPurchases = patched.reduce((sum, e) => sum + (Number(e.purchases) || 0), 0);
              data.data.summary = { ...(data.data.summary || {}), totalSales, totalPurchases };
            }

            if (isYearly && data?.data?.yearlyData) {
              const now = new Date();
              const year = now.getFullYear();
              const yearSales = orders.filter(notCancelled).reduce((sum, o) => {
                const d = safeDate(o);
                return d.getFullYear() === year ? sum + amount(o) : sum;
              }, 0);
              data.data.yearlyData = { ...data.data.yearlyData, sales: yearSales };

              const yearPurchases = Number(data?.data?.yearlyData?.purchases || 0);
              data.data.summary = { ...(data.data.summary || {}), totalSales: yearSales, totalPurchases: yearPurchases };
            }
          }
        } catch (e) {
          console.warn('Sales recompute from orders skipped due to error:', e);
        }

        // Ensure totals are always in sync with the current breakdown
        try {
          const d = data?.data;
          if (d) {
            if (selectedPeriod === 'weekly' && Array.isArray(d.dailyBreakdown)) {
              const totalSales = d.dailyBreakdown.reduce((s, e) => s + (Number(e.sales) || 0), 0);
              const totalPurchases = d.dailyBreakdown.reduce((s, e) => s + (Number(e.purchases) || 0), 0);
              data.data.summary = { ...(d.summary || {}), totalSales, totalPurchases };
            } else if (selectedPeriod === 'monthly' && Array.isArray(d.monthlyBreakdown)) {
              const totalSales = d.monthlyBreakdown.reduce((s, e) => s + (Number(e.sales) || 0), 0);
              const totalPurchases = d.monthlyBreakdown.reduce((s, e) => s + (Number(e.purchases) || 0), 0);
              data.data.summary = { ...(d.summary || {}), totalSales, totalPurchases };
            } else if (selectedPeriod === 'yearly' && d.yearlyData) {
              const totalSales = Number(d.yearlyData.sales || 0);
              const totalPurchases = Number(d.yearlyData.purchases || 0);
              data.data.summary = { ...(d.summary || {}), totalSales, totalPurchases };
            }
          }
        } catch {}

        setChartData(data);
        console.log(`Chart data for ${selectedPeriod} period loaded:`, data);
      } else {
        toast.error('Failed to load chart data');
      }
    } catch (error) {
      console.error('Chart data fetch error:', error);
      toast.error('Error loading chart data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTopProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch top products (same as Home page)
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

  // Calculate percentage change
  const calculatePercentChange = (value) => {
    return value >= 0 ? `+${value}%` : `${value}%`;
  };

  // Build the comparison label text based on selected period
  const getComparisonSuffix = () => {
    if (selectedPeriod === 'weekly') return 'last day';
    if (selectedPeriod === 'monthly') return 'last month';
    return 'last year';
  };

  // Determine the displayed percent, forcing 100% if previous value is 0
  const getDisplayedPercent = (changeValue, previousValue) => {
    const val = (previousValue === 0) ? 100 : (changeValue || 0);
    return calculatePercentChange(val);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading statistics...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.statisticsContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Statistics & Analytics</h1>
      </div>
      
      <div className={styles.statsCards}>
        <div className={styles.statsCard}>
          <h3>Total Revenue</h3>
          <img src={revenueIcon} alt="Revenue" />
          <div className={styles.statsValue}>{formatCurrency(stats.totalRevenue)}</div>
          <div className={styles.statsChange}>
            {getDisplayedPercent(stats.revenueChange, stats.revenuePrev)} from {getComparisonSuffix()}
          </div>
        </div>
        
        <div className={styles.statsCard}>
          <h3>Products Sold</h3>
          <img src={salesIcon} alt="Products Sold" />
          <div className={styles.statsValue}>{stats.productsSold.toLocaleString()}</div>
          <div className={styles.statsChange}>
            {getDisplayedPercent(stats.soldChange, stats.soldPrev)} from {getComparisonSuffix()}
          </div>
        </div>
        
        <div className={styles.statsCard}>
          <h3>Products In Stock</h3>
          <img src={inventoryQuantityIcon} alt="Products In Stock" />
          <div className={styles.statsValue}>{stats.productsInStock.toLocaleString()}</div>
          <div className={styles.statsChange}>
            {(() => {
              // If previous period has no value (0 or missing) and current > 0, display +100% for all periods.
              // This keeps the UI responsive even when backend previous is absent.
              const backendMaskedZero = (stats.stockChange === 0 && stats.stockPrev === stats.productsInStock);
              const prevZero = stats.stockPrev === 0;
              const prevMissing = stats.stockPrev === null || stats.stockPrev === undefined || Number.isNaN(stats.stockPrev);
              const currentPositive = (stats.productsInStock || 0) > 0;
              if (currentPositive && (prevZero || prevMissing || backendMaskedZero)) {
                return '+100%';
              }
              return getDisplayedPercent(stats.stockChange, stats.stockPrev);
            })()} from {getComparisonSuffix()}
          </div>
        </div>
      </div>
      
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
                    let roundedMax = Math.ceil(maxValue / 10000) * 10000;
                    if (!roundedMax || roundedMax === 0) roundedMax = 1000;

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
                    let roundedMax = Math.ceil(maxValue / 10000) * 10000;
                    if (!roundedMax || roundedMax === 0) roundedMax = 1000;

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
                        let roundedMax = Math.ceil(maxValue / 10000) * 10000;
                        if (!roundedMax || roundedMax === 0) roundedMax = 1000;

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
                  <div className={styles.noData}>
                    <p>No weekly data available</p>
                  </div>
                )}

                {(!chartData?.data?.monthlyBreakdown && selectedPeriod === 'monthly') && (
                  <div className={styles.noData}>
                    <p>No monthly data available</p>
                  </div>
                )}

                {(!chartData?.data?.yearlyData && selectedPeriod === 'yearly') && (
                  <div className={styles.noData}>
                    <p>No yearly data available</p>
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

      <div className={styles.topProducts}>
        <h2>Top Products</h2>
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
  );
};

export default Statistics;
