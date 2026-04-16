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
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import './SalesAnalytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const SalesAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/admin/sales-analytics?year=${year}&period=${period}`);
        setData(res.data);
      } catch (error) {
        console.error('Error fetching sales analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [year, period]);

  if (loading || !data) {
    return <div className="analytics-loading">Preparing your insights...</div>;
  }

  const { monthlyData, summary, categoryData, activityData } = data;

  const lineChartData = {
    labels: monthlyData.map(m => m.month),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: monthlyData.map(m => m.revenue),
        borderColor: '#8B4513',
        backgroundColor: 'rgba(139, 69, 19, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const barChartData = {
    labels: monthlyData.map(m => m.month),
    datasets: [
      {
        label: 'Orders',
        data: monthlyData.map(m => m.orders),
        backgroundColor: '#228B22',
        borderRadius: 5,
      }
    ]
  };

  const pieChartData = {
    labels: categoryData.map(c => (c.name ? c.name.toUpperCase() : 'UNCATEGORIZED')),
    datasets: [
      {
        data: categoryData.map(c => c.value),
        backgroundColor: [
          '#8B4513', '#228B22', '#CD853F', '#A0522D', '#2E8B57', '#DEB887'
        ],
        borderWidth: 1,
      }
    ]
  };

  // Activity Heatmap Logic (simplified for demo)
  const renderActivityMap = () => {
    const today = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const activity = activityData.find(a => a._id === dateStr);
      days.push({ date: dateStr, count: activity ? activity.count : 0 });
    }

    return (
      <div className="activity-map">
        {days.map(day => {
          const intensity = Math.min(day.count * 20, 100);
          return (
            <div 
              key={day.date}
              className="activity-cell"
              style={{ backgroundColor: `rgba(34, 139, 34, ${intensity / 100})` }}
              title={`${day.date}: ${day.count} purchases`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="sales-analytics-page">
      <nav className="admin-nav">
        <Link to="/" className="nav-brand">BIOBASKET</Link>
        <div className="nav-links">
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/analytics">Analytics</Link>
          <Link to="/admin/sales" className="active">Sales Insights</Link>
          <Link to="/">Home</Link>
        </div>
      </nav>

      <div className="analytics-container">
        <div className="analytics-header">
          <div className="header-text">
            <h1>Sales Analytics Dashboard</h1>
            <p>Monitor your business growth and performance</p>
          </div>
          <div className="header-filters">
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
            <div className="period-btns">
              <button className={period === '7' ? 'active' : ''} onClick={() => setPeriod('7')}>7D</button>
              <button className={period === '30' ? 'active' : ''} onClick={() => setPeriod('30')}>30D</button>
              <button className={period === '90' ? 'active' : ''} onClick={() => setPeriod('90')}>90D</button>
            </div>
          </div>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-info">
              <span className="card-label">Total Revenue</span>
              <h2 className="card-value">₹{summary.totalRevenue.toLocaleString()}</h2>
              <span className={`card-growth ${summary.growth >= 0 ? 'positive' : 'negative'}`}>
                {summary.growth >= 0 ? '↑' : '↓'} {Math.abs(summary.growth)}% from last month
              </span>
            </div>
            <div className="card-icon revenue">₹</div>
          </div>
          <div className="summary-card">
            <div className="card-info">
              <span className="card-label">Total Orders</span>
              <h2 className="card-value">{summary.totalOrders}</h2>
              <p className="card-subtext">Cumulative successful orders</p>
            </div>
            <div className="card-icon orders">🛒</div>
          </div>
          <div className="summary-card">
            <div className="card-info">
              <span className="card-label">Total Customers</span>
              <h2 className="card-value">{summary.totalCustomers}</h2>
              <p className="card-subtext">Unique purchasers</p>
            </div>
            <div className="card-icon customers">👥</div>
          </div>
          <div className="summary-card">
            <div className="card-info">
              <span className="card-label">Monthly Sales</span>
              <h2 className="card-value">₹{summary.currentMonthRevenue.toLocaleString()}</h2>
              <p className="card-subtext">Current month performance</p>
            </div>
            <div className="card-icon growth">📈</div>
          </div>
        </div>

        <div className="charts-main-grid">
          <div className="chart-wrapper span-2">
            <h3>Revenue Growth (Line Chart)</h3>
            <div className="chart-content">
              <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
          <div className="chart-wrapper">
            <h3>Sales Distribution (Pie Chart)</h3>
            <div className="chart-content">
              <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
          <div className="chart-wrapper span-2">
            <h3>Monthly Orders Comparison (Bar Chart)</h3>
            <div className="chart-content">
              <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
          <div className="chart-wrapper">
            <h3>Daily Activity Map</h3>
            <div className="heatmap-container">
              {renderActivityMap()}
              <div className="heatmap-labels">
                <span>Less</span>
                <div className="heatmap-scale">
                  <div style={{backgroundColor: 'rgba(34, 139, 34, 0.1)'}}></div>
                  <div style={{backgroundColor: 'rgba(34, 139, 34, 0.4)'}}></div>
                  <div style={{backgroundColor: 'rgba(34, 139, 34, 0.7)'}}></div>
                  <div style={{backgroundColor: 'rgba(34, 139, 34, 1)'}}></div>
                </div>
                <span>More</span>
              </div>
              <p className="heatmap-desc">Activity density for the last 30 days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;