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
    stockChange: 0
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
        setStats({
          totalRevenue: m.revenue?.current || 0,
          productsSold: m.productsSold?.current || 0,
          productsInStock: m.productsInStock?.current || 0,
          revenueChange: m.revenue?.change || 0,
          soldChange: m.productsSold?.change || 0,
          stockChange: m.productsInStock?.change || 0
        });
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
            {calculatePercentChange(stats.revenueChange || 0)} from last month
          </div>
        </div>
        
        <div className={styles.statsCard}>
          <h3>Products Sold</h3>
          <img src={salesIcon} alt="Products Sold" />
          <div className={styles.statsValue}>{stats.productsSold.toLocaleString()}</div>
          <div className={styles.statsChange}>
            {calculatePercentChange(stats.soldChange || 0)} from last month
          </div>
        </div>
        
        <div className={styles.statsCard}>
          <h3>Products In Stock</h3>
          <img src={inventoryQuantityIcon} alt="Products In Stock" />
          <div className={styles.statsValue}>{stats.productsInStock.toLocaleString()}</div>
          <div className={styles.statsChange}>
            {calculatePercentChange(stats.stockChange || 0)} from last month
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
                  <img 
                    src={product.imageUrl || '/placeholder-image.png'}
                    alt={product.productName}
                    loading="eager"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-image.png';
                    }}
                  />
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
