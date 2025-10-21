import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
// import { initializeCosmosDB } from './api/cosmosClient';

// Note: Cosmos DB cannot be called directly from browser due to CORS restrictions
// For now, using localStorage. To use Cosmos DB, you need to create a backend API
// Initialize Cosmos DB (if configured)
// initializeCosmosDB().catch((error) => {
//   console.warn('Cosmos DB not configured, using localStorage:', error.message);
// });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
