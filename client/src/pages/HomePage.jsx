import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Cpu, History, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-container" style={{ padding: '40px 20px' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 64px auto' }}>
        <div className="badge badge-primary" style={{ marginBottom: '16px' }}>
          <Sparkles size={14} style={{ marginRight: '6px' }} />
          MERN Stack + Google Gemini API Integration
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '20px' }}>
          Next-Gen AI Assistant for <span className="gradient-text">Tech Interviews & Coding</span>
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
          Empower your career with real-time AI technical interview coaching, code analysis, system design explanations, and persistent conversation history.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            <Link to="/ai-assistant" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
              Launch AI Workspace <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
                Get Started Free <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
                Sign In to Account
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ marginBottom: '64px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 700, marginBottom: '40px' }}>
          Built with Modern Production Architecture
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '28px' }}>
            <div className="stat-icon" style={{ marginBottom: '20px' }}>
              <Cpu size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px' }}>Google Gemini AI</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
              Direct backend integration with Google's latest Gemini Flash model for ultra-fast, intelligent interview guidance.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '28px' }}>
            <div className="stat-icon" style={{ marginBottom: '20px' }}>
              <Shield size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px' }}>Secure JWT & Bcrypt</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
              State-of-the-art authentication with bcrypt password hashing and token persistence.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '28px' }}>
            <div className="stat-icon" style={{ marginBottom: '20px' }}>
              <History size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px' }}>Persistent MongoDB History</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
              Every prompt and response is indexed in MongoDB with user scoping and management tools.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack Preview */}
      <section className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '20px' }}>
          Complete Full-Stack MERN Architecture
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} color="var(--success)" /> React.js + Vite</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} color="var(--success)" /> Express.js + Node.js</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} color="var(--success)" /> MongoDB + Mongoose</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} color="var(--success)" /> Gemini 2.5 API</span>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
