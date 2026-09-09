import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import { createInterview, getInterviews, deleteInterview } from '../services/interviewService';
import { getScoreClassName } from '../utils/scoreUtils';
import {
  Sparkles,
  Mic,
  FileText,
  Briefcase,
  Target,
  ListChecks,
  Trash2,
  Eye,
  ClipboardList,
  Inbox,
} from 'lucide-react';

const INTERVIEW_TYPES = ['Technical', 'HR', 'Mixed'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [5, 10, 15];

const InterviewPrepPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('new');

  // Creation form state
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [interviewType, setInterviewType] = useState('Mixed');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Sessions list state
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await getInterviews();
      setSessions(data.interviews || []);
    } catch (err) {
      setSessionsError(err.response?.data?.message || 'Failed to load interview sessions.');
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!resumeText.trim() || !jobDescription.trim()) {
      setCreateError('Please provide both your resume text and the job description.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const data = await createInterview({
        resumeText: resumeText.trim(),
        jobDescription: jobDescription.trim(),
        targetRole: targetRole.trim(),
        interviewType,
        difficulty,
        questionCount,
      });
      navigate(`/interview/${data.interview._id}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to generate interview questions.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await deleteInterview(deleteTargetId);
      setSessions((prev) => prev.filter((s) => s._id !== deleteTargetId));
    } catch (err) {
      setSessionsError(err.response?.data?.message || 'Failed to delete this session.');
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusBadge = (status) => {
    if (status === 'completed') return <span className="badge badge-success">Completed</span>;
    if (status === 'in-progress') return <span className="badge badge-warning">In Progress</span>;
    return <span className="badge badge-neutral">Not Started</span>;
  };

  return (
    <div className="main-content">
      <Sidebar />
      <div className="page-container">
        <div className="page-header">
          <div className="badge badge-primary" style={{ marginBottom: '12px' }}>
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            Personalized with Gemini AI
          </div>
          <h1 className="page-title">Interview Preparation</h1>
          <p className="page-subtitle">
            Generate personalized interview questions from your resume and a target job description, then practice with an AI mock interviewer.
          </p>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>
            New Session
          </button>
          <button className={`tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
            My Sessions
          </button>
        </div>

        {activeTab === 'new' && (
          <form onSubmit={handleCreate} className="glass-card prompt-box" style={{ padding: '28px' }}>
            <ErrorMessage message={createError} onClose={() => setCreateError(null)} />

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="var(--primary)" />
                Your Resume (paste as text)
              </label>
              <textarea
                className="textarea-lg"
                placeholder="Paste your resume content here - skills, experience, projects, technologies used, etc."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={16} color="var(--primary)" />
                Target Job Description
              </label>
              <textarea
                className="textarea-lg"
                style={{ minHeight: '120px' }}
                placeholder="Paste the job description you're preparing for..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} color="var(--primary)" />
                Target Role (optional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Senior Backend Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Interview Type</label>
                <div className="option-pill-group">
                  {INTERVIEW_TYPES.map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={`option-pill ${interviewType === type ? 'active' : ''}`}
                      onClick={() => setInterviewType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Difficulty</label>
                <div className="option-pill-group">
                  {DIFFICULTIES.map((d) => (
                    <button
                      type="button"
                      key={d}
                      className={`option-pill ${difficulty === d ? 'active' : ''}`}
                      onClick={() => setDifficulty(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '18px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ListChecks size={16} color="var(--primary)" />
                Number of Questions
              </label>
              <div className="option-pill-group">
                {QUESTION_COUNTS.map((count) => (
                  <button
                    type="button"
                    key={count}
                    className={`option-pill ${questionCount === count ? 'active' : ''}`}
                    onClick={() => setQuestionCount(count)}
                  >
                    {count} Questions
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={creating} style={{ padding: '12px 28px' }}>
                {creating ? 'Generating with Gemini...' : (
                  <>
                    <Sparkles size={18} /> Generate Interview Questions
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'sessions' && (
          <div>
            <ErrorMessage message={sessionsError} onClose={() => setSessionsError(null)} />

            {sessionsLoading ? (
              <LoadingSpinner message="Loading your interview sessions..." />
            ) : sessions.length === 0 ? (
              <div className="glass-card empty-state">
                <div className="empty-state-icon">
                  <Inbox size={28} />
                </div>
                <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No interview sessions yet</h3>
                <p style={{ marginBottom: '20px' }}>Create your first personalized interview prep session to get started.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('new')} style={{ margin: '0 auto' }}>
                  <Sparkles size={16} /> Create Session
                </button>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session._id} className="glass-card session-card">
                  <div className="session-card-main">
                    <div className="session-card-title">
                      {session.targetRole || `${session.interviewType} Interview`}
                    </div>
                    <div className="session-card-meta">
                      {statusBadge(session.status)}
                      <span className="badge badge-neutral">{session.interviewType}</span>
                      <span className="badge badge-neutral">{session.difficulty}</span>
                      <span className="badge badge-neutral">{session.questionCount} Questions</span>
                      {session.status === 'completed' && session.finalReport?.overallScore !== undefined && (
                        <span
                          className={`score-number ${getScoreClassName(session.finalReport.overallScore)}`}
                          style={{ fontSize: '1rem', fontWeight: 700 }}
                        >
                          {session.finalReport.overallScore}%
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Created {formatDate(session.createdAt)}
                    </div>
                  </div>

                  <div className="session-card-actions">
                    <button className="btn btn-secondary" onClick={() => navigate(`/interview/${session._id}`)}>
                      <Eye size={16} /> View
                    </button>
                    {session.status === 'completed' ? (
                      <button className="btn btn-secondary" onClick={() => navigate(`/interview/${session._id}/report`)}>
                        <ClipboardList size={16} /> Report
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => navigate(`/interview/${session._id}/mock`)}>
                        <Mic size={16} /> {session.status === 'in-progress' ? 'Continue' : 'Start Mock'}
                      </button>
                    )}
                    <button className="btn btn-danger" onClick={() => setDeleteTargetId(session._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Interview Session"
        message="This will permanently delete this interview session, including all questions, answers, and feedback. This action cannot be undone."
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
        isDanger
      />
    </div>
  );
};

export default InterviewPrepPage;
