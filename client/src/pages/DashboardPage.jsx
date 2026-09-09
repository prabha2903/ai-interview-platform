import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHistory } from '../services/historyService';
import { getInterviewStats } from '../services/interviewService';
import { getScoreClassName } from '../utils/scoreUtils';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { 
  Sparkles, 
  Bot, 
  History, 
  Clock, 
  ArrowRight, 
  MessageSquare,
  ShieldCheck,
  Mic,
  Trophy,
  Target
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalCount: 0, recentHistory: [] });
  const [interviewStats, setInterviewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await getHistory({ limit: 5 });
        setStats({
          totalCount: data.totalCount || 0,
          recentHistory: data.history || [],
        });
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Failed to fetch recent history activities.");
      } finally {
        setLoading(false);
      }
    };

    const fetchInterviewStats = async () => {
      try {
        const data = await getInterviewStats();
        setInterviewStats(data.stats);
      } catch (err) {
        console.error("Interview stats error:", err);
      }
    };

    fetchDashboardData();
    fetchInterviewStats();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
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
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            Personal Dashboard
          </div>
          <h1 className="page-title">
            Welcome back, <span className="gradient-text">{user?.name || 'Developer'}</span> 👋
          </h1>
          <p className="page-subtitle">
            Here is an overview of your Gemini AI technical assistant activities.
          </p>
        </div>

        <ErrorMessage message={error} onClose={() => setError(null)} />

        {/* Stats Grid */}
        <div className="dashboard-grid">
          <div className="glass-card stat-card">
            <div className="stat-icon">
              <MessageSquare size={24} />
            </div>
            <div>
              <div className="stat-value">{loading ? '...' : stats.totalCount}</div>
              <div className="stat-label">AI Interactions Saved</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="stat-value">Active</div>
              <div className="stat-label">JWT Authentication</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-value">{formatDate(user?.createdAt)}</div>
              <div className="stat-label">Member Since</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Mic size={24} />
            </div>
            <div>
              <div className="stat-value">{interviewStats ? interviewStats.totalInterviews : '...'}</div>
              <div className="stat-label">Interview Sessions</div>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Trophy size={24} />
            </div>
            <div>
              <div className="stat-value">
                {interviewStats && interviewStats.completedInterviews > 0 ? `${interviewStats.averageScore}%` : '—'}
              </div>
              <div className="stat-label">Average Interview Score</div>
            </div>
          </div>
        </div>

        {/* Quick Launch Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          <div className="glass-card" style={{ padding: '28px', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Bot size={24} color="#818cf8" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>AI Assistant Workspace</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '20px' }}>
              Ask coding questions, practice technical interview scenarios, or get code reviews.
            </p>
            <Link to="/ai-assistant" className="btn btn-primary">
              Launch Assistant <ArrowRight size={16} />
            </Link>
          </div>

          <div className="glass-card" style={{ padding: '28px', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <History size={24} color="#c084fc" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Prompt History</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '20px' }}>
              Review, filter, or delete previous AI interactions saved securely in MongoDB.
            </p>
            <Link to="/history" className="btn btn-secondary">
              View All History <ArrowRight size={16} />
            </Link>
          </div>

          <div className="glass-card" style={{ padding: '28px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Mic size={24} color="#fbbf24" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Interview Preparation</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '20px' }}>
              Generate personalized questions from your resume and job description, then practice with an AI mock interviewer.
            </p>
            <Link to="/interview-prep" className="btn btn-primary">
              Prepare for Interview <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Interview Snapshot */}
        {interviewStats && interviewStats.totalInterviews > 0 && (
          <div className="glass-card" style={{ padding: '28px', marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Target size={20} color="var(--primary)" />
                Interview Prep Snapshot
              </h3>
              <Link to="/interview-prep" style={{ fontSize: '0.875rem', color: '#818cf8', fontWeight: 600 }}>
                View All →
              </Link>
            </div>

            {interviewStats.latestInterview ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Most Recent Session</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {interviewStats.latestInterview.targetRole || interviewStats.latestInterview.interviewType}
                  </div>
                </div>
                <div className={`score-number ${getScoreClassName(interviewStats.latestScore || 0)}`} style={{ fontSize: '1.75rem' }}>
                  {interviewStats.latestScore}%
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>Complete a mock interview to see your latest score here.</p>
            )}

            {interviewStats.weakTopics?.length > 0 && (
              <div style={{ marginTop: '18px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                  Weak Topics to Review
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {interviewStats.weakTopics.map((topic, i) => (
                    <span key={i} className="badge badge-danger">{topic}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent AI Activities */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} color="var(--primary)" />
              Recent AI Conversations
            </h3>
            <Link to="/history" style={{ fontSize: '0.875rem', color: '#818cf8', fontWeight: 600 }}>
              View All →
            </Link>
          </div>

          {loading ? (
            <LoadingSpinner message="Fetching history..." />
          ) : stats.recentHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
              <Bot size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <p>No AI interactions saved yet.</p>
              <Link to="/ai-assistant" className="btn btn-primary" style={{ marginTop: '16px' }}>
                Start Your First Conversation
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.recentHistory.map((item) => (
                <div key={item._id} style={{
                  padding: '16px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge badge-primary">{item.category}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.prompt}
                    </p>
                  </div>
                  <Link to="/history" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
