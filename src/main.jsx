import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import 'swiper/css/bundle';
import '../css/tokens.css';
import '../css/base.css';
import '../css/layout.css';
import '../css/components.css';
import '../css/box.css';
import '../css/sections.css';
import '../css/notice-banner.css';
import '../css/shop.css';
import '../css/account.css';
import '../css/notice.css';
import '../css/qna.css';
import './styles/react.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
