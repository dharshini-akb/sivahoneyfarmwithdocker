import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './ProductDetail.css';
import './DiscussionSystem.css';

const resolveImageSrc = (image) => {
  if (!image) return '';
  const trimmed = image.replace(/^\/+/, '');
  // If it's already a full URL, return it as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return image;
  }
  
  const base = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || '';
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

const CommentItem = ({ comment, user, onLike, onReply, level = 0 }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');

  const handleReplySubmit = () => {
    if (!replyMessage.trim()) return;
    onReply(comment._id, replyMessage);
    setReplyMessage('');
    setShowReplyForm(false);
  };

  const isLiked = comment.likes.includes(user?.id);

  return (
    <div className={`comment-item ${level > 0 ? 'nested' : ''}`}>
      <div className="comment-main">
        <div className="comment-header">
          <div className="user-info">
            <div className="user-avatar">{comment.userName.charAt(0).toUpperCase()}</div>
            <div>
              <span className="user-name">{comment.userName}</span>
              {comment.rating > 0 && (
                <div className="comment-rating">
                  {'★'.repeat(comment.rating)}{'☆'.repeat(5 - comment.rating)}
                </div>
              )}
            </div>
          </div>
          <span className="comment-date">{new Date(comment.createdAt).toLocaleDateString()}</span>
        </div>
        <p className="comment-message">{comment.message}</p>
        <div className="comment-actions">
          <button 
            className={`action-btn ${isLiked ? 'liked' : ''}`} 
            onClick={() => onLike(comment._id)}
          >
            {isLiked ? '❤️' : '🤍'} {comment.likes.length}
          </button>
          <button className="action-btn" onClick={() => setShowReplyForm(!showReplyForm)}>
            💬 Reply
          </button>
        </div>

        {showReplyForm && (
          <div className="reply-form-container">
            <textarea
              className="discussion-textarea"
              placeholder="Write a reply..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
            />
            <button className="submit-discussion-btn" onClick={handleReplySubmit}>
              Post Reply
            </button>
          </div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="replies-list">
          {comment.replies.map(reply => (
            <CommentItem 
              key={reply._id} 
              comment={reply} 
              user={user} 
              onLike={onLike} 
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [likeState, setLikeState] = useState({ count: 0, liked: false });
  
  // Discussion state
  const [comments, setComments] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);

  const fetchDiscussions = useCallback(async () => {
    try {
      const res = await axios.get(`/api/discussions/${id}`);
      setComments(res.data.comments);
      setAvgRating(res.data.avgRating);
      setTotalReviews(res.data.totalReviews);
    } catch (err) {
      console.error('Error fetching discussions:', err);
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/api/products/${id}`);
        setProduct(res.data);
      } catch (error) {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchDiscussions();
    
    // Dynamic updates for reviews every 30 seconds
    const interval = setInterval(fetchDiscussions, 30000);
    return () => clearInterval(interval);
  }, [id, fetchDiscussions]);

  useEffect(() => {
    const likesStore = JSON.parse(localStorage.getItem('product_likes') || '{}');
    if (id) {
      setLikeState(likesStore[id] || { count: 0, liked: false });
    }
  }, [id]);

  const handlePostComment = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!newComment.trim()) return;

    try {
      await axios.post('/api/discussions', {
        productId: id,
        message: newComment,
        rating: newRating
      });
      setNewComment('');
      setNewRating(0);
      fetchDiscussions(); // Refresh
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await axios.put(`/api/discussions/like/${commentId}`);
      fetchDiscussions(); // Refresh
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const handleReplyComment = async (parentCommentId, message) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await axios.post('/api/discussions', {
        productId: id,
        message,
        parentCommentId
      });
      fetchDiscussions(); // Refresh
    } catch (err) {
      console.error('Error replying to comment:', err);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setAddingToCart(true);
    try {
      await axios.post('/api/cart', {
        productId: product._id,
        quantity: quantity
      });
      alert('Product added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    await handleAddToCart();
    navigate('/checkout');
  };

  const toggleLike = () => {
    const likesStore = JSON.parse(localStorage.getItem('product_likes') || '{}');
    const current = likesStore[id] || { count: 0, liked: false };
    const next = {
      count: current.liked ? Math.max(0, current.count - 1) : current.count + 1,
      liked: !current.liked
    };
    likesStore[id] = next;
    localStorage.setItem('product_likes', JSON.stringify(likesStore));
    setLikeState(next);
  };

  if (loading) {
    return <div className="loading">Loading product...</div>;
  }

  if (!product) {
    return <div className="error">Product not found</div>;
  }

  return (
    <div className="product-detail-page">
      <nav className="product-nav">
        <Link to="/" className="nav-brand">BIOBASKET</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          {user && <Link to="/orders">My Orders</Link>}
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          {user && <Link to="/cart">Cart</Link>}
        </div>
      </nav>

      <div className="product-detail-container">
        <div className="product-detail-content">
          <div className="product-image-section">
            {resolveImageSrc(product.image) ? (
              <img 
                src={resolveImageSrc(product.image)}
                alt={product.name}
                className="product-main-image"
                onError={(e) => {
                  if (e.currentTarget.src !== FALLBACK_IMAGE) {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }
                }}
              />
            ) : (
              <div className="product-placeholder-large">No Image Available</div>
            )}
          </div>
          <div className="product-info-section">
            <h1 className="product-title">{product.name}</h1>
            <div className="avg-rating-row">
              <span className="star-rating">
                {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
              </span>
              <span className="rating-text">({avgRating} / 5 based on {totalReviews} reviews)</span>
            </div>
            <p className="product-category-badge">{product.category}</p>
            <p className="product-description">{product.description}</p>
            <p className="product-price-large">₹{product.price.toFixed(2)}</p>
            <div className="detail-meta-row">
              <button
                type="button"
                className={`like-btn ${likeState.liked ? 'liked' : ''}`}
                onClick={toggleLike}
                aria-label="Like"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="heart-icon">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>{likeState.count}</span>
              </button>
              <div className="reviews-count">Discussions ({comments.length})</div>
            </div>
            
            <div className="quantity-selector">
              <label>Quantity:</label>
              <div className="quantity-controls">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span>{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
              {product.stock > 0 ? (
                <span className="stock-info">In Stock ({product.stock} available)</span>
              ) : (
                <span className="stock-info out-of-stock">Out of Stock</span>
              )}
            </div>

            <div className="product-actions">
              <button 
                className="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={addingToCart || product.stock === 0}
              >
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
              <button 
                className="buy-now-btn"
                onClick={handleBuyNow}
                disabled={product.stock === 0}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Discussion System Section */}
        <div className="discussion-system">
          <div className="discussion-header">
            <h2>Customer Community</h2>
            <div className="avg-rating-badge">
              <span className="star-rating">★</span>
              <span>{avgRating} / 5</span>
            </div>
          </div>

          <div className="post-discussion-form">
            <h3>Share your thoughts</h3>
            <div className="form-row">
              <div className="rating-select">
                <span>Rating:</span>
                <div className="star-input">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      className={`star-btn ${newRating >= star ? 'active' : ''}`}
                      onClick={() => setNewRating(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <textarea
              className="discussion-textarea"
              placeholder="What's on your mind about this product?"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button className="submit-discussion-btn" onClick={handlePostComment}>
              Post Comment
            </button>
          </div>

          <div className="comments-list">
            {comments.length === 0 ? (
              <div className="no-comments">No discussions yet. Be the first to start!</div>
            ) : (
              comments.map(comment => (
                <CommentItem 
                  key={comment._id} 
                  comment={comment} 
                  user={user} 
                  onLike={handleLikeComment}
                  onReply={handleReplyComment}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
