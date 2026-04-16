import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDiscussions = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const res = await axios.get('/api/discussions/admin/all');
      setComments(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await axios.delete(`/api/discussions/${id}`);
      fetchComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  if (loading) return <div>Loading discussions...</div>;

  return (
    <div className="admin-page">
      <nav className="admin-nav">
        <div className="nav-brand">BIOBASKET Admin</div>
        <div className="nav-links">
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/analytics">Analytics</Link>
          <Link to="/">Store</Link>
        </div>
      </nav>

      <div className="admin-container">
        <h1>Discussion Management</h1>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Product</th>
                <th>Message</th>
                <th>Rating</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map(comment => (
                <tr key={comment._id}>
                  <td>{comment.userName}</td>
                  <td>{comment.product?.name || 'N/A'}</td>
                  <td>{comment.message}</td>
                  <td>{comment.rating > 0 ? `${comment.rating} ⭐` : 'N/A'}</td>
                  <td>{new Date(comment.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="delete-btn" onClick={() => handleDelete(comment._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDiscussions;