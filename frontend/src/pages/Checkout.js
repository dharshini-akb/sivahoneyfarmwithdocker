import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Checkout.css';
import './QRModal.css';

const resolveImageSrc = (image) => {
  if (!image) return '';
  const trimmed = image.replace(/^\/+/, '');
  // If it's already a full URL, return it as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return image;
  }
  // If it's a local path starting with products/ or uploads/
  if (trimmed.startsWith('products/') || trimmed.startsWith('uploads/')) {
    const base = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';
    return `${base}/${trimmed}`;
  }
  if (trimmed.startsWith('images/')) {
    const base = process.env.PUBLIC_URL || '';
    return `${base}/${trimmed}`;
  }
  // Default to backend base URL for other paths
  const base = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';
  return `${base}/${trimmed}`;
};

const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
  : null;

const StripeCheckoutWrapper = (props) => {
  const stripe = useStripe();
  const elements = useElements();
  return <CheckoutFormContent {...props} stripe={stripe} elements={elements} />;
};

const CheckoutFormContent = ({ cart, products, total, onOrderComplete, hasStripe, stripe, elements, discountInfo }) => {
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    phone: ''
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Name is required';
        else if (value.trim().length < 2) error = 'Name must be at least 2 characters';
        else if (!/^[a-zA-Z\s]+$/.test(value)) error = 'Name should only contain letters';
        break;
      case 'phone':
        if (!value.trim()) error = 'Phone number is required';
        else if (!/^\d{10}$/.test(value.trim())) error = 'Enter a valid 10-digit phone number';
        break;
      case 'address':
        if (!value.trim()) error = 'Address is required';
        else if (value.trim().length < 5) error = 'Enter a complete address';
        break;
      case 'city':
        if (!value.trim()) error = 'City is required';
        break;
      case 'state':
        if (!value.trim()) error = 'State is required';
        break;
      case 'zipCode':
        if (!value.trim()) error = 'Zip Code is required';
        else if (!/^\d{6}$/.test(value.trim())) error = 'Enter a valid 6-digit PIN code';
        break;
      case 'country':
        if (!value.trim()) error = 'Country is required';
        break;
      default:
        break;
    }
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Numeric only validation for phone and zipCode
    if (name === 'phone' || name === 'zipCode') {
      const numericValue = value.replace(/\D/g, ''); // Remove all non-digits
      
      // Limit length
      if (name === 'phone' && numericValue.length > 10) return;
      if (name === 'zipCode' && numericValue.length > 6) return;
      
      setShippingInfo({
        ...shippingInfo,
        [name]: numericValue
      });
    } else {
      setShippingInfo({
        ...shippingInfo,
        [name]: value
      });
    }
    
    // Clear error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate all fields
    const errors = {};
    Object.keys(shippingInfo).forEach(key => {
      const error = validateField(key, shippingInfo[key]);
      if (error) errors[key] = error;
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please fix the errors in the form');
      return;
    }

    setProcessing(true);

    try {
      let paymentId = 'COD-' + Date.now();

      // Create order
      const orderData = {
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        shippingInfo,
        paymentMethod: 'cod',
        paymentId,
        totalAmount: total - discountInfo.amount
      };

      const orderRes = await axios.post('/api/orders', orderData);

      // Clear cart
      await axios.delete('/api/cart');

      onOrderComplete(orderRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Order placement failed');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="checkout-section">
        <h3>Shipping Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={shippingInfo.name}
              onChange={handleInputChange}
              className={validationErrors.name ? 'input-error' : ''}
              required
            />
            {validationErrors.name && <span className="field-error">{validationErrors.name}</span>}
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={shippingInfo.phone}
              onChange={handleInputChange}
              className={validationErrors.phone ? 'input-error' : ''}
              required
            />
            {validationErrors.phone && <span className="field-error">{validationErrors.phone}</span>}
          </div>
        </div>
        <div className="form-group">
          <label>Address</label>
          <input
            type="text"
            name="address"
            value={shippingInfo.address}
            onChange={handleInputChange}
            className={validationErrors.address ? 'input-error' : ''}
            required
          />
          {validationErrors.address && <span className="field-error">{validationErrors.address}</span>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={shippingInfo.city}
              onChange={handleInputChange}
              className={validationErrors.city ? 'input-error' : ''}
              required
            />
            {validationErrors.city && <span className="field-error">{validationErrors.city}</span>}
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              value={shippingInfo.state}
              onChange={handleInputChange}
              className={validationErrors.state ? 'input-error' : ''}
              required
            />
            {validationErrors.state && <span className="field-error">{validationErrors.state}</span>}
          </div>
          <div className="form-group">
            <label>Zip Code</label>
            <input
              type="text"
              name="zipCode"
              value={shippingInfo.zipCode}
              onChange={handleInputChange}
              className={validationErrors.zipCode ? 'input-error' : ''}
              required
            />
            {validationErrors.zipCode && <span className="field-error">{validationErrors.zipCode}</span>}
          </div>
        </div>
        <div className="form-group">
          <label>Country</label>
          <input
            type="text"
            name="country"
            value={shippingInfo.country}
            onChange={handleInputChange}
            className={validationErrors.country ? 'input-error' : ''}
            required
          />
          {validationErrors.country && <span className="field-error">{validationErrors.country}</span>}
        </div>
      </div>

      <div className="checkout-section">
        <h3>Payment Method</h3>
        <div className="payment-methods">
          <label className="payment-option">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={true}
              readOnly
            />
            <span>Cash on Delivery (COD)</span>
          </label>
        </div>

        <div className="payment-info">
          <p>Pay with cash when your order is delivered. Additional charges may apply for COD orders.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        type="submit"
        className="complete-order-btn"
        disabled={processing}
      >
        {processing ? 'Processing...' : 'Complete Order'}
      </button>
    </form>
  );
};

const Checkout = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [products, setProducts] = useState({});
  const [total, setTotal] = useState(0);
  const [discountInfo, setDiscountInfo] = useState({ amount: 0, details: [] });
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const checkDiscounts = useCallback(async () => {
    try {
      const res = await axios.get('/api/orders');
      const isFirstUser = res.data.length === 0;
      
      let totalItems = 0;
      let subtotal = 0;
      cart.items.forEach(item => {
        const product = products[item.productId];
        if (product) {
          subtotal += product.price * item.quantity;
          totalItems += item.quantity;
        }
      });

      let discountAmount = 0;
      let details = [];

      // Combo Discount
      if (totalItems === 2) {
        const amt = subtotal * 0.10;
        discountAmount += amt;
        details.push({ type: 'Combo Discount (10%)', amount: amt });
      } else if (totalItems >= 3) {
        const amt = subtotal * 0.20;
        discountAmount += amt;
        details.push({ type: 'Combo Discount (20%)', amount: amt });
      }

      // First User Discount
      if (isFirstUser) {
        const amt = (subtotal - discountAmount) * 0.10;
        discountAmount += amt;
        details.push({ type: 'First User Discount (10%)', amount: amt });
      }

      setDiscountInfo({ amount: discountAmount, details });
    } catch (error) {
      console.error('Error checking discounts:', error);
    }
  }, [cart.items, products]);

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

  const fetchCart = useCallback(async () => {
    try {
      const res = await axios.get('/api/cart');
      setCart(res.data);

      if (res.data.items.length === 0) {
        navigate('/cart');
        return;
      }

      const productIds = res.data.items.map(item => item.productId);
      const productPromises = productIds.map(id => axios.get(`/api/products/${id}`));
      const productResponses = await Promise.all(productPromises);

      const productsMap = {};
      productResponses.forEach((r, index) => {
        productsMap[productIds[index]] = r.data;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchCart();
  }, [fetchCart, navigate, user]);

  useEffect(() => {
    calculateTotal();
    checkDiscounts();
  }, [calculateTotal, checkDiscounts]);

  const handleOrderComplete = (order) => {
    setOrderComplete(true);
    setOrderId(order._id);
  };

  if (orderComplete) {
    return (
      <div className="checkout-page">
        <nav className="checkout-nav">
          <Link to="/" className="nav-brand">BIOBASKET</Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/shop">Shop</Link>
            {user && <Link to="/orders">My Orders</Link>}
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </nav>
        <div className="order-success">
          <h1>Order Placed Successfully!</h1>
          <p>Your order ID: {orderId?.slice(-6).toUpperCase()}</p>
          <p>You will receive a confirmation email shortly.</p>
          <button onClick={() => navigate('/shop')} className="continue-shopping-btn">
            Continue Shopping
          </button>
          <button onClick={() => navigate('/orders')} className="view-orders-btn" style={{marginLeft: '10px', backgroundColor: '#3498db'}}>
            View Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <nav className="checkout-nav">
        <Link to="/" className="nav-brand">BIOBASKET</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          {user && <Link to="/orders">My Orders</Link>}
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </nav>
      <div className="checkout-container">
        <h1 className="checkout-title">Shopping Cart & Checkout</h1>

        <div className="checkout-content">
          <div className="checkout-cart-summary">
            <h2>Shopping Cart</h2>
            <div className="cart-items-list">
              {cart.items.map(item => {
                const product = products[item.productId];
                if (!product) return null;

                return (
                  <div key={item.productId} className="checkout-cart-item">
                    <div className="checkout-item-image">
                      {resolveImageSrc(product.image) ? (
                        <img src={resolveImageSrc(product.image)} alt={product.name} />
                      ) : (
                        <div className="item-placeholder">No Image</div>
                      )}
                    </div>
                    <div className="checkout-item-info">
                      <h4>{product.name}</h4>
                      <p>₹{product.price.toFixed(2)} × {item.quantity}</p>
                    </div>
                    <div className="checkout-item-total">
                      ₹{(product.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="checkout-total">
              <h3>Total: ₹{total.toFixed(2)}</h3>
              {discountInfo.amount > 0 && (
                <div className="discount-info">
                  {discountInfo.details.map((d, i) => (
                    <div key={i} className="discount-item">
                      <span>{d.type}</span>
                      <span>- ₹{d.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="final-total">
                    <h3>Payable Amount: ₹{(total - discountInfo.amount).toFixed(2)}</h3>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="checkout-form-wrapper">
            <h2>Secure Checkout</h2>
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <StripeCheckoutWrapper
                  cart={cart}
                  products={products}
                  total={total}
                  onOrderComplete={handleOrderComplete}
                  hasStripe={true}
                  discountInfo={discountInfo}
                />
              </Elements>
            ) : (
              <CheckoutFormContent
                cart={cart}
                products={products}
                total={total}
                onOrderComplete={handleOrderComplete}
                hasStripe={false}
                stripe={null}
                elements={null}
                discountInfo={discountInfo}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
