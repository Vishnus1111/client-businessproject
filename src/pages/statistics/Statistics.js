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
import calendar from '../../assets/statistics/Calendar.png';
import API_BASE_URL from '../config';

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
  const [error, setError] = useState(null);

  // Backend API base URL (from env/config)
  const API_STATS = `${API_BASE_URL}/api/statistics`;

  // Fetch dashboard summary data
  useEffect(() => {
    const fetchDashboardSummary = async () => {
      try {
  const response = await fetch(`${API_STATS}/dashboard-summary?period=${period}`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard summary');
        }
        const data = await response.json();
        setDashboardSummary(data.metrics);
      } catch (err) {
  console.error('Error fetching dashboard summary:', err);
  setError('Failed to load dashboard summary');
      }
    };

    fetchDashboardSummary();
  }, [period, API_STATS]);

  // Fetch chart data
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
  const response = await fetch(`${API_STATS}/chart-data?period=${period}`);
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
  setLoading(false);
  setError('Failed to load chart data');
      }
    };

    fetchChartData();
  }, [period, API_STATS]);

  // Fetch top products
  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        // Prefer dedicated top-products route
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/top-products/top-products?limit=6`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch top products');
        }
        const data = await response.json();
        // top-products route returns { success, products: [...] }
        setTopProducts(data.products || data.topProducts || []);
      } catch (err) {
        console.error('Error fetching top products:', err);
        setTopProducts([]);
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
          <div className="period-selector">
            <select
              className="period-select"
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              style={{
                backgroundImage: `url(${calendar})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: '12px center',
                backgroundSize: '18px',
                paddingLeft: '40px'
              }}
            >
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
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
