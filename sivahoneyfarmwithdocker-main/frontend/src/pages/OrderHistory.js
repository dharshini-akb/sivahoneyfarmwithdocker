import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './OrderHistory.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const OrderHistory = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/orders');
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (order) => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    // Add company logo/header
    doc.setFontSize(20);
    doc.setTextColor(139, 69, 19); // #8B4513
    doc.text('BIOBASKET', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Premium Honey & Organic Products', 105, 26, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(20, 32, 190, 32);
    
    // Order Details
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 20, 45);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Order ID: #${order._id.toUpperCase()}`, 20, 55);
    doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 20, 62);
    doc.text(`Customer: ${user?.name || 'Valued Customer'}`, 20, 69);
    doc.text(`Email: ${user?.email || 'N/A'}`, 20, 76);
    
    // Shipping Address
    if (order.shippingInfo) {
      doc.setFont('helvetica', 'bold');
      doc.text('Shipping Address:', 120, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(`${order.shippingInfo.name}`, 120, 62);
      doc.text(`${order.shippingInfo.address}`, 120, 69);
      doc.text(`${order.shippingInfo.city}, ${order.shippingInfo.state} ${order.shippingInfo.zipCode}`, 120, 76);
      doc.text(`${order.shippingInfo.country}`, 120, 83);
    }

    // Table Data
    const tableRows = order.items.map(item => [
      item.product?.name || item.name || 'Product Removed',
      `x${item.quantity}`,
      `Rs. ${item.price.toFixed(2)}`,
      `Rs. ${(item.price * item.quantity).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['Product', 'Quantity', 'Price', 'Subtotal']],
      body: tableRows,
      headStyles: { fillColor: [139, 69, 19] },
      margin: { top: 90 },
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: Rs. ${order.totalAmount.toFixed(2)}`, 140, finalY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 140, finalY + 7);
    doc.text(`Order Status: ${order.orderStatus.toUpperCase()}`, 140, finalY + 14);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Thank you for shopping with BIOBASKET!', 105, 280, { align: 'center' });

    doc.save(`Invoice_${order._id.slice(-6)}.pdf`);
  };

  if (loading) {
    return <div className="loading-spinner">Loading orders...</div>;
  }

  return (
    <div className="order-history-page">
      <nav className="order-nav">
        <Link to="/" className="nav-brand">BIOBASKET</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          {user && <Link to="/orders">My Orders</Link>}
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </nav>
      <div className="order-history-container">
        <h1>My Order History</h1>
        
        {orders.length === 0 ? (
          <div className="no-orders">
            <p>You haven't placed any orders yet.</p>
            <a href="/shop" className="start-shopping-btn" style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '10px 20px',
              backgroundColor: '#f39c12',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>Start Shopping</a>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-id">
                    <strong>Order ID:</strong> {order._id.slice(-6).toUpperCase()}
                  </div>
                  <div className="order-date">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                  <div className={`order-status status-${order.orderStatus}`}>
                    {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                  </div>
                </div>
                
                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="item-info">
                        <span className="item-name">{item.product?.name || item.name || 'Product Removed'}</span>
                        <span className="item-qty">x{item.quantity}</span>
                      </div>
                      <div className="item-price">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="order-footer">
                  <div className="payment-info">
                    <span className="payment-method">
                      Method: {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'qr' ? 'QR Code' : 'Card'}
                    </span>
                    <span className={`payment-status status-${order.paymentStatus}`}>
                      Payment: {order.paymentStatus}
                    </span>
                  </div>
                  <div className="order-actions">
                    <button 
                      className="download-invoice-btn"
                      onClick={() => downloadInvoice(order)}
                    >
                      Download Invoice (PDF)
                    </button>
                    <div className="order-total">
                      <strong>Total: ₹{order.totalAmount.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
