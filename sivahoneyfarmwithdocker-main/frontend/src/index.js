import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';

// Only set baseURL for local development if needed. 
// In production, we use Vercel rewrites (proxy) to avoid CSP errors.
const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || 'http://43.205.180.31:5000';
axios.defaults.baseURL = apiBaseUrl;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
