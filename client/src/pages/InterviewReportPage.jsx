import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { getInterview } from '../services/interviewService';
import { getScoreClassName, getScoreColor, getDifficultyBadgeClass } from '../utils/scoreUtils';
import {
  ChevronLeft,
  Trophy,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Target,
  CheckCircle2,
  AlertCircle,
  ListTodo,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const ScoreCard = ({ label, value }) => (
  <div className="glass-card report-score-card">
    <div className={`score-number ${getScoreClassName(value)}`} style={{ fontSize: '2rem' }}>{value}</div>
    <div className="score-label" style={{ marginBottom: '10px' }}>{label}</div>
    <div className="mini-score-bar-track">
      <div className="mini-score-bar-fill" style={{ width: `${value}%`, background: getScoreColor(value) }} />
    </div>
  </div>
);

const InfoList = ({ icon: Icon, title, items, iconColor }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="glass-card" style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '14px' }}>
        <Icon size={18} color={iconColor} />
        {title}
      </div>
      <ul className="feedback-list">
        {items.map((item, i) => (
          <li key={i}>
            <CheckCircle2 size={15} color={iconColor} style={{ marginTop: '2px', flexShrink: 0 }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const InterviewReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const fetchInterview = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getInterview(id);
        setInterview(data.interview);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load this interview report.');
      } finally {
        setLoading(false);
      }
    };
    fetchInterview();
  }, [id]);

  if (loading) {
    return (
      <div className="main-content">
        <Sidebar />
        <div className="page-container">
          <LoadingSpinner message="Loading your performance report..." fullScreen />
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

  if (interview.status !== 'completed' || !interview.finalReport) {
    return (
      <div className="main-content">
        <Sidebar />
        <div className="page-container">
          <ErrorMessage type="info" message="This interview hasn't been completed yet, so no report is available." />
          <button className="btn btn-primary" onClick={() => navigate(`/interview/${id}/mock`)} style={{ marginTop: '12px' }}>
            Resume Mock Interview
          </button>
        </div>
      </div>
    );
  }

  const report = interview.finalReport;

  return (
    <div className="main-content">
      <Sidebar />
      <div className="page-container">
        <Link to="/interview-prep" className="btn btn-secondary" style={{ marginBottom: '20px', width: 'fit-content' }}>
          <ChevronLeft size={16} /> All Sessions
        </Link>

        <div className="page-header">
          <div className="badge badge-primary" style={{ marginBottom: '12px' }}>
            <Trophy size={14} style={{ marginRight: '6px' }} />
            Final Performance Report
          </div>
          <h1 className="page-title">
            {interview.targetRole || `${interview.interviewType} Interview`}
          </h1>
          <p className="page-subtitle">
            {interview.interviewType} · {interview.difficulty} · {interview.questions.length} Questions
          </p>
        </div>

        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: '28px' }}>
          <div className="score-label" style={{ marginBottom: '6px' }}>Overall Score</div>
          <div className={`score-number ${getScoreClassName(report.overallScore)}`} style={{ fontSize: '3.5rem' }}>
            {report.overallScore}%
          </div>
        </div>

        <div className="report-score-grid">
          <ScoreCard label="Technical" value={report.technicalScore} />
          <ScoreCard label="Communication" value={report.communicationScore} />
          <ScoreCard label="Relevance" value={report.relevanceScore} />
          <ScoreCard label="Average Answer Score" value={report.averageScore} />
        </div>

        <div className="report-two-col">
          <InfoList icon={TrendingUp} iconColor="var(--success)" title="Strong Areas" items={report.strongAreas} />
          <InfoList icon={TrendingDown} iconColor="var(--danger)" title="Needs Improvement" items={report.weakAreas} />
        </div>

        <div className="report-two-col">
          <InfoList icon={CheckCircle2} iconColor="var(--success)" title="Questions Answered Well" items={report.wellAnsweredQuestions} />
          <InfoList icon={AlertCircle} iconColor="var(--warning)" title="Questions Requiring Improvement" items={report.needsImprovementQuestions} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <InfoList icon={BookOpen} iconColor="#818cf8" title="Missing Concepts to Study" items={report.missingConcepts} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <InfoList icon={Target} iconColor="#818cf8" title="Recommended Topics" items={report.recommendedTopics} />
        </div>

        {report.improvementPlan?.length > 0 && (
          <div className="glass-card" style={{ padding: '22px 24px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '14px' }}>
              <ListTodo size={18} color="#818cf8" />
              Personalized Improvement Plan
            </div>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {report.improvementPlan.map((step, i) => (
                <li key={i} style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        <button
          className="btn btn-secondary"
          onClick={() => setShowTranscript((prev) => !prev)}
          style={{ marginBottom: '16px' }}
        >
          {showTranscript ? 'Hide' : 'Show'} Full Question & Answer Review
          {showTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showTranscript && interview.questions.map((q, idx) => (
          <div key={q.questionId} className="glass-card question-card">
            <div className="question-card-header">
              <div className="question-card-badges">
                <span className="badge badge-primary">Q{idx + 1}</span>
                <span className="badge badge-neutral">{q.category}</span>
                <span className={`badge ${getDifficultyBadgeClass(q.difficulty)}`}>{q.difficulty}</span>
              </div>
              {q.evaluation && (
                <span className={`score-number ${getScoreClassName(q.evaluation.score)}`} style={{ fontSize: '1.1rem' }}>
                  {q.evaluation.score}%
                </span>
              )}
            </div>
            <div className="question-text">{q.questionText}</div>
            {q.userAnswer ? (
              <div className="suggested-answer-box" style={{ marginBottom: '10px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Your Answer: </strong>{q.userAnswer}
              </div>
            ) : (
              <div className="suggested-answer-box" style={{ color: 'var(--text-muted)' }}>Not answered</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterviewReportPage;
