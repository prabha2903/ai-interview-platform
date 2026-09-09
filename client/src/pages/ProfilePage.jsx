import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import { User, Mail, Lock, ShieldCheck, Save, Calendar, Sparkles } from 'lucide-react';

const ProfilePage = () => {
  const { user, updateUserProfile, error, clearError } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    clearError();

    setIsSubmitting(true);
    try {
      const updateData = { name, email };
      if (newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      await updateUserProfile(updateData);
      setSuccessMessage('Profile details updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error("Profile update error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="main-content">
      <Sidebar />
      <div className="page-container">
        <div className="page-header">
          <div className="badge badge-primary" style={{ marginBottom: '12px' }}>
            <User size={14} style={{ marginRight: '6px' }} />
            Account Settings
          </div>
          <h1 className="page-title">User Profile & Security</h1>
          <p className="page-subtitle">
            Manage your personal profile details and security credentials.
          </p>
        </div>

        <ErrorMessage message={error} onClose={clearError} />
        {successMessage && <ErrorMessage message={successMessage} type="success" onClose={() => setSuccessMessage('')} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Profile Overview Card */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="user-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', margin: '0 auto 16px auto', boxShadow: 'var(--shadow-glow)' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{user?.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.email}</p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Calendar size={18} color="var(--primary)" />
                <span>Joined: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(user?.createdAt)}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <ShieldCheck size={18} color="var(--success)" />
                <span>Status: <strong style={{ color: 'var(--success)' }}>Verified Active Session</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Sparkles size={18} color="#c084fc" />
                <span>AI Access: <strong style={{ color: '#c084fc' }}>Gemini 2.5 Flash Enabled</strong></span>
              </div>
            </div>
          </div>

          {/* Profile Edit Form Card */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>
              Edit Account Information
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ paddingLeft: '40px' }}
                  />
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft: '40px' }}
                  />
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div style={{ margin: '24px 0 16px 0', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Change Password (Optional)
                </h4>

                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Required to set new password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    />
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    />
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '8px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Saving Changes...'
                ) : (
                  <>
                    <Save size={18} /> Save Profile Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
