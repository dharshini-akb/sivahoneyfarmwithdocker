import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import './AdminAnalytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/admin/analytics?days=${days}`);
        setData(res.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [days]);

  if (loading || !data) {
    return (
      <div className="analytics-loader">
        <div className="spinner"></div>
        <p>Analyzing store data...</p>
      </div>
    );
  }

  const { summary, dailyActivity, topProducts, categoryDistribution, topCustomers, recentOrders } = data;

  // Chart configurations
  const salesChartData = {
    labels: dailyActivity.map(d => d._id),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: dailyActivity.map(d => d.revenue),
        borderColor: '#8B4513',
        backgroundColor: 'rgba(139, 69, 19, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Orders',
        data: dailyActivity.map(d => d.orderCount),
        borderColor: '#228B22',
        backgroundColor: 'rgba(34, 139, 34, 0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const categoryChartData = {
    labels: categoryDistribution.map(c => (c._id ? c._id.toUpperCase() : 'UNCATEGORIZED')),
    datasets: [{
      data: categoryDistribution.map(c => c.revenue),
      backgroundColor: ['#8B4513', '#228B22', '#CD853F', '#A0522D', '#2E8B57', '#DEB887'],
      hoverOffset: 10
    }]
  };

  const topProductsChartData = {
    labels: topProducts.map(p => p.name),
    datasets: [{
      label: 'Revenue Generated (₹)',
      data: topProducts.map(p => p.revenue),
      backgroundColor: '#228B22',
      borderRadius: 8
    }]
  };

  return (
    <div className="admin-analytics-dashboard">
      <header className="analytics-header-nav">
        <div className="header-left">
          <Link to="/admin/dashboard" className="back-btn">← Dashboard</Link>
          <h1>Store Analytics</h1>
        </div>
        <div className="header-right">
          <div className="filter-group">
            <button className={days === '7' ? 'active' : ''} onClick={() => setDays('7')}>7D</button>
            <button className={days === '30' ? 'active' : ''} onClick={() => setDays('30')}>30D</button>
            <button className={days === '180' ? 'active' : ''} onClick={() => setDays('180')}>6M</button>
          </div>
        </div>
      </header>

      <main className="analytics-content">
        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="card-icon revenue-icon">₹</div>
            <div className="card-info">
              <h3>Total Revenue</h3>
              <p className="value">₹{summary.totalRevenue.toLocaleString()}</p>
              <span className={`growth ${summary.growth >= 0 ? 'up' : 'down'}`}>
                {summary.growth >= 0 ? '↑' : '↓'} {Math.abs(summary.growth)}%
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon orders-icon">🛒</div>
            <div className="card-info">
              <h3>Total Orders</h3>
              <p className="value">{summary.totalOrders}</p>
              <span className="subtext">Completed orders</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon customers-icon">👥</div>
            <div className="card-info">
              <h3>Unique Customers</h3>
              <p className="value">{summary.totalCustomers}</p>
              <span className="subtext">Active this period</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon aov-icon">📊</div>
            <div className="card-info">
              <h3>Avg. Order Value</h3>
              <p className="value">₹{summary.avgOrderValue.toFixed(2)}</p>
              <span className="subtext">Revenue per order</span>
            </div>
          </div>
        </div>

        {/* Main Charts */}
        <div className="charts-main-row">
          <div className="chart-container large">
            <h3>Sales & Order Trends</h3>
            <div className="chart-box">
              <Line 
                data={salesChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Revenue (₹)' } },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Orders' } }
                  }
                }} 
              />
            </div>
          </div>
          <div className="chart-container small">
            <h3>Category Distribution</h3>
            <div className="chart-box">
              <Pie data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        {/* Product & Customer Insights */}
        <div className="insights-grid">
          <div className="insight-card">
            <h3>Top Selling Products</h3>
            <div className="chart-box mini">
              <Bar data={topProductsChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={i}>
                      <td>{p.name}</td>
                      <td>{p.totalOrders}</td>
                      <td>₹{p.revenue.toLocaleString()}</td>
                      <td>⭐ {p.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="insight-card">
            <h3>Top Customers</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Orders</th>
                    <th>Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <div className="user-cell">
                          <span className="user-name">{c.name || 'Anonymous'}</span>
                          <span className="user-email">{c.email || 'No email'}</span>
                        </div>
                      </td>
                      <td>{c.orderCount}</td>
                      <td>₹{c.totalSpent.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="recent-orders-full">
          <h3>Recent Transactions</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order._id}>
                    <td className="id">#{order._id.slice(-8)}</td>
                    <td>{order.user?.name || 'Guest'}</td>
                    <td>{order.items.length} items</td>
                    <td>₹{order.totalAmount.toLocaleString()}</td>
                    <td>
                      <span className={`status-pill ${order.orderStatus}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalytics;