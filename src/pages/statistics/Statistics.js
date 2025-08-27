import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import './Statistics.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Statistics = () => {
  const [period, setPeriod] = useState('week');
  const [chartData, setChartData] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState({
    revenue: { current: 0, change: 0 },
    productsSold: { current: 0, change: 0 },
    productsInStock: { current: 0, change: 0 },
  });
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);

  // Backend API base URL
  const API_BASE_URL = 'http://localhost:3000/api/statistics';

  // Fetch dashboard summary data
  useEffect(() => {
    const fetchDashboardSummary = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard-summary?period=${period}`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard summary');
        }
        const data = await response.json();
        setDashboardSummary(data.metrics);
      } catch (err) {
        console.error('Error fetching dashboard summary:', err);
        // Use fallback data when API fails
        setDashboardSummary({
          revenue: { current: 232875, change: 20.1 },
          productsSold: { current: 8294, change: 16.1 },
          productsInStock: { current: 234, change: 10.5 }
        });
      }
    };

    fetchDashboardSummary();
  }, [period]);

  // Fetch chart data
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/chart-data?period=${period}`);
        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }
        const data = await response.json();
        
        const chartConfig = {
          labels: data.chartData.map(item => item.label),
          datasets: [
            {
              label: 'Purchase',
              data: data.chartData.map(item => item.purchases),
              backgroundColor: '#2E93fA',
              barPercentage: 0.6,
            },
            {
              label: 'Sales',
              data: data.chartData.map(item => item.sales),
              backgroundColor: '#4CAF50',
              barPercentage: 0.6,
            }
          ]
        };
        
        setChartData(chartConfig);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        // Use fallback data when API fails
        setLoading(false);
        
        // Generate fallback data based on period
        const labels = [];
        const salesData = [];
        const purchaseData = [];
        
        if (period === 'week') {
          labels.push('Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat');
          salesData.push(42000, 38000, 35000, 37000, 39000, 43000, 40000);
          purchaseData.push(30000, 32000, 28000, 30000, 25000, 29000, 27000);
        } else if (period === 'month') {
          labels.push('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec');
          salesData.push(45000, 52000, 38000, 41000, 39000, 36000, 33000, 31000, 39000, 42000, 43000, 48000);
          purchaseData.push(35000, 40000, 30000, 33000, 31000, 28000, 25000, 23000, 30000, 32000, 33000, 36000);
        } else if (period === 'year') {
          const currentYear = new Date().getFullYear();
          for (let i = 0; i < 12; i++) {
            const monthName = new Date(currentYear, i, 1).toLocaleString('default', { month: 'short' });
            labels.push(`${monthName} ${currentYear}`);
          }
          salesData.push(450000, 520000, 380000, 410000, 390000, 360000, 330000, 310000, 390000, 420000, 430000, 480000);
          purchaseData.push(350000, 400000, 300000, 330000, 310000, 280000, 250000, 230000, 300000, 320000, 330000, 360000);
        }
        
        const fallbackChartConfig = {
          labels: labels,
          datasets: [
            {
              label: 'Purchase',
              data: purchaseData,
              backgroundColor: '#2E93fA',
              barPercentage: 0.6,
            },
            {
              label: 'Sales',
              data: salesData,
              backgroundColor: '#4CAF50',
              barPercentage: 0.6,
            }
          ]
        };
        
        setChartData(fallbackChartConfig);
      }
    };

    fetchChartData();
  }, [period]);

  // Fetch top products
  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/top-products?limit=6`);
        if (!response.ok) {
          throw new Error('Failed to fetch top products');
        }
        const data = await response.json();
        setTopProducts(data.products || []);
      } catch (err) {
        console.error('Error fetching top products:', err);
        // Use fallback data when API fails
        setTopProducts([
          { productName: 'Redbull', averageRating: 4.8 },
          { productName: 'Kit kat', averageRating: 4.5 },
          { productName: 'Coca cola', averageRating: 4.2 },
          { productName: 'Milo', averageRating: 4.3 },
          { productName: 'Ariel', averageRating: 4.7 },
          { productName: 'Bru', averageRating: 4.5 }
        ]);
      }
    };

    fetchTopProducts();
  }, []);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: '#f0f0f0',
        },
        ticks: {
          callback: function(value) {
            if (value >= 1000) {
              return (value / 1000) + 'k';
            }
            return value;
          }
        }
      },
    },
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage change with +/- sign
  const formatPercentChange = (change) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h1>Statistics</h1>
        <div className="search-bar">
          <input type="text" placeholder="Search here..." />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card revenue-card">
          <div className="stat-content">
            <p className="stat-title">Total Revenue</p>
            <h2 className="stat-value">{formatCurrency(dashboardSummary.revenue?.current || 0)}</h2>
            <p className="stat-change">
              {formatPercentChange(dashboardSummary.revenue?.change || 0)} from last month
            </p>
          </div>
        </div>

        <div className="stat-card products-sold-card">
          <div className="stat-content">
            <p className="stat-title">Products Sold</p>
            <h2 className="stat-value">{dashboardSummary.productsSold?.current || 0}</h2>
            <p className="stat-change">
              {formatPercentChange(dashboardSummary.productsSold?.change || 0)} from last month
            </p>
          </div>
        </div>

        <div className="stat-card stock-card">
          <div className="stat-content">
            <p className="stat-title">Products in Stock</p>
            <h2 className="stat-value">{dashboardSummary.productsInStock?.current || 0}</h2>
            <p className="stat-change">
              {formatPercentChange(dashboardSummary.productsInStock?.change || 0)} from last month
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="chart-container">
        <div className="chart-header">
          <h2 className="chart-title">Sales & Purchase</h2>
          <div className="period-buttons">
            <button 
              className={period === 'week' ? 'active' : ''} 
              onClick={() => handlePeriodChange('week')}
            >
              Weekly
            </button>
            <button 
              className={period === 'month' ? 'active' : ''} 
              onClick={() => handlePeriodChange('month')}
            >
              Monthly
            </button>
            <button 
              className={period === 'year' ? 'active' : ''} 
              onClick={() => handlePeriodChange('year')}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="chart-body">
          {loading ? (
            <div className="loading">Loading chart...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : chartData ? (
            <Bar data={chartData} options={chartOptions} height={300} />
          ) : (
            <div className="no-data">No data available</div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="top-products-container">
        <h2 className="section-title">Top Products</h2>
        <div className="top-products-list">
          {topProducts.map((product, index) => (
            <div key={product._id || index} className="top-product-item">
              <div className="product-name">{product.productName}</div>
              <div className="product-rating">
                {Array(5).fill(0).map((_, i) => (
                  <span 
                    key={i} 
                    className={`rating-star ${i < Math.round(product.averageRating || 0) ? 'filled' : ''}`}
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
