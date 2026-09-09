import React from 'react';

const LoadingSpinner = ({ message = 'Loading...', fullScreen = false }) => {
  const content = (
    <div className="spinner-container">
      <div className="spinner"></div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
      }}>
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
