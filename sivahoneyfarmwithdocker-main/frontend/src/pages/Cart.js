import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Cart.css';

const resolveImageSrc = (image) => {
  if (!image) return '';
  const trimmed = image.replace(/^\/+/, '');
  // If it's already a full URL, return it as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return image;
  }
  
  const base = 'http://43.205.180.31:5000';
  let fullUrl = '';

  // If it's a local path starting with products/ or uploads/
  if (trimmed.startsWith('products/') || trimmed.startsWith('uploads/')) {
    fullUrl = `${base}/${trimmed}`;
  } else if (trimmed.startsWith('images/')) {
    const publicBase = process.env.PUBLIC_URL || '';
    fullUrl = `${publicBase}/${trimmed}`;
  } else {
    // Default to products folder
    fullUrl = `${base}/products/${trimmed}`;
  }

  // Handle spaces in filenames
  return encodeURI(fullUrl);
};

const FALLBACK_IMAGE = `${process.env.PUBLIC_URL || ''}/images/placeholder.svg`;

const Cart = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [featuredHoney, setFeaturedHoney] = useState([]);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchCart();
    fetchFeaturedHoney();
  }, []);

  const calculateTotal = useCallback(() => {
    let sum = 0;
    cart.items.forEach(item => {
      const product = products[item.productId];
      if (product) {
        sum += product.price * item.quantity;
      }
    });
    setTotal(sum);
  }, [cart.items, products]);

  useEffect(() => {
    calculateTotal();
  }, [calculateTotal]);

  const fetchCart = async () => {
    try {
      const res = await axios.get('/api/cart');
      setCart(res.data);

      // Build products map from enriched response if available; fallback to API fetch
      if (res.data.items && res.data.items.length && res.data.items[0].product) {
        const productsMap = {};
        res.data.items.forEach(item => {
          if (item.product) {
            productsMap[item.productId] = item.product;
          }
        });
        setProducts(productsMap);
      } else {
        const productIds = res.data.items.map(item => item.productId);
        const productsMap = {};
        
        await Promise.all(productIds.map(async (id) => {
          try {
            const pr = await axios.get(`/api/products/${id}`);
            productsMap[id] = pr.data;
          } catch (err) {
            console.warn(`Could not fetch product ${id}`, err);
          }
        }));
        
        setProducts(productsMap);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedHoney = async () => {
    try {
      const res = await axios.get('/api/products', { params: { category: 'honey', featured: 'true' } });
      setFeaturedHoney(res.data);
    } catch (error) {
      console.error('Error fetching featured honey:', error);
    }
  };

  const addToCart = async (productId) => {
    try {
      if (!user) {
        navigate('/login');
        return;
      }
      await axios.post('/api/cart', { productId, quantity: 1 });
      await fetchCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const buyNow = async (productId) => {
    try {
      if (!user) {
        navigate('/login');
        return;
      }
      await axios.post('/api/cart', { productId, quantity: 1 });
      navigate('/checkout');
    } catch (error) {
      console.error('Error in buy now:', error);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeItem(productId);
      return;
    }

    try {
      await axios.put(`/api/cart/${productId}`, { quantity: newQuantity });
      setCart(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.productId === productId ? { ...item, quantity: newQuantity } : item
        )
      }));
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const removeItem = async (productId) => {
    try {
      await axios.delete(`/api/cart/${productId}`);
      setCart(prev => ({
        ...prev,
        items: prev.items.filter(item => item.productId !== productId)
      }));
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading cart...</div>;
  }

  return (
    <div className="cart-page">
      <nav className="cart-nav">
        <Link to="/" className="nav-brand">BIOBASKET</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          {user && <Link to="/orders">My Orders</Link>}
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          {user && (
            <button type="button" onClick={handleLogout}>Logout</button>
          )}
        </div>
      </nav>

      <div className="cart-container">
        <h1 className="cart-title">Shopping Cart</h1>
        <div className="featured-honey-section">
          <h2 className="featured-title">Honey Varieties</h2>
          <p className="featured-subtitle">Premium honey selections</p>
          {featuredHoney.length === 0 ? (
            <div className="no-featured">No featured honey yet</div>
          ) : (
            <div className="featured-grid">
              {featuredHoney.map(h => {
                const hImageSrc = resolveImageSrc(h.image);
                return (
                  <div key={h._id} className="featured-card">
                    <div className="featured-image">
                      {hImageSrc ? (
                        <img src={hImageSrc} alt={h.name} onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_IMAGE;
                        }} />
                      ) : (
                        <div className="featured-placeholder">No Image</div>
                      )}
                    </div>
                  <div className="featured-info">
                    <div className="featured-top-actions">
                      <button className="featured-add-btn" onClick={() => addToCart(h._id)}>Add to Cart</button>
                    </div>
                    <h3 className="featured-name">{h.name}</h3>
                    <p className="featured-price">₹{h.price.toFixed(2)}</p>
                    <button className="featured-buy-btn" onClick={() => buyNow(h._id)}>Buy Now</button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.items.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <Link to="/shop" className="continue-shopping-btn">Continue Shopping</Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {cart.items.map(item => {
                const product = products[item.productId];
                if (!product) return null;

                const imageSrc = resolveImageSrc(product.image);

                return (
                  <div key={item.productId} className="cart-item">
                    <div className="cart-item-image">
                      {imageSrc ? (
                        <img src={imageSrc} alt={product.name} onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = FALLBACK_IMAGE;
                        }} />
                      ) : (
                        <div className="item-placeholder">No Image</div>
                      )}
                    </div>
                    <div className="cart-item-info">
                      <h3>{product.name}</h3>
                      <p className="item-price">₹{product.price.toFixed(2)}</p>
                    </div>
                    <div className="cart-item-quantity">
                      <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <div className="cart-item-total">
                      <p>₹{(product.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <button 
                      className="remove-item-btn"
                      onClick={() => removeItem(item.productId)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <h2>Total: ₹{total.toFixed(2)}</h2>
              <Link to="/checkout" className="checkout-btn">
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
