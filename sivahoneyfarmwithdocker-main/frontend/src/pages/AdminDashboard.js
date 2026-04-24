import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './AdminDashboard.css';

const resolveImageSrc = (image) => {
  if (!image) return '';
  
  // 1. Basic cleanup
  let cleaned = image.toString().replace(/\\/g, '/').replace(/\/+/g, '/');
  let trimmed = cleaned.replace(/^\/+/, '');
  
  // 2. Handle absolute URLs pointing to localhost
  if (trimmed.toLowerCase().includes('localhost:5000')) {
    trimmed = trimmed.replace(/http:\/\/localhost:5000/i, 'http://43.205.180.31:5000');
    return encodeURI(trimmed);
  }

  // 3. If it's already a full valid URL or data URI, return it
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  
  const base = 'http://43.205.180.31:5000';
  let fullUrl = '';

  // 4. Determine folder based on prefix or pattern
  if (trimmed.startsWith('products/') || trimmed.startsWith('uploads/')) {
    fullUrl = `${base}/${trimmed}`;
  } else if (trimmed.startsWith('images/')) {
    const publicBase = process.env.PUBLIC_URL || '';
    fullUrl = `${publicBase}/${trimmed}`;
  } else if (/^\d{13}-/.test(trimmed)) {
    // Files starting with 13-digit timestamp are usually in uploads
    fullUrl = `${base}/uploads/${trimmed}`;
  } else {
    // Default fallback - try products first as it's the standard for new uploads
    fullUrl = `${base}/products/${trimmed}`;
  }

  const result = encodeURI(fullUrl);
  // Optional: console.log(`Resolved image: ${image} -> ${result}`);
  return result;
};

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalSales: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'organic',
    stock: '',
    featured: false
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'organic',
    stock: '',
    featured: false
  });
  const [editImageFile, setEditImageFile] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentOrders();
    fetchProducts();
    const interval = setInterval(() => {
      fetchRecentOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get('/api/admin/dashboard');
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await axios.get('/api/admin/orders');
      setRecentOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const updateOrderInfo = async (orderId, updates) => {
    try {
      await axios.put(`/api/admin/orders/${orderId}/status`, updates);
      
      // Update the order in the state
      setRecentOrders(recentOrders.map(order => 
        order._id === orderId ? { ...order, ...updates } : order
      ));
      
      alert('Order updated successfully!');
    } catch (error) {
      console.error('Error updating order:', error);
      const message = error.response?.data?.message || 'Failed to update order';
      const details = error.response?.data?.details || '';
      alert(`${message}${details ? ': ' + details : ''}`);
    }
  };
  
  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProductForm({
      ...productForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('description', productForm.description);
      formData.append('price', productForm.price);
      formData.append('category', productForm.category);
      formData.append('stock', productForm.stock);
      formData.append('featured', productForm.featured);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await axios.post('/api/admin/products', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Product added successfully!');
      setProductForm({
        name: '',
        description: '',
        price: '',
        category: 'organic',
        stock: '',
        featured: false
      });
      setImageFile(null);
      document.getElementById('product-image').value = '';
      fetchDashboardData();
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product');
    } finally {
      setLoading(false);
    }
  };
  
  const startEditProduct = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
      featured: product.featured
    });
    setEditImageFile(null);
  };
  
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({
      ...editForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleEditImageChange = (e) => {
    setEditImageFile(e.target.files[0]);
  };
  
  const saveEditProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('description', editForm.description);
      formData.append('price', editForm.price);
      formData.append('category', editForm.category);
      formData.append('stock', editForm.stock);
      formData.append('featured', editForm.featured);
      if (editImageFile) {
        formData.append('image', editImageFile);
      }
      await axios.put(`/api/admin/products/${editingProduct._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setEditingProduct(null);
      fetchDashboardData();
      fetchProducts();
      alert('Product updated');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    }
  };
  
  const deleteProduct = async (productId) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`/api/admin/products/${productId}`);
      fetchDashboardData();
      fetchProducts();
      alert('Product deleted');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-dashboard-page">
      <nav className="admin-nav">
        <div className="nav-brand">BIOBASKET Admin</div>
        <div className="nav-links">
          <Link to="/">Store</Link>
          <Link to="/admin/analytics">Analytics</Link>
          <Link to="/admin/discussions">Discussions</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>
      <div className="admin-dashboard-background">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <div className="admin-header-actions">
            <span>Welcome, {user?.name}</span>
            <Link to="/admin/analytics" className="analytics-link">View Analytics</Link>
            <Link to="/admin/sales" className="sales-link">Sales Insights</Link>
            <Link to="/admin/discussions" className="discussions-link">Discussions</Link>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
        <div className="admin-role-banner">
          Signed in as {user?.email} • role: {user?.role}
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Products</h3>
            <p>{stats.totalProducts}</p>
          </div>
          <div className="stat-card">
            <h3>New Orders</h3>
            <p>{stats.totalOrders}</p>
          </div>
          <div className="stat-card">
            <h3>Total Sales</h3>
            <p>₹{stats.totalSales.toFixed(2)}</p>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="panels-row">
            <div className="add-product-panel">
              <h2>Add New Product</h2>
              <form onSubmit={handleAddProduct} className="product-form">
                <div className="form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    name="name"
                    value={productForm.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    name="price"
                    value={productForm.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={productForm.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="honey">Honey</option>
                    <option value="shampoo">Shampoo</option>
                    <option value="masala">Masala</option>
                    <option value="soap">Soap</option>
                    <option value="oil">Oil</option>
                    <option value="malt">Malt</option>
                    <option value="washingpowder">Washing Powders</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={productForm.stock}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={productForm.description}
                    onChange={handleInputChange}
                    rows="4"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="featured"
                      checked={productForm.featured}
                      onChange={handleInputChange}
                    />
                    Featured Product
                  </label>
                </div>
                <div className="form-group">
                  <label>Product Image</label>
                  <input
                    type="file"
                    id="product-image"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="upload-btn">Upload Image</button>
                  <button type="submit" className="add-product-btn" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Product'}
                  </button>
                </div>
              </form>
            </div>

            <div className="orders-panel">
              <h2>Manage Products</h2>
              <div className="orders-list">
                {products.map(p => (
                  <div key={p._id} className="order-item">
                    <div className="order-header">
                      <div className="product-list-image">
                        {resolveImageSrc(p.image) ? (
                          <img 
                            src={resolveImageSrc(p.image)} 
                            alt={p.name} 
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px' }}
                          />
                        ) : (
                          <div style={{ width: '50px', height: '50px', background: '#eee', borderRadius: '4px', marginRight: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>No Img</div>
                        )}
                      </div>
                      <span className="order-title">{p.name}</span>
                    </div>
                    <div className="order-details">
                      <p>Price: ₹{p.price.toFixed(2)}</p>
                      <p>Stock: {p.stock}</p>
                      <p>Category: {p.category}</p>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="upload-btn" onClick={() => startEditProduct(p)}>Edit</button>
                      <button type="button" className="add-product-btn" onClick={() => deleteProduct(p._id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="no-orders">No products</div>
                )}
              </div>
              {editingProduct && (
                <form onSubmit={saveEditProduct} className="product-form" style={{ marginTop: 20 }}>
                  <h3>Edit Product</h3>
                  <div className="form-group">
                    <label>Name</label>
                    <input name="name" value={editForm.name} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label>Price</label>
                    <input type="number" step="0.01" min="0" name="price" value={editForm.price} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category" value={editForm.category} onChange={handleEditChange} required>
                      <option value="honey">Honey</option>
                      <option value="shampoo">Shampoo</option>
                      <option value="masala">Masala</option>
                      <option value="soap">Soap</option>
                      <option value="oil">Oil</option>
                      <option value="malt">Malt</option>
                      <option value="washingpowder">Washing Powders</option>
                  </select>
                  </div>
                  <div className="form-group">
                    <label>Stock</label>
                    <input type="number" min="0" name="stock" value={editForm.stock} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea rows="3" name="description" value={editForm.description} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" name="featured" checked={editForm.featured} onChange={handleEditChange} />
                      Featured Product
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Replace Image</label>
                    <input type="file" accept="image/*" onChange={handleEditImageChange} />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="add-product-btn">Save</button>
                    <button type="button" className="upload-btn" onClick={() => setEditingProduct(null)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="orders-panel full-width">
            <h2>Order Management</h2>
            {ordersLoading ? (
              <div className="loading">Loading orders...</div>
            ) : recentOrders.length === 0 ? (
              <div className="no-orders">No orders yet</div>
            ) : (
              <div className="orders-list">
                {recentOrders.map(order => (
                  <div key={order._id} className="order-item">
                    <div className="order-header">
                      <span className="order-title">
                        Order #{order._id.slice(-8)}
                      </span>
                      <div className="status-controls">
                        <div className="status-group">
                          <label>Order:</label>
                          <select 
                            value={order.orderStatus} 
                            onChange={(e) => updateOrderInfo(order._id, { orderStatus: e.target.value })}
                            className="status-select"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        </div>
                        <div className="status-group">
                           <label>Payment:</label>
                           <select 
                             value={order.paymentStatus} 
                             onChange={(e) => updateOrderInfo(order._id, { paymentStatus: e.target.value })}
                             className="status-select"
                           >
                             <option value="pending">Pending</option>
                             <option value="completed">Completed</option>
                             <option value="failed">Failed</option>
                           </select>
                         </div>
                         <div className="status-group">
                           <label>Method:</label>
                           <select 
                             value={order.paymentMethod} 
                             onChange={(e) => updateOrderInfo(order._id, { paymentMethod: e.target.value })}
                             className="status-select"
                           >
                             <option value="cod">Cash on Delivery</option>
                           </select>
                         </div>
                       </div>
                    </div>
                    <div className="order-details">
                      <div className="order-info">
                        <p><strong>Customer:</strong> {order.user?.name || 'Unknown'}</p>
                        <p><strong>Email:</strong> {order.user?.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> {order.shippingInfo?.phone || 'N/A'}</p>
                        <p><strong>Payment Method:</strong> {
                          order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod
                        }</p>
                        <p><strong>Payment Status:</strong> 
                          <span className={`payment-status ${order.paymentStatus}`}>
                            {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                          </span>
                        </p>
                      </div>
                      <div className="order-items-summary">
                        <p><strong>Items:</strong></p>
                        {order.items.map((item, index) => (
                          <div key={index} className="order-item-summary">
                            {item.quantity}x {item.product?.name || item.name || 'Product Removed'} - ₹{item.price.toFixed(2)}
                          </div>
                        ))}
                      </div>
                      <div className="order-total-info">
                        <p><strong>Total Amount:</strong> ₹{order.totalAmount.toFixed(2)}</p>
                        <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                        <p><strong>Shipping Address:</strong></p>
                        <p className="address">
                          {order.shippingInfo?.name}, {order.shippingInfo?.address},<br/>
                          {order.shippingInfo?.city}, {order.shippingInfo?.state} {order.shippingInfo?.zipCode}<br/>
                          {order.shippingInfo?.country}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
