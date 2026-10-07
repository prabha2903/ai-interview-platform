import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import MarkdownRenderer from '../components/MarkdownRenderer';
import VoiceInputButton from '../components/VoiceInputButton';
import { getInterview, submitInterviewAnswer, completeInterview } from '../services/interviewService';
import { getDifficultyBadgeClass, getScoreClassName } from '../utils/scoreUtils';
import {
  ChevronLeft,
  Send,
  Bot,
  User,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Award,
  FlagOff,
  Loader2,
} from 'lucide-react';

// Rebuild the visual chat transcript from the authoritative interview document,
// so refreshing or resuming an in-progress interview looks correct.
const buildTranscript = (interview) => {
  const bubbles = [];
  interview.questions.forEach((q, idx) => {
    bubbles.push({ type: 'question', questionIndex: idx, category: q.category, difficulty: q.difficulty, text: q.questionText });
    if (q.userAnswer) {
      bubbles.push({ type: 'answer', text: q.userAnswer });
      bubbles.push({ type: 'feedback', evaluation: q.evaluation });
    }
    (q.followUps || []).forEach((f) => {
      bubbles.push({ type: 'followup', text: f.questionText });
      if (f.userAnswer) {
        bubbles.push({ type: 'answer', text: f.userAnswer });
        bubbles.push({ type: 'feedback', evaluation: f.evaluation, isFollowUp: true });
      }
    });
  });
  return bubbles;
};

const FeedbackCard = ({ evaluation, isFollowUp }) => {
  if (!evaluation) return null;
  return (
    <div className="glass-card feedback-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
          <Award size={18} color="var(--primary)" />
          {isFollowUp ? 'Follow-up Feedback' : 'AI Evaluation'}
        </div>
        <div className="score-display">
          <span className={`score-number ${getScoreClassName(evaluation.score)}`} style={{ fontSize: '1.5rem' }}>
            {evaluation.score}
          </span>
          <span className="score-label">/ 100</span>
        </div>
      </div>

      {evaluation.goodPoints?.length > 0 && (
        <>
          <div className="feedback-section-title">What went well</div>
          <ul className="feedback-list">
            {evaluation.goodPoints.map((p, i) => (
              <li key={i}><CheckCircle2 size={15} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />{p}</li>
            ))}
          </ul>
        </>
      )}

      {evaluation.missingPoints?.length > 0 && (
        <>
          <div className="feedback-section-title">What was missing</div>
          <ul className="feedback-list">
            {evaluation.missingPoints.map((p, i) => (
              <li key={i}><XCircle size={15} color="var(--danger)" style={{ marginTop: '2px', flexShrink: 0 }} />{p}</li>
            ))}
          </ul>
        </>
      )}

      {evaluation.improvements?.length > 0 && (
        <>
          <div className="feedback-section-title">How to improve</div>
          <ul className="feedback-list">
            {evaluation.improvements.map((p, i) => (
              <li key={i}><Lightbulb size={15} color="var(--warning)" style={{ marginTop: '2px', flexShrink: 0 }} />{p}</li>
            ))}
          </ul>
        </>
      )}

      {evaluation.sampleAnswer && (
        <>
          <div className="feedback-section-title">Sample Answer</div>
          <div className="suggested-answer-box">
            <MarkdownRenderer content={evaluation.sampleAnswer} />
          </div>
        </>
      )}
    </div>
  );
};

const MockInterviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const fetchInterview = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getInterview(id);
        if (data.interview.status === 'completed') {
          navigate(`/interview/${id}/report`);
          return;
        }
        setInterview(data.interview);
        setTranscript(buildTranscript(data.interview));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load this interview session.');
      } finally {
        setLoading(false);
      }
    };
    fetchInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const totalQuestions = interview?.questions.length || 0;
  const currentIndex = interview?.currentQuestionIndex ?? 0;
  const isDone = interview && currentIndex >= totalQuestions;
  const currentQuestion = interview && !isDone ? interview.questions[currentIndex] : null;
  const pendingFollowUp = currentQuestion?.followUps?.find((f) => !f.userAnswer);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || submitting) return;

    const submittedText = answer.trim();
    setSubmitting(true);
    setError(null);

    // Optimistically show the user's answer bubble
    setTranscript((prev) => [...prev, { type: 'answer', text: submittedText }]);
    setAnswer('');

    try {
      const data = await submitInterviewAnswer(id, submittedText);
      setInterview(data.interview);

      if (data.type === 'answerEvaluated') {
        setTranscript((prev) => [...prev, { type: 'feedback', evaluation: data.evaluation }]);
        if (data.awaitingFollowUp && data.followUpQuestion) {
          setTranscript((prev) => [...prev, { type: 'followup', text: data.followUpQuestion }]);
        } else if (!data.isLastQuestion) {
          const nextQ = data.interview.questions[data.nextQuestionIndex];
          setTranscript((prev) => [
            ...prev,
            { type: 'question', questionIndex: data.nextQuestionIndex, category: nextQ.category, difficulty: nextQ.difficulty, text: nextQ.questionText },
          ]);
        }
      } else if (data.type === 'followUpEvaluated') {
        setTranscript((prev) => [...prev, { type: 'feedback', evaluation: data.evaluation, isFollowUp: true }]);
        if (!data.isLastQuestion) {
          const nextQ = data.interview.questions[data.nextQuestionIndex];
          setTranscript((prev) => [
            ...prev,
            { type: 'question', questionIndex: data.nextQuestionIndex, category: nextQ.category, difficulty: nextQ.difficulty, text: nextQ.questionText },
          ]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit your answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError(null);
    try {
      await completeInterview(id);
      navigate(`/interview/${id}/report`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate your final report. Please try again.');
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <Sidebar />
        <div className="page-container">
          <LoadingSpinner message="Preparing your mock interview..." fullScreen />
        </div>
      </div>
    );
  }

  if (!interview) {
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

  const answeredCount = interview.questions.filter((q) => q.userAnswer).length;
  const progressPct = totalQuestions ? Math.round((Math.min(currentIndex, totalQuestions) / totalQuestions) * 100) : 0;

  return (
    <div className="main-content">
      <Sidebar />
      <div className="page-container" style={{ maxWidth: '820px' }}>
        <Link to={`/interview/${id}`} className="btn btn-secondary" style={{ marginBottom: '16px', width: 'fit-content' }}>
          <ChevronLeft size={16} /> Exit Mock Interview
        </Link>

        <div className="page-header">
          <h1 className="page-title">AI Mock Interview</h1>
          <p className="page-subtitle">
            {interview.targetRole || `${interview.interviewType} Interview`} · Question {Math.min(currentIndex + 1, totalQuestions)} of {totalQuestions}
          </p>
          <div className="progress-bar-track" style={{ marginTop: '14px' }}>
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <ErrorMessage message={error} onClose={() => setError(null)} />

        <div className="interview-chat">
          {transcript.map((item, idx) => {
            if (item.type === 'question' || item.type === 'followup') {
              return (
                <div key={idx} className="chat-bubble chat-bubble-ai">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: 700, fontSize: '0.8rem', color: '#818cf8' }}>
                    <Bot size={16} />
                    {item.type === 'followup' ? 'Follow-up Question' : `Interviewer${item.category ? ` · ${item.category}` : ''}`}
                    {item.difficulty && (
                      <span className={`badge ${getDifficultyBadgeClass(item.difficulty)}`} style={{ marginLeft: '4px' }}>{item.difficulty}</span>
                    )}
                  </div>
                  {item.text}
                </div>
              );
            }
            if (item.type === 'answer') {
              return (
                <div key={idx} className="chat-bubble chat-bubble-user">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <User size={16} /> You
                  </div>
                  {item.text}
                </div>
              );
            }
            if (item.type === 'feedback') {
              return <FeedbackCard key={idx} evaluation={item.evaluation} isFollowUp={item.isFollowUp} />;
            }
            return null;
          })}

          {submitting && (
            <div className="chat-bubble chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Loader2 size={16} className="spin-icon" style={{ animation: 'spin 0.8s linear infinite' }} />
              Evaluating your answer with Gemini...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {isDone ? (
          <div className="glass-card" style={{ padding: '28px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '10px' }}>
              You've answered {answeredCount} of {totalQuestions} questions
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Ready to see your full performance report with personalized recommendations?
            </p>
            <button className="btn btn-primary" onClick={handleComplete} disabled={completing} style={{ margin: '0 auto', padding: '12px 28px' }}>
              {completing ? 'Generating Report...' : (
                <>
                  <FlagOff size={18} /> Complete Interview & View Report
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <textarea
              className="textarea-lg"
              style={{ minHeight: '90px' }}
              placeholder={pendingFollowUp ? 'Type your answer to the follow-up question...' : 'Type your answer here...'}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submitting}
            />
            <VoiceInputButton
              disabled={submitting}
              onTranscript={(text) => setAnswer((prev) => (prev ? `${prev.trim()} ${text}` : text))}
            />
            <button type="submit" className="btn btn-primary" disabled={submitting || !answer.trim()} style={{ padding: '14px 20px', height: 'fit-content' }}>
              <Send size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default MockInterviewPage;
