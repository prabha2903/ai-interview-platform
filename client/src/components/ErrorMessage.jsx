import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ErrorMessage = ({ message, type = 'error', onClose }) => {
  if (!message) return null;

  const typeStyles = {
    error: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)',
      color: '#f87171',
      icon: <AlertCircle size={18} />
    },
    success: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      color: '#34d399',
      icon: <CheckCircle2 size={18} />
    },
    info: {
      bg: 'rgba(99, 102, 241, 0.12)',
      border: 'rgba(99, 102, 241, 0.3)',
      color: '#818cf8',
      icon: <Info size={18} />
    }
  };

  const style = typeStyles[type] || typeStyles.error;

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      background: style.bg,
      border: `1px solid ${style.border}`,
      color: style.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.9rem',
      fontWeight: 500,
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {style.icon}
        <span>{message}</span>
      </div>
      {onClose && (
        <button 
          onClick={onClose} 
          style={{ color: style.color, opacity: 0.8, display: 'flex', alignItems: 'center' }}
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
