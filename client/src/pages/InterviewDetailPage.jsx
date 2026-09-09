import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { getInterview } from '../services/interviewService';
import { getDifficultyBadgeClass, getScoreClassName } from '../utils/scoreUtils';
import {
  ChevronLeft,
  Mic,
  ClipboardList,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react';

const InterviewDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});

  useEffect(() => {
    const fetchInterview = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getInterview(id);
        setInterview(data.interview);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load this interview session.');
      } finally {
        setLoading(false);
      }
    };
    fetchInterview();
  }, [id]);

  const toggleExpand = (questionId) => {
    setExpandedIds((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  if (loading) {
    return (
      <div className="main-content">
        <Sidebar />
        <div className="page-container">
          <LoadingSpinner message="Loading interview session..." fullScreen />
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="main-content">
        <Sidebar />
        <div className="page-container">
          <ErrorMessage message={error || 'Interview not found.'} />
          <Link to="/interview-prep" className="btn btn-secondary" style={{ marginTop: '12px' }}>
            <ChevronLeft size={16} /> Back to Interview Prep
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Sidebar />
      <div className="page-container">
        <Link to="/interview-prep" className="btn btn-secondary" style={{ marginBottom: '20px', width: 'fit-content' }}>
          <ChevronLeft size={16} /> All Sessions
        </Link>

        <div className="page-header">
          <div className="badge badge-primary" style={{ marginBottom: '12px' }}>
            <Target size={14} style={{ marginRight: '6px' }} />
            {interview.interviewType} · {interview.difficulty}
          </div>
          <h1 className="page-title">
            {interview.targetRole || 'Interview Preparation'}
          </h1>
          <p className="page-subtitle">
            {interview.questions.length} personalized questions generated from your resume and the target job description.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {interview.status === 'completed' ? (
            <button className="btn btn-primary" onClick={() => navigate(`/interview/${id}/report`)}>
              <ClipboardList size={18} /> View Final Report
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate(`/interview/${id}/mock`)}>
              <Mic size={18} /> {interview.status === 'in-progress' ? 'Continue Mock Interview' : 'Start Mock Interview'}
            </button>
          )}
        </div>

        {interview.questions.map((q, idx) => (
          <div key={q.questionId} className="glass-card question-card">
            <div className="question-card-header">
              <div className="question-card-badges">
                <span className="badge badge-primary">Q{idx + 1}</span>
                <span className="badge badge-neutral">{q.category}</span>
                <span className={`badge ${getDifficultyBadgeClass(q.difficulty)}`}>{q.difficulty}</span>
              </div>
              {q.userAnswer && q.evaluation && (
                <span className={`score-number ${getScoreClassName(q.evaluation.score)}`} style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  {q.evaluation.score}%
                </span>
              )}
            </div>

            <div className="question-text">{q.questionText}</div>

            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              onClick={() => toggleExpand(q.questionId)}
            >
              <Lightbulb size={14} />
              {expandedIds[q.questionId] ? 'Hide' : 'Show'} Suggested Answer & Key Points
              {expandedIds[q.questionId] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expandedIds[q.questionId] && (
              <div>
                <div className="suggested-answer-box">{q.suggestedAnswer}</div>
                {q.keyPoints?.length > 0 && (
                  <ul className="key-points-list">
                    {q.keyPoints.map((point, i) => (
                      <li key={i}>
                        <CheckCircle2 size={14} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterviewDetailPage;
