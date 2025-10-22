import React from 'react';
import ReactDOM from 'react-dom/client';
import AIGroupChat from './Chat.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AIGroupChat />
    </AuthProvider>
  </React.StrictMode>
);