import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import supplierIcon from '../../assets/dashboard/pro. summary.png';
import categoryIcon from '../../assets/dashboard/pro. Categories.png';
import calendar from '../../assets/statistics/Calendar.png';
// Reuse same icons as Statistics mobile header
import logo from '../../assets/dashboard/logo.png';
import settingsIcon from '../../assets/mobile/Setting.png';

const Home = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [searchTerm, setSearchTerm] = useState('');
  // Drag & drop state
  const [leftOrder, setLeftOrder] = useState(['sales', 'purchase', 'chart']);
  const [rightOrder, setRightOrder] = useState(['inventory', 'product', 'topProducts']);
  // Mobile-only: treat all 6 sections as a single vertical list
  const [allOrder, setAllOrder] = useState(['sales', 'purchase', 'chart', 'inventory', 'product', 'topProducts']);
  const [dragging, setDragging] = useState({ key: null, side: null });
  const [over, setOver] = useState({ side: null, index: null });
  // Keep a reference to a custom drag image so we can remove it on drag end
  const dragImageRef = useRef(null);
  // Track mobile viewport to switch DnD behavior without altering desktop
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 600px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 600px)');
    const onChange = (e) => setIsMobile(e.matches);
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else if (mql.removeListener) mql.removeListener(onChange);
    };
  }, []);
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
        try {
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

        // Always recompute sales from orders and patch if needed (keep purchases untouched)
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
              // Build a 7-day window ending today
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

              // Patch sales values in the same order
              const patched = data.data.dailyBreakdown.map(entry => {
                const key = dayKey(new Date(entry.date));
                const sales = salesMap.has(key) ? salesMap.get(key) : (entry.sales || 0);
                return { ...entry, sales };
              });
              data.data.dailyBreakdown = patched;

              // Patch summary totalSales only (leave profit/purchases as-is)
              const totalSales = patched.reduce((sum, e) => sum + (Number(e.sales) || 0), 0);
              data.data.summary = { ...(data.data.summary || {}), totalSales };
            }

            if (isMonthly && Array.isArray(data?.data?.monthlyBreakdown)) {
              // Aggregate by month for current year
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

              // Patch summary totalSales only
              const totalSales = patched.reduce((sum, e) => sum + (Number(e.sales) || 0), 0);
              data.data.summary = { ...(data.data.summary || {}), totalSales };
            }

            if (isYearly && data?.data?.yearlyData) {
              const now = new Date();
              const year = now.getFullYear();
              const yearSales = orders.filter(notCancelled).reduce((sum, o) => {
                const d = safeDate(o);
                return d.getFullYear() === year ? sum + amount(o) : sum;
              }, 0);
              data.data.yearlyData = { ...data.data.yearlyData, sales: yearSales };

              // Patch summary totalSales only
              data.data.summary = { ...(data.data.summary || {}), totalSales: yearSales };
            }
          }
        } catch (e) {
          console.warn('Sales recompute from orders skipped due to error:', e);
        }

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

  // ---- Drag & Drop helpers ----
  const moveInArray = (arr, key, toIndex) => {
    const fromIndex = arr.indexOf(key);
    if (fromIndex === -1) return arr;
    const next = arr.slice();
    const [item] = next.splice(fromIndex, 1);
    const adjusted = toIndex > fromIndex ? toIndex - 1 : toIndex;
    const clamped = Math.max(0, Math.min(next.length, adjusted));
    next.splice(clamped, 0, item);
    return next;
  };

  const handleDragStart = useCallback((side, key) => (e) => {
    setDragging({ key, side });
    setOver({ side: null, index: null });
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `${side}:${key}`);
      // Use a full-opacity custom drag image to avoid the browser's semi-transparent ghost
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
    setDragging({ key: null, side: null });
    setOver({ side: null, index: null });
    // Clean up the custom drag image if we created one
    if (dragImageRef.current && dragImageRef.current.parentNode) {
      try { dragImageRef.current.parentNode.removeChild(dragImageRef.current); } catch {}
    }
    dragImageRef.current = null;
  }, []);

  const handleDragOverItem = (side, index) => (e) => {
    e.preventDefault();
    if (dragging.side !== side) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    const insertionIndex = before ? index : index + 1;
    setOver({ side, index: insertionIndex });
  };

  const handleDropContainer = (side) => (e) => {
    e.preventDefault();
    if (dragging.side !== side || over.side !== side || over.index == null) {
      setDragging({ key: null, side: null });
      setOver({ side: null, index: null });
      return;
    }
    if (side === 'left') {
      const next = moveInArray(leftOrder, dragging.key, over.index);
      setLeftOrder(next);
    } else if (side === 'right') {
      const next = moveInArray(rightOrder, dragging.key, over.index);
      setRightOrder(next);
    }
    setDragging({ key: null, side: null });
    setOver({ side: null, index: null });
  };

  // —— Mobile-only unified DnD handlers ——
  const handleDragOverItemMobile = (index) => (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    const insertionIndex = before ? index : index + 1;
    setOver({ side: 'mobile', index: insertionIndex });
  };

  const handleDropMobile = (e) => {
    e.preventDefault();
    if (dragging.key == null || over.side !== 'mobile' || over.index == null) {
      setDragging({ key: null, side: null });
      setOver({ side: null, index: null });
      return;
    }
    const next = moveInArray(allOrder, dragging.key, over.index);
    setAllOrder(next);
    setDragging({ key: null, side: null });
    setOver({ side: null, index: null });
  };

  // ---- Search helpers ----
  const shouldDesaturate = useCallback((keyName) => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return false;
    const titles = {
      sales: 'sales overview',
      purchase: 'purchase overview',
      chart: 'sales & purchase',
      inventory: 'inventory summary',
      product: 'product summary',
      topProducts: 'top products',
    };
    const title = titles[keyName] || '';
    const matched = title.includes(q);
    const anyMatch = Object.values(titles).some(t => t.includes(q));
    return anyMatch ? !matched : true;
  }, [searchTerm]);

  const renderLeftSection = useCallback((keyName) => {
    const currentSide = isMobile ? 'mobile' : 'left';
    const draggingClass = dragging.key === keyName && dragging.side === currentSide ? styles.dragging : '';
    const desatClass = shouldDesaturate(keyName) ? styles.desaturate : '';
    const commonProps = {
      className: `${styles.draggable} ${draggingClass} ${desatClass}`,
      draggable: true,
      onDragStart: handleDragStart(currentSide, keyName),
      onDragEnd: handleDragEnd,
    };
    if (keyName === 'sales') {
      return (
        <div {...commonProps}>
          <div className={styles.overviewSection} style={{ height: 'var(--row1Height)' }}>
            <div className={styles.sectionHeader}>
              <h2>Sales Overview</h2>
            </div>
            <div className={styles.statsGrid}>
              <StatCard title="Sales" value={`${dashboardData?.detailed?.sales?.totalOrders || 0}`} icon={<img src={salesale} alt="Sales Cost" />} />
              <StatCard title="Revenue" value={`₹ ${(dashboardData?.detailed?.sales?.totalRevenue || 0).toLocaleString()}`} icon={<img src={revenueIcon} alt="Revenue" />} />
              <StatCard title="Profit" value={`₹ ${(dashboardData?.detailed?.sales?.profit || 0).toLocaleString()}`} icon={<img src={profitIcon} alt="Profit" />} />
              <StatCard
                title="Cost"
                value={`₹ ${(
                  (
                    Number(dashboardData?.detailed?.sales?.totalCost || 0) * 1.10
                  ) + (
                    Number(dashboardData?.detailed?.sales?.totalOrders || 0) * 50
                  )
                ).toLocaleString()}`}
                icon={<img src={costIcon} alt="Cost" />}
              />
            </div>
          </div>
        </div>
      );
    }
    if (keyName === 'purchase') {
      return (
        <div {...commonProps}>
          <div className={styles.overviewSection} style={{ height: 'var(--row2Height)' }}>
            <div className={styles.sectionHeader}>
              <h2>Purchase Overview</h2>
            </div>
            <div className={styles.statsGrid}>
              <StatCard title="Purchase" value={dashboardData?.overallInventory?.totalProducts?.recent || 0} icon={<img src={purchaseIcon} alt="Purchase" />} />
              <StatCard title="Cost" value={`₹ ${((((chartData?.data?.summary?.totalPurchases) || 0) * 2).toLocaleString())}`} icon={<img src={costIcon2} alt="Cost" />} />
              <StatCard title="Cancel" value={cancelMetrics.count || 0} icon={<img src={cancelIcon} alt="Cancel" />} />
              <StatCard title="Return" value={`₹ ${(returnMetrics.amount || 0).toLocaleString()}`} icon={<img src={returnIcon} alt="Return" />} />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div {...commonProps}>
        <div className={styles.chartSection} style={{ height: 'calc(var(--topProductsHeader) + (var(--topProductsItemRow) * 6))' }}>
          <div className={styles.chartHeader}>
            <h3>Sales & Purchase</h3>
            <div className={styles.periodSelector}>
              <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className={styles.periodSelect} style={{ backgroundImage: `url(${calendar})`, backgroundRepeat: 'no-repeat', backgroundPosition: '10px center', backgroundSize: '18px', paddingLeft: '36px' }}>
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
                      return Math.max(...chartData.data.dailyBreakdown.map(d => Math.max(((d.purchases || 0) * 2), d.sales || 0)));
                    }
                    if (selectedPeriod === 'monthly' && chartData.data.monthlyBreakdown) {
                      return Math.max(...chartData.data.monthlyBreakdown.map(d => Math.max(((d.purchases || 0) * 2), d.sales || 0)));
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
                  for (let i = 6; i >= 0; i--) yAxisValues.push(Math.round(step * i));
                  return yAxisValues.map((value, index) => (<div key={index} className={styles.yAxisLabel}>{value.toLocaleString()}</div>));
                })()}
              </div>
              <div className={styles.chartContent}>
                <div className={styles.chartGrid}>
                  {(() => {
                    const maxValue = chartData && chartData.data ? (() => {
                      if (selectedPeriod === 'weekly' && chartData.data.dailyBreakdown) {
                        return Math.max(...chartData.data.dailyBreakdown.map(d => Math.max(((d.purchases || 0) * 2), d.sales || 0)));
                      }
                      if (selectedPeriod === 'monthly' && chartData.data.monthlyBreakdown) {
                        return Math.max(...chartData.data.monthlyBreakdown.map(d => Math.max(((d.purchases || 0) * 2), d.sales || 0)));
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
                    for (let i = 6; i >= 0; i--) yAxisValues.push(Math.round(step * i));
                    return yAxisValues.map((_, index) => (<div key={index} className={styles.gridLine}></div>));
                  })()}
                </div>
                <div className={styles.chartBars}>
                  {selectedPeriod === 'weekly' && chartData?.data?.dailyBreakdown && (
                    chartData.data.dailyBreakdown.map((dayData, index) => {
                      const maxValue = Math.max(...chartData.data.dailyBreakdown.map(d => Math.max(((d.purchases || 0) * 2), d.sales || 0)));
                      const roundedMax = Math.ceil(maxValue / 10000) * 10000;
                      const purchaseHeight = roundedMax ? (((dayData.purchases || 0) * 2) / roundedMax) * 100 : 0;
                      const salesHeight = roundedMax ? ((dayData.sales || 0) / roundedMax) * 100 : 0;
                      return (
                        <div key={index} className={styles.chartBar}>
                          <div className={styles.barContainer}>
                            <div className={styles.barPurchase} style={{height: `${purchaseHeight}%`}} title={`Purchases: ₹${(((dayData.purchases || 0) * 2)).toLocaleString()}`} />
                            <div className={styles.barSales} style={{height: `${salesHeight}%`}} title={`Sales: ₹${(dayData.sales || 0).toLocaleString()}`} />
                          </div>
                          <div className={styles.barLabel}>{dayData.day.substring(0, 3)}</div>
                        </div>
                      );
                    })
                  )}
                  {selectedPeriod === 'monthly' && chartData?.data?.monthlyBreakdown && (
                    chartData.data.monthlyBreakdown.map((monthData, index) => {
                      const maxValue = Math.max(...chartData.data.monthlyBreakdown.map(d => Math.max(((d.purchases || 0) * 2), d.sales || 0)));
                      const roundedMax = Math.ceil(maxValue / 10000) * 10000;
                      const purchaseHeight = roundedMax ? (((monthData.purchases || 0) * 2) / roundedMax) * 100 : 0;
                      const salesHeight = roundedMax ? ((monthData.sales || 0) / roundedMax) * 100 : 0;
                      return (
                        <div key={index} className={styles.chartBar}>
                          <div className={styles.barContainer}>
                            <div className={styles.barPurchase} style={{height: `${purchaseHeight}%`}} title={`Purchases: ₹${(((monthData.purchases || 0) * 2)).toLocaleString()}`} />
                            <div className={styles.barSales} style={{height: `${salesHeight}%`}} title={`Sales: ₹${(monthData.sales || 0).toLocaleString()}`} />
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
                          const maxValue = Math.max(((chartData.data.yearlyData.purchases || 0) * 2), chartData.data.yearlyData.sales || 0);
                          const roundedMax = Math.ceil(maxValue / 10000) * 10000;
                          const purchaseHeight = roundedMax ? (((chartData.data.yearlyData.purchases || 0) * 2) / roundedMax) * 100 : 0;
                          const salesHeight = roundedMax ? ((chartData.data.yearlyData.sales || 0) / roundedMax) * 100 : 0;
                          return (<>
                            <div className={styles.barPurchase} style={{height: `${purchaseHeight}%`}} title={`Purchases: ₹${(((chartData.data.yearlyData.purchases || 0) * 2)).toLocaleString()}`} />
                            <div className={styles.barSales} style={{height: `${salesHeight}%`}} title={`Sales: ₹${(chartData.data.yearlyData.sales || 0).toLocaleString()}`} />
                          </>);
                        })()}
                      </div>
                      <div className={styles.barLabel}>{chartData.data.year}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.chartLegend}>
                <div className={styles.legendItem}><div className={styles.legendColor} style={{background: '#3498db'}}></div><span>Purchase</span></div>
                <div className={styles.legendItem}><div className={styles.legendColor} style={{background: '#2ecc71'}}></div><span>Sales</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [dashboardData, chartData, selectedPeriod, cancelMetrics, returnMetrics, dragging.key, dragging.side, handleDragStart, handleDragEnd, shouldDesaturate, isMobile]);

  const renderRightSection = useCallback((keyName) => {
    const currentSide = isMobile ? 'mobile' : 'right';
    const draggingClass = dragging.key === keyName && dragging.side === currentSide ? styles.dragging : '';
    const desatClass = shouldDesaturate(keyName) ? styles.desaturate : '';
    const commonProps = {
      className: `${styles.draggable} ${draggingClass} ${desatClass}`,
      draggable: true,
      onDragStart: handleDragStart(currentSide, keyName),
      onDragEnd: handleDragEnd,
    };
    if (keyName === 'inventory') {
      return (
        <div {...commonProps}>
          <div className={styles.summaryCard}>
        <h3>Inventory Summary</h3>
        <div className={styles.inventoryItems}>
          <div className={styles.inventoryItem}>
            <div className={styles.inventoryIcon}><img src={inventoryQuantityIcon} alt="Inventory" /></div>
            <div className={`${styles.inventoryContent} ${styles.inventoryContent1}`}>
          <span className={styles.inventoryLabel}>Quantity in Hand</span>
          <span className={styles.inventoryValue}>{dashboardData?.inventoryMetrics?.totalQuantity || 0}</span>
            </div>
          </div>
          <div className={`${styles.inventoryContent} ${styles.inventoryContent1}`}>
            <span className={styles.inventoryLabel}>To be received</span>
            <span className={styles.inventoryValue}>{dashboardData?.inventoryMetrics?.expectedStock || 0}</span>
          </div>
        </div>
          </div>
        </div>
      );
    }
    if (keyName === 'product') {
      return (
        <div {...commonProps}>
          <div className={styles.summaryCard}>
            <h3>Product Summary</h3>
            <div className={styles.inventoryItems}>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}><img src={supplierIcon} alt="Suppliers" /></div>
                <div className={`${styles.inventoryContent} ${styles.inventoryContent2}`}>
                  <span className={styles.inventoryLabel}>Number of <br />Suppliers</span>
                  <span className={styles.inventoryValue}>{dashboardData?.productMetrics?.suppliersCount || 0}</span>
                </div>
              </div>
              <div className={styles.inventoryItem}>
                <div className={styles.inventoryIcon}><img src={categoryIcon} alt="Categories" /></div>
                <div className={`${styles.inventoryContent} ${styles.inventoryContent2}`}>
                  <span className={styles.inventoryLabel}>Number of <br /> Categories</span>
                  <span className={styles.inventoryValue}>{dashboardData?.productMetrics?.categoriesCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div {...commonProps}>
        <div className={`${styles.summaryCard} ${styles.topProductsCard}`}>
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
        </div>
      );
  }, [dashboardData, topProducts, dragging.key, dragging.side, handleDragStart, handleDragEnd, shouldDesaturate, isMobile]);

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

  // —— Render ——
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Mobile: render a single unified reorderable list for all 6 sections
  if (isMobile) {
    return (
      <div className={styles.homeContainer}>
        {/* Mobile-only header (hidden on desktop via CSS) */}
        <div className={styles.mobileHeader}>
          <img src={logo} alt="Logo" className={styles.mobileLogo} />
          <a href="/dashboard/settings" className={styles.mobileSettings} aria-label="Settings">
            <img src={settingsIcon} alt="Settings" />
          </a>
        </div>
        {/* Header (desktop only; hidden on mobile via CSS) */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>Home</h1>
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
                onChange={(e)=>setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Unified DnD list (mobile only) */}
        <div className={styles.dashboardGrid}>
          <div className={styles.leftColumn} onDrop={handleDropMobile} onDragOver={(e)=>e.preventDefault()}>
            {(() => {
              const nodes = [];
              allOrder.forEach((keyName, idx) => {
                if (over.side === 'mobile' && over.index === idx) nodes.push(<div key={`m-di-${idx}`} className={styles.dropIndicator} />);
                nodes.push(
                  <div key={`m-${keyName}`} onDragOver={handleDragOverItemMobile(idx)}>
                    {(['sales','purchase','chart'].includes(keyName)) ? renderLeftSection(keyName) : renderRightSection(keyName)}
                  </div>
                );
              });
              if (over.side === 'mobile' && over.index === allOrder.length) nodes.push(<div key={`m-di-end`} className={styles.dropIndicator} />);
              return nodes;
            })()}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: original two-column DnD behavior
  return (
    <div className={styles.homeContainer}>
      {/* Mobile-only header (hidden on desktop via CSS) */}
      <div className={styles.mobileHeader}>
        <img src={logo} alt="Logo" className={styles.mobileLogo} />
        <a href="/dashboard/settings" className={styles.mobileSettings} aria-label="Settings">
          <img src={settingsIcon} alt="Settings" />
        </a>
      </div>
      {/* Header (desktop only; hidden on mobile via CSS) */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Home</h1>
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
              onChange={(e)=>setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

  {/* Main Dashboard Grid with DnD-enabled columns */}
      <div className={styles.dashboardGrid}>
        {/* Left column reorderable */}
        <div className={styles.leftColumn} onDrop={handleDropContainer('left')} onDragOver={(e)=>e.preventDefault()}>
          {(() => {
            const nodes = [];
            leftOrder.forEach((keyName, idx) => {
              if (over.side === 'left' && over.index === idx) nodes.push(<div key={`l-di-${idx}`} className={styles.dropIndicator} />);
              nodes.push(
                <div key={`l-${keyName}`} onDragOver={handleDragOverItem('left', idx)}>
                  {renderLeftSection(keyName)}
                </div>
              );
            });
            if (over.side === 'left' && over.index === leftOrder.length) nodes.push(<div key={`l-di-end`} className={styles.dropIndicator} />);
            return nodes;
          })()}
        </div>

        {/* Right column reorderable */}
        <div className={styles.rightColumn} onDrop={handleDropContainer('right')} onDragOver={(e)=>e.preventDefault()}>
          {(() => {
            const nodes = [];
            rightOrder.forEach((keyName, idx) => {
              if (over.side === 'right' && over.index === idx) nodes.push(<div key={`r-di-${idx}`} className={styles.dropIndicator} />);
              nodes.push(
                <div key={`r-${keyName}`} onDragOver={handleDragOverItem('right', idx)}>
                  {renderRightSection(keyName)}
                </div>
              );
            });
            if (over.side === 'right' && over.index === rightOrder.length) nodes.push(<div key={`r-di-end`} className={styles.dropIndicator} />);
            return nodes;
          })()}
        </div>
      </div>
    </div>
  );
};

export default Home;
