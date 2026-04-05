import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './About.css';

const About = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="about-page">
      <nav className="about-nav">
        <Link to="/" className="nav-brand">BIOBASKET</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          {user && <Link to="/orders">My Orders</Link>}
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </nav>

      <div className="about-container">
        <div className="about-content">
          <h1>About BIOBASKET</h1>
          <p className="about-tagline">Premium Honey & Organic Products</p>
          
          <div className="about-section">
            <h2>Our Story</h2>
            <p>
              BIOBASKET is dedicated to providing the finest quality honey and organic products 
              straight from nature. We believe in the power of pure, natural ingredients that have been 
              cherished for generations.
            </p>
          </div>

          <div className="about-section">
            <h2>Our Products</h2>
            <p>
              We offer a wide range of premium products including:
            </p>
            <ul>
              <li>100% Pure Organic Honey</li>
              <li>Natural Shampoos</li>
              <li>Traditional Masalas & Spices</li>
              <li>Organic Soaps</li>
              <li>And many more organic products</li>
            </ul>
          </div>

          <div className="about-section">
            <h2>Our Commitment</h2>
            <p>
              We are committed to delivering the highest quality products while maintaining our 
              traditional values and sustainable practices. Every product is carefully selected 
              and tested to ensure it meets our strict quality standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
