import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import { requestPasswordReset } from '../services/authService';
import { Mail, Sparkles, Send, ChevronLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <div className="navbar-brand-icon" style={{ margin: '0 auto 16px auto' }}>
            <Sparkles size={22} />
          </div>
          <h2 className="auth-title">Reset Your Password</h2>
          <p className="auth-subtitle">
            Enter the email address on your account and we'll send you a link to reset your password.
          </p>
        </div>

        <ErrorMessage message={error} onClose={() => setError(null)} />

        {submitted ? (
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              If an account exists for <strong>{email}</strong>, a password reset link has been
              sent. It expires in 15 minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                />
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px', padding: '12px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Sending reset link...'
              ) : (
                <>
                  <Send size={18} /> Send Reset Link
                </>
              )}
            </button>
          </form>
        )}

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ChevronLeft size={16} /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
