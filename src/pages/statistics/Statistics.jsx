import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './Statistics.module.css';
import API_BASE_URL from '../config';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

const Statistics = () => {
  const [period, setPeriod] = useState('weekly');
  const [chartData, setChartData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    productsSold: 0,
    productsInStock: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to format currency
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString()}`;
  };

  // Fetch chart data based on selected period
  // Fetch top rated products
  const fetchTopProducts = async () => {
    try {
      console.log('Fetching top products data...');
      const response = await axios.get(`${API_BASE_URL}/api/top-products/top-products`);
      
      if (response.data && response.data.success) {
        console.log('Top products response:', response.data);
        setTopProducts(response.data.products || []);
      } else {
        console.error('Top products error:', response.data);
      }
    } catch (err) {
      console.error('Error fetching top products:', err);
    }
  };

  useEffect(() => {
    // Prepare data for Chart.js - moved inside useEffect to avoid dependency issues
    const prepareChartData = (data) => {
      if (!data) return null;
      
      let labels = [];
      let salesData = [];
      let purchaseData = [];
  
      if (period === 'weekly' && data.dailyBreakdown) {
        labels = data.dailyBreakdown.map(day => day.day);
        salesData = data.dailyBreakdown.map(day => day.sales);
        purchaseData = data.dailyBreakdown.map(day => day.purchases);
      } else if (period === 'monthly' && data.monthlyBreakdown) {
        labels = data.monthlyBreakdown.map(month => month.month);
        salesData = data.monthlyBreakdown.map(month => month.sales);
        purchaseData = data.monthlyBreakdown.map(month => month.purchases);
      } else if (period === 'yearly' && data.yearlyBreakdown) {
        labels = data.yearlyBreakdown.map(year => year.year);
        salesData = data.yearlyBreakdown.map(year => year.sales);
        purchaseData = data.yearlyBreakdown.map(year => year.purchases);
      }
  
      return {
        labels,
        datasets: [
          {
            label: 'Sales',
            data: salesData,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1
          },
          {
            label: 'Purchase',
            data: purchaseData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1
          }
        ]
      };
    };

    const fetchChartData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching ${period} statistics data...`);
        
        // Fetch chart data
        const chartResponse = await axios.get(`${API_BASE_URL}/api/statistics/chart-data-realtime`, {
          params: { period }
        });
        
        console.log('Chart data response:', chartResponse.data);
        
        if (chartResponse.data && chartResponse.data.success) {
          setChartData(prepareChartData(chartResponse.data.data));
        } else {
          console.error('Chart data error:', chartResponse.data);
          setError('Failed to load chart data');
        }

        // Fetch top products
        await fetchTopProducts();

        // Fetch stats data for overview cards
        try {
          const statsResponse = await axios.get(`${API_BASE_URL}/api/statistics/overview`);
          
          console.log('Stats data response:', statsResponse.data);
          
          if (statsResponse.data && statsResponse.data.success) {
            setStats({
              totalRevenue: statsResponse.data.totalRevenue || 0,
              productsSold: statsResponse.data.productsSold || 0,
              productsInStock: statsResponse.data.productsInStock || 0
            });
          }
        } catch (statsError) {
          console.error('Error fetching stats:', statsError);
          setError('Failed to load statistics data');
        }
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to connect to statistics API');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [period]);

  // Calculate percentage change
  const calculatePercentChange = (value) => {
    return value >= 0 ? `+${value}%` : `${value}%`;
  };

  return (
    <div className={styles.statisticsContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Statistics & Analytics</h1>
        <select 
          className={styles.periodSelect}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="weekly">Weekly (Sunday-Saturday)</option>
          <option value="monthly">Monthly (All 12 Months)</option>
          <option value="yearly">Yearly (Current Year)</option>
        </select>
      </div>
      
      {loading ? (
        <div className={styles.loading}>Loading statistics...</div>
      ) : (
        <>
          {error && (
            <div className={styles.errorNotice}>{error}</div>
          )}
          
          <div className={styles.statsCards}>
            <div className={styles.statsCard}>
              <h3>Total Revenue</h3>
              <div className={styles.statsValue}>{formatCurrency(stats.totalRevenue)}</div>
              <div className={styles.statsChange}>{calculatePercentChange(20.1)} from last month</div>
            </div>
            
            <div className={styles.statsCard}>
              <h3>Products Sold</h3>
              <div className={styles.statsValue}>{stats.productsSold.toLocaleString()}</div>
              <div className={styles.statsChange}>{calculatePercentChange(80.1)} from last month</div>
            </div>
            
            <div className={styles.statsCard}>
              <h3>Products In Stock</h3>
              <div className={styles.statsValue}>{stats.productsInStock.toLocaleString()}</div>
              <div className={styles.statsChange}>{calculatePercentChange(13.5)} from last month</div>
            </div>
          </div>
          
          <div className={styles.chartContainer}>
            <h2>Sales & Purchase</h2>
            <div className={styles.periodSelector}>
              <button 
                className={period === 'weekly' ? styles.active : ''} 
                onClick={() => setPeriod('weekly')}
              >
                Weekly
              </button>
              <button 
                className={period === 'monthly' ? styles.active : ''} 
                onClick={() => setPeriod('monthly')}
              >
                Monthly
              </button>
              <button 
                className={period === 'yearly' ? styles.active : ''} 
                onClick={() => setPeriod('yearly')}
              >
                Yearly
              </button>
            </div>
            
            {chartData ? (
              <div className={styles.chart}>
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(200, 200, 200, 0.2)'
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.dataset.label}: ₹${context.raw.toLocaleString()}`;
                          }
                        }
                      }
                    }
                  }}
                  height={300}
                />
              </div>
            ) : (
              <div className={styles.noData}>No data available for the selected period</div>
            )}
          </div>
          
          <div className={styles.topProducts}>
            <h2>Top Products</h2>
            <div className={styles.topProductsList}>
              {topProducts.length > 0 ? (
                topProducts.map((product) => (
                  <div key={product._id} className={styles.topProductItem}>
                    <div className={styles.productName}>{product.productName}</div>
                    <div className={styles.productDetails}>
                      <div className={styles.productRating}>
                        {product.ratingStars || ('★'.repeat(Math.round(product.averageRating)) + '☆'.repeat(5 - Math.round(product.averageRating)))}
                      </div>
                      <div className={styles.ratingValue}>
                        {product.averageRating.toFixed(1)} / 5 ({product.totalRatings} ratings)
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noProducts}>No rated products available</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Statistics;
