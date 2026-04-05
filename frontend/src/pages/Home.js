import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Home.css';

// Hero section with CTAs
const HeroSection = () => {
  const { user } = useContext(AuthContext);
  return (
    <section className="hero">
      <div className="hero-content">
        {user && (
          <div className="user-welcome-badge">
            Welcome, {user.name}! 🍯
          </div>
        )}
        <h1 className="hero-title">Pure Honey & 100% Organic Products</h1>
        <p className="hero-subtitle">Natural • Chemical-Free • Farm Fresh</p>
        <div className="hero-cta">
          <Link to="/shop" className="cta-primary">Explore Products</Link>
        </div>
      </div>
      <div className="hero-visuals">
        <img
          className="hero-image primary"
          src="https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Pure organic honey jar"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src =
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="%23FFF8E1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%238B4513" font-size="32" font-family="Arial">Honey Image</text></svg>';
          }}
        />
      </div>
    </section>
  );
};

// Trust and quality badges
const TrustQualitySection = () => {
  const items = [
    { icon: '🌿', title: '100% Organic', text: 'Certified organic ingredients from sustainable farms' },
    { icon: '🧪', title: 'Chemical-Free', text: 'No additives, preservatives or artificial flavors' },
    { icon: '🏡', title: 'Farm Fresh', text: 'Harvested and packed with care daily' },
    { icon: '🏺', title: 'Traditional Methods', text: 'Prepared using time-tested natural practices' },
  ];
  return (
    <section className="trust-section">
      <div className="section-header">
        <h2>Trust & Quality</h2>
        <p>Goodness you can taste and trust</p>
      </div>
      <div className="trust-grid">
        {items.map((i) => (
          <div key={i.title} className="trust-card">
            <div className="trust-icon">{i.icon}</div>
            <h4>{i.title}</h4>
            <p>{i.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

// Payment and delivery info
const PaymentDeliverySection = () => {
  return (
    <section className="payment-section">
      <div className="section-header">
        <h2>Payment & Delivery</h2>
        <p>Simple & Secure Payment Methods</p>
      </div>
      <div className="payment-grid">
        <div className="payment-card solo">
          <div className="payment-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#8B4513" d="M7 2h10v4H7z" />
              <path fill="#FFC107" d="M3 6h18v14H3z" />
              <circle cx="8" cy="13" r="2" fill="#2E7D32" />
            </svg>
          </div>
          <div className="payment-content">
            <h4>Cash on Delivery (COD)</h4>
            <p>Pay safely when your order reaches your home</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Footer
const FooterSection = ({ user, onLogout }) => {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-col">
          <h4>About BIOBASKET</h4>
          <p>
            We are dedicated to delivering pure honey and organic products
            crafted with traditional methods. From sustainable farms to your home,
            bringing nature's best to your family.
          </p>
        </div>
        <div className="footer-col">
          <h4>Contact</h4>
          <p>📍 BIOBASKET farm, panapalayam, unjalur Main Road, Erode-638152</p>
          <p>📞 9865013205</p>
          <p>✉️ BIOBASKET@gmail.com</p>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/shop">Shop</Link>
            {user && <Link to="/orders">My Orders</Link>}
            <Link to="/cart">Cart</Link>
            {!user ? (
              <Link to="/login">Login</Link>
            ) : (
              <button type="button" className="footer-logout-btn" onClick={onLogout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} BIOBASKET. All rights reserved.</span>
      </div>
    </footer>
  );
};

const Home = () => {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="home-page">
      <div className="home-background">
        <div className="home-overlay"></div>
        <nav className="home-nav">
          <div className="nav-brand">BIOBASKET</div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/shop">Shop</Link>
            {user && <Link to="/orders">My Orders</Link>}
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            {!user && <Link to="/login">Login</Link>}
            {user && (
              <button type="button" className="nav-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>
        </nav>

        <div className="home-content">
          <HeroSection />
        </div>
      </div>

      <TrustQualitySection />
      <PaymentDeliverySection />
      <FooterSection user={user} onLogout={handleLogout} />
    </div>
  );
};

export default Home;
