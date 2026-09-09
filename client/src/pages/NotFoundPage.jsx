import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div className="glass-card" style={{ padding: '48px', maxWidth: '480px', width: '100%' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <AlertCircle size={32} />
        </div>
        
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '8px' }} className="gradient-text">404</h1>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '0.95rem' }}>
          The requested page does not exist or has been moved.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link to="/" className="btn btn-secondary">
            <ArrowLeft size={16} /> Go Back Home
          </Link>
          <Link to="/dashboard" className="btn btn-primary">
            <Home size={16} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
