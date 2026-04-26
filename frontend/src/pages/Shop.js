import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Shop.css';

const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (process.env.REACT_APP_API_BASE_URL) return process.env.REACT_APP_API_BASE_URL;
  if (window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:5000`;
  }
  return 'http://localhost:5000';
};

const resolveImageSrc = (image) => {
  if (!image) return '';
  const trimmed = image.replace(/^\/+/, '');
  // If it's already a full URL, return it as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return image;
  }
  
  const base = getApiBaseUrl();
  let fullUrl = '';

  // If it's a local path starting with products/ or uploads/
  if (trimmed.startsWith('products/') || trimmed.startsWith('uploads/')) {
    fullUrl = base ? `${base}/${trimmed}` : `/${trimmed}`;
  } else if (trimmed.startsWith('images/')) {
    const publicBase = process.env.PUBLIC_URL || '';
    fullUrl = `${publicBase}/${trimmed}`;
  } else {
    // Default to products folder
    fullUrl = base ? `${base}/products/${trimmed}` : `/products/${trimmed}`;
  }

  // Handle spaces in filenames
  return encodeURI(fullUrl);
};

const FALLBACK_IMAGE = `${process.env.PUBLIC_URL || ''}/images/placeholder.svg`;

const Shop = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [likes, setLikes] = useState({});
  const { user, logout } = useContext(AuthContext);
  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedCategory !== 'all') {
          params.category = selectedCategory;
        }
        if (searchTerm) {
          params.search = searchTerm;
        }
        params.fs = 'true'; // Force use of filesystem products
        const res = await axios.get('/api/products', { params });
        setProducts(res.data);
      } catch (error) {
        const sample = [
          { _id: 'sample-1', name: 'Organic Multiflora Honey', category: 'honey', price: 299, image: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Honey_jar.jpg' },
          { _id: 'sample-2', name: 'Organic Kothamali Honey', category: 'honey', price: 319, image: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Glass_jars_of_honey.jpg' },
          { _id: 'sample-3', name: 'Organic Murungai Honey', category: 'honey', price: 329, image: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Honeycomb_with_honey.jpg' },
          { _id: 'sample-4', name: 'Organic Naval Honey', category: 'honey', price: 349, image: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Honey_and_spoon.jpg' },
          { _id: 'sample-5', name: 'Herbal Shampoo', category: 'shampoo', price: 249, image: 'images/placeholder.svg' },
          { _id: 'sample-6', name: 'Organic Spice Mix', category: 'masala', price: 199, image: 'images/placeholder.svg' },
          { _id: 'sample-7', name: 'Natural Soap Bar', category: 'soap', price: 149, image: 'images/placeholder.svg' },
          { _id: 'sample-8', name: 'Cold-Pressed Coconut Oil', category: 'oil', price: 299, image: 'images/placeholder.svg' }
        ];
        setProducts(sample);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    const storedLikes = JSON.parse(localStorage.getItem('product_likes') || '{}');
    setLikes(storedLikes);
  }, []);

  

  const toggleLike = (productId) => {
    setLikes(prev => {
      const current = prev[productId] || { count: 0, liked: false };
      const next = {
        count: current.liked ? Math.max(0, current.count - 1) : current.count + 1,
        liked: !current.liked
      };
      const updated = { ...prev, [productId]: next };
      localStorage.setItem('product_likes', JSON.stringify(updated));
      return updated;
    });
  };

  const addToCart = async (productId) => {
    try {
      if (!user) {
        navigate('/login');
        return;
      }
      await axios.post('/api/cart', { productId, quantity: 1 });
      alert('Added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart');
    }
  };

  const buyNow = async (productId) => {
    try {
      if (!user) {
        navigate('/login');
        return;
      }
      await axios.post('/api/cart', { productId, quantity: 1 });
      navigate('/cart');
    } catch (error) {
      console.error('Error in buy now:', error);
      alert('Failed to process buy now');
    }
  };

  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'honey', label: 'Honey' },
    { value: 'shampoo', label: 'Shampoos' },
    { value: 'masala', label: 'Masalas' },
    { value: 'soap', label: 'Soaps' },
    { value: 'oil', label: 'Oil' },
    { value: 'malt', label: 'Malt' },
    { value: 'washingpowder', label: 'Washing Powders' }
  ];

  return (
    <div className="shop-page">
      <nav className="shop-nav">
        <Link to="/" className="nav-brand">BIOBASKET</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          {user && <Link to="/orders">My Orders</Link>}
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          {!user && <Link to="/login">Login</Link>}
           {user && (
             <a href="/" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Logout</a>
           )}
        </div>
      </nav>

      <div className="shop-container">
        <div className="shop-header">
          <h1>Our Products</h1>
          <p>Premium Honey & Organic Products</p>
        </div>

        <div className="shop-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat.value}
                className={`category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="no-products">No products found</div>
        ) : (
          <div className="products-grid">
            {products.map(product => {
              const likeState = likes[product._id] || { count: 0, liked: false };
              const CardInner = (
                <>
                  <div className="product-image">
                    {resolveImageSrc(product.image) ? (
                      <img
                        src={resolveImageSrc(product.image)}
                        alt={product.name}
                        onError={(e) => {
                          if (e.currentTarget.src !== FALLBACK_IMAGE) {
                            e.currentTarget.src = FALLBACK_IMAGE;
                          }
                        }}
                      />
                    ) : (
                      <div className="product-placeholder">No Image</div>
                    )}
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p className="product-category">{product.category}</p>
                    <p className="product-price">₹{Number(product.price).toFixed(2)}</p>
                    <div className="product-meta">
                      <button
                        type="button"
                        className={`like-btn ${likeState.liked ? 'liked' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleLike(product._id); }}
                        aria-label="Like"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="heart-icon">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        <span>{likeState.count}</span>
                      </button>
                      <button
                        type="button"
                        className="reviews-toggle-btn"
                        onClick={(e) => { e.stopPropagation(); navigate(`/product/${product._id}`); }}
                      >
                        View Details & Reviews
                      </button>
                    </div>
                    <div className="product-actions-grid">
                      <button
                        type="button"
                        className="add-to-cart-btn-small"
                        onClick={(e) => { e.stopPropagation(); addToCart(product._id); }}
                      >
                        Add to Cart
                      </button>
                      <button
                        type="button"
                        className="buy-now-btn-small"
                        onClick={(e) => { e.stopPropagation(); buyNow(product._id); }}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </>
              );
              return (
                <div
                  key={product._id}
                  className="product-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    navigate(`/product/${product._id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/product/${product._id}`);
                    }
                  }}
                >
                  {CardInner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
