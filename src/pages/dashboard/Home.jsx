import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import styles from './Home.module.css';

const Home = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');

  useEffect(() => {
    fetchDashboardData();
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
            value="₹ 832"
            color="blue"
            icon="💰"
          />
          <StatCard
            title="Revenue"
            value="₹ 18,300"
            color="orange"
            icon="💳"
          />
          <StatCard
            title="Profit"
            value="₹ 868"
            color="green"
            icon="📊"
          />
          <StatCard
            title="Cost"
            value="₹ 17,432"
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
            value="82"
            color="blue"
            icon="🛒"
          />
          <StatCard
            title="Cost"
            value="₹ 13,573"
            color="orange"
            icon="💰"
          />
          <StatCard
            title="Cancel"
            value="5"
            color="green"
            icon="❌"
          />
          <StatCard
            title="Return"
            value="₹ 17,432"
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
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Yearly</option>
              </select>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <div className={styles.chartPlaceholder}>
              <div className={styles.chartBars}>
                {[...Array(12)].map((_, index) => (
                  <div key={index} className={styles.chartBar}>
                    <div 
                      className={styles.barPurchase} 
                      style={{height: `${Math.random() * 80 + 20}%`}}
                    ></div>
                    <div 
                      className={styles.barSales} 
                      style={{height: `${Math.random() * 60 + 20}%`}}
                    ></div>
                  </div>
                ))}
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
                  <span className={styles.inventoryValue}>868</span>
                </div>
              </div>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}>📥</div>
                <div className={styles.inventoryContent}>
                  <span className={styles.inventoryLabel}>To be received</span>
                  <span className={styles.inventoryValue}>200</span>
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
                  <span className={styles.inventoryValue}>31</span>
                </div>
              </div>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}>📋</div>
                <div className={styles.inventoryContent}>
                  <span className={styles.inventoryLabel}>Number of Categories</span>
                  <span className={styles.inventoryValue}>21</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className={styles.summaryCard}>
            <h3>Top Products</h3>
            <div className={styles.topProductsList}>
              {['Redbull', 'Kit kat', 'Coca cola', 'Milo', 'Ariel', 'Bru'].map((product, index) => (
                <div key={index} className={styles.topProductItem}>
                  <span className={styles.productName}>{product}</span>
                  <div className={styles.productRating}>
                    {'⭐'.repeat(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
