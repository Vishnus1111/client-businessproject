import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import API_BASE_URL from '../config';
import styles from './Statistics.module.css';
import calendar from '../../assets/statistics/Calendar.png';
import revenueIcon from '../../assets/statistics/dollar-sign.png';
import salesIcon from '../../assets/statistics/credit-card.png';
import inventoryQuantityIcon from '../../assets/statistics/activity.png';

const Statistics = () => {
  const [chartData, setChartData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [searchTerm, setSearchTerm] = useState('');
  // DnD state for horizontal sections
  const [statOrder, setStatOrder] = useState(['revenue', 'sold', 'stock']);
  const [bottomOrder, setBottomOrder] = useState(['chart', 'top']);
  const [drag, setDrag] = useState({ area: null, key: null });
  const [over, setOver] = useState({ area: null, index: null });
  const dragImageRef = useRef(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    productsSold: 0,
    productsInStock: 0,
    revenueChange: 0,
    soldChange: 0,
    stockChange: 0,
    revenuePrev: 0,
    soldPrev: 0,
    stockPrev: 0,
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
      const periodMap = { weekly: 'week', monthly: 'month', yearly: 'year' };
      const period = periodMap[selectedPeriod] || 'week';
      const t = Date.now();

      const response = await fetch(`${API_BASE_URL}/api/statistics/dashboard-summary?period=${period}&_t=${t}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
          stockPrev: m.productsInStock?.previous || 0,
        };

        if (nextStats.totalRevenue === 0 && nextStats.productsSold === 0) {
          try {
            const ordersRes = await fetch(`${API_BASE_URL}/api/orders/orders?limit=500&_t=${t}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (ordersRes.ok) {
              const ordersJson = await ordersRes.json();
              const orders = Array.isArray(ordersJson.orders) ? ordersJson.orders : [];

              const now = new Date();
              let start;
              if (selectedPeriod === 'weekly') {
                start = new Date(now);
                start.setDate(now.getDate() - 6);
                start.setHours(0, 0, 0, 0);
              } else if (selectedPeriod === 'monthly') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
              } else {
                start = new Date(now.getFullYear(), 0, 1);
              }
              const end = new Date(now);
              end.setHours(23, 59, 59, 999);

              const inWindow = (d) => d >= start && d <= end;
              const notCancelled = (o) => (o.orderStatus || '').toLowerCase() !== 'cancelled';
              const parseDate = (o) => new Date(o.createdAt || o.orderDate || o.date || 0);

              let computedRevenue = 0;
              let computedQty = 0;
              orders.filter(notCancelled).forEach((o) => {
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

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        try {
          const isWeekly = selectedPeriod === 'weekly';
          const isMonthly = selectedPeriod === 'monthly';
          const isYearly = selectedPeriod === 'yearly';

          const ordersRes = await fetch(`${API_BASE_URL}/api/orders/orders?limit=500&_t=${t}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
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

              orders.filter(notCancelled).forEach((o) => {
                const d = safeDate(o);
                if (d >= start && d <= today) {
                  const key = dayKey(d);
                  if (salesMap.has(key)) {
                    salesMap.set(key, salesMap.get(key) + amount(o));
                  }
                }
              });

              const patched = data.data.dailyBreakdown.map((entry) => {
                const key = dayKey(new Date(entry.date));
                const sales = salesMap.has(key) ? salesMap.get(key) : entry.sales || 0;
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

              orders.filter(notCancelled).forEach((o) => {
                const d = safeDate(o);
                if (d.getFullYear() === year) {
                  byMonth[d.getMonth()] += amount(o);
                }
              });

              const monthIndex = (name) => new Date(`${name} 1, ${year}`).getMonth();
              const patched = data.data.monthlyBreakdown.map((entry) => {
                const idx = monthIndex(entry.month);
                const sales = Number.isFinite(byMonth[idx]) ? byMonth[idx] : entry.sales || 0;
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
      const response = await fetch(`${API_BASE_URL}/api/top-products/top-products`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTopProducts(data.products || []);
      } else {
        toast.error('Failed to load top products');
      }
    } catch (error) {
      console.error('Top products fetch error:', error);
      toast.error('Error loading top products');
    }
  };

  const calculatePercentChange = (value) => (value >= 0 ? `+${value}%` : `${value}%`);
  const getComparisonSuffix = () => (selectedPeriod === 'weekly' ? 'last day' : selectedPeriod === 'monthly' ? 'last month' : 'last year');
  const getDisplayedPercent = (changeValue, previousValue) => (previousValue === 0 ? '+100%' : calculatePercentChange(changeValue || 0));
  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toLocaleString()}`;

  const sectionTitles = useMemo(
    () => ({
      revenue: 'total revenue',
      sold: 'products sold',
      stock: 'products in stock',
      chart: 'sales & purchase',
      top: 'top products',
    }),
    []
  );

  const anyMatch = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return false;
    return Object.values(sectionTitles).some((t) => t.includes(q));
  }, [searchTerm, sectionTitles]);

  const desat = (key) => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return false;
    const title = sectionTitles[key] || '';
    const matched = title.includes(q);
    return anyMatch ? !matched : true;
  };

  // ---- Horizontal DnD helpers (reused from Home, adapted to X axis) ----
  const moveInArray = useCallback((arr, key, toIndex) => {
    const fromIndex = arr.indexOf(key);
    if (fromIndex === -1) return arr;
    const next = arr.slice();
    const [item] = next.splice(fromIndex, 1);
    const adjusted = toIndex > fromIndex ? toIndex - 1 : toIndex;
    const clamped = Math.max(0, Math.min(next.length, adjusted));
    next.splice(clamped, 0, item);
    return next;
  }, []);

  const handleDragStart = useCallback((area, key) => (e) => {
    setDrag({ area, key });
    setOver({ area: null, index: null });
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `${area}:${key}`);
      // full-opacity custom drag image
      const srcEl = e.currentTarget;
      if (srcEl) {
        const rect = srcEl.getBoundingClientRect();
        const clone = srcEl.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.opacity = '1';
        clone.style.transform = 'none';
        clone.style.pointerEvents = 'none';
        document.body.appendChild(clone);
        dragImageRef.current = clone;
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        e.dataTransfer.setDragImage(clone, offsetX, offsetY);
      }
    } catch {}
  }, []);

  const handleDragEnd = useCallback(() => {
    setDrag({ area: null, key: null });
    setOver({ area: null, index: null });
    if (dragImageRef.current && dragImageRef.current.parentNode) {
      try { dragImageRef.current.parentNode.removeChild(dragImageRef.current); } catch {}
    }
    dragImageRef.current = null;
  }, []);

  const handleDragOverItem = useCallback((area, index) => (e) => {
    e.preventDefault();
    if (drag.area !== area) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const before = (e.clientX - rect.left) < rect.width / 2;
    const insertionIndex = before ? index : index + 1;
    setOver({ area, index: insertionIndex });
  }, [drag.area]);

  const handleDropContainer = useCallback((area) => (e) => {
    e.preventDefault();
    if (drag.area !== area || over.area !== area || over.index == null) {
      setDrag({ area: null, key: null });
      setOver({ area: null, index: null });
      return;
    }
    if (area === 'stats') {
      setStatOrder(prev => moveInArray(prev, drag.key, over.index));
    } else if (area === 'bottom') {
      setBottomOrder(prev => moveInArray(prev, drag.key, over.index));
    }
    setDrag({ area: null, key: null });
    setOver({ area: null, index: null });
  }, [drag.area, drag.key, over.area, over.index, moveInArray]);

  // render helpers for cards/sections
  const renderStatCard = useCallback((key) => {
    if (key === 'revenue') {
      return (
        <div className={`${styles.statsCard} ${desat('revenue') ? styles.desaturate : ''}`}>
          <h3>Total Revenue</h3>
          <img src={revenueIcon} alt="Revenue" />
          <div className={styles.statsValue}>{formatCurrency(stats.totalRevenue)}</div>
          <div className={styles.statsChange}>
            {getDisplayedPercent(stats.revenueChange, stats.revenuePrev)} from {getComparisonSuffix()}
          </div>
        </div>
      );
    }
    if (key === 'sold') {
      return (
        <div className={`${styles.statsCard} ${desat('sold') ? styles.desaturate : ''}`}>
          <h3>Products Sold</h3>
          <img src={salesIcon} alt="Products Sold" />
          <div className={styles.statsValue}>{stats.productsSold.toLocaleString()}</div>
          <div className={styles.statsChange}>
            {getDisplayedPercent(stats.soldChange, stats.soldPrev)} from {getComparisonSuffix()}
          </div>
        </div>
      );
    }
    // stock
    return (
      <div className={`${styles.statsCard} ${desat('stock') ? styles.desaturate : ''}`}>
        <h3>Products In Stock</h3>
        <img src={inventoryQuantityIcon} alt="Products In Stock" />
        <div className={styles.statsValue}>{stats.productsInStock.toLocaleString()}</div>
        <div className={styles.statsChange}>
          {(() => {
            const backendMaskedZero = stats.stockChange === 0 && stats.stockPrev === stats.productsInStock;
            const prevZero = stats.stockPrev === 0;
            const prevMissing = stats.stockPrev === null || stats.stockPrev === undefined || Number.isNaN(stats.stockPrev);
            const currentPositive = (stats.productsInStock || 0) > 0;
            if (currentPositive && (prevZero || prevMissing || backendMaskedZero)) return '+100%';
            return getDisplayedPercent(stats.stockChange, stats.stockPrev);
          })()} from {getComparisonSuffix()}
        </div>
      </div>
    );
  }, [desat, stats, getComparisonSuffix, getDisplayedPercent, formatCurrency]);

  const ChartBlock = useCallback(() => (
    <div className={`${styles.chartSection} ${desat('chart') ? styles.desaturate : ''}`}>
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
              paddingLeft: '36px',
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
              const maxValue = chartData && chartData.data ? (() => {
                if (selectedPeriod === 'weekly' && chartData.data.dailyBreakdown) {
                  return Math.max(
                    ...chartData.data.dailyBreakdown.map((d) => Math.max(((d.purchases || 0) * 2), d.sales || 0))
                  );
                }
                if (selectedPeriod === 'monthly' && chartData.data.monthlyBreakdown) {
                  return Math.max(
                    ...chartData.data.monthlyBreakdown.map((d) => Math.max(((d.purchases || 0) * 2), d.sales || 0))
                  );
                }
                if (selectedPeriod === 'yearly' && chartData.data.yearlyData) {
                  return Math.max(
                    ((chartData.data.yearlyData.purchases || 0) * 2),
                    chartData.data.yearlyData.sales || 0
                  );
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
                <div key={index} className={styles.yAxisLabel}>
                  {value.toLocaleString()}
                </div>
              ));
            })()}
          </div>

          <div className={styles.chartContent}>
            <div className={styles.chartGrid}>
              {(() => {
                const maxValue = chartData && chartData.data ? (() => {
                  if (selectedPeriod === 'weekly' && chartData.data.dailyBreakdown) {
                    return Math.max(
                      ...chartData.data.dailyBreakdown.map((d) => Math.max(((d.purchases || 0) * 2), d.sales || 0))
                    );
                  }
                  if (selectedPeriod === 'monthly' && chartData.data.monthlyBreakdown) {
                    return Math.max(
                      ...chartData.data.monthlyBreakdown.map((d) => Math.max(((d.purchases || 0) * 2), d.sales || 0))
                    );
                  }
                  if (selectedPeriod === 'yearly' && chartData.data.yearlyData) {
                    return Math.max(
                      ((chartData.data.yearlyData.purchases || 0) * 2),
                      chartData.data.yearlyData.sales || 0
                    );
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
                  const maxValue = Math.max(
                    ...chartData.data.dailyBreakdown.map((d) => Math.max(((d.purchases || 0) * 2), d.sales || 0))
                  );
                  let roundedMax = Math.ceil(maxValue / 10000) * 10000;
                  if (!roundedMax || roundedMax === 0) roundedMax = 1000;
                  const purchaseHeight = roundedMax ? (((dayData.purchases || 0) * 2) / roundedMax) * 100 : 0;
                  const salesHeight = roundedMax ? ((dayData.sales || 0) / roundedMax) * 100 : 0;
                  return (
                    <div key={index} className={styles.chartBar}>
                      <div className={styles.barContainer}>
                        <div
                          className={styles.barPurchase}
                          style={{ height: `${purchaseHeight}%` }}
                          title={`Purchases: ₹${(((dayData.purchases || 0) * 2)).toLocaleString()}`}
                        ></div>
                        <div
                          className={styles.barSales}
                          style={{ height: `${salesHeight}%` }}
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
                  const maxValue = Math.max(
                    ...chartData.data.monthlyBreakdown.map((d) => Math.max(((d.purchases || 0) * 2), d.sales || 0))
                  );
                  let roundedMax = Math.ceil(maxValue / 10000) * 10000;
                  if (!roundedMax || roundedMax === 0) roundedMax = 1000;
                  const purchaseHeight = roundedMax ? (((monthData.purchases || 0) * 2) / roundedMax) * 100 : 0;
                  const salesHeight = roundedMax ? ((monthData.sales || 0) / roundedMax) * 100 : 0;
                  return (
                    <div key={index} className={styles.chartBar}>
                      <div className={styles.barContainer}>
                        <div
                          className={styles.barPurchase}
                          style={{ height: `${purchaseHeight}%` }}
                          title={`Purchases: ₹${(((monthData.purchases || 0) * 2)).toLocaleString()}`}
                        ></div>
                        <div
                          className={styles.barSales}
                          style={{ height: `${salesHeight}%` }}
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
                            style={{ height: `${purchaseHeight}%` }}
                            title={`Purchases: ₹${(((chartData.data.yearlyData.purchases || 0) * 2)).toLocaleString()}`}
                          ></div>
                          <div
                            className={styles.barSales}
                            style={{ height: `${salesHeight}%` }}
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
        </div>

        {/* Removed totals summary per request */}
        <div className={styles.chartLegend}>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#3498db' }}></div>
            <span>Purchase</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#2ecc71' }}></div>
            <span>Sales</span>
          </div>
        </div>
      </div>
    </div>
  ), [desat, selectedPeriod, chartData]);

  const TopProductsBlock = useCallback(() => (
    <div className={`${styles.topProducts} ${desat('top') ? styles.desaturate : ''}`}>
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
                      url = url.replace(/\\/g, '/');
                      const clean = url.startsWith('/') ? url.slice(1) : url;
                      const path = clean.includes('uploads/') ? clean : `uploads/${clean}`;
                      return `${API_BASE_URL}/${path}`;
                    })()}
                    alt={product.productName}
                  />
                ) : null}
              </div>
              <span className={styles.productName}>{product.productName}</span>
              <div className={styles.productRatingBars}>
                {(() => {
                  const starCount = typeof product.ratingStars === 'string' ? ((product.ratingStars.match(/★/g) || []).length) : 0;
                  const rating = Math.max(0, Math.min(5, Math.round((product.averageRating ?? starCount ?? 0))));
                  return (
                    <div className={styles.ratingBars} aria-label={`Rating: ${rating} of 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`${styles.ratingBar} ${i < rating ? styles.filled : ''}`}></span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noProducts}>No top-rated products found</div>
        )}
      </div>
    </div>
  ), [desat, topProducts]);

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
        <div className={styles.searchContainer}>
          <button className={styles.searchButton} type="button" aria-label="Search">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </button>
          <input
            type="text"
            placeholder="Search here..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.statsCards} onDrop={handleDropContainer('stats')} onDragOver={(e) => e.preventDefault()}>
        {statOrder.map((key, idx) => {
          const draggingClass = drag.key === key && drag.area === 'stats' ? styles.dragging : '';
          const shiftClass = over.area === 'stats' && over.index === idx ? styles.shiftRight : '';
          return (
            <div
              key={key}
              className={`${styles.draggable} ${draggingClass} ${shiftClass}`}
              draggable
              onDragStart={handleDragStart('stats', key)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOverItem('stats', idx)}
            >
              {renderStatCard(key)}
            </div>
          );
        })}
      </div>

      <div className={styles.bottomGrid} onDrop={handleDropContainer('bottom')} onDragOver={(e) => e.preventDefault()}>
        {bottomOrder.map((key, idx) => {
          const draggingClass = drag.key === key && drag.area === 'bottom' ? styles.dragging : '';
          const shiftClass = over.area === 'bottom' && over.index === idx ? styles.shiftRight : '';
          return (
            <div
              key={key}
              className={`${styles.draggable} ${draggingClass} ${shiftClass}`}
              draggable
              onDragStart={handleDragStart('bottom', key)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOverItem('bottom', idx)}
            >
              {key === 'chart' ? <ChartBlock /> : <TopProductsBlock />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Statistics;
