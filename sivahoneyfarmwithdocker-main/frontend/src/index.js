import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';

// Set baseURL for API calls
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (process.env.REACT_APP_API_BASE_URL) return process.env.REACT_APP_API_BASE_URL;
  
  // If we are in production and hosted on an IP/domain
  if (window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:5000`;
  }
  
  return 'http://localhost:5000';
};

axios.defaults.baseURL = getApiBaseUrl();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
