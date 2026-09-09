import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ErrorMessage from '../components/ErrorMessage';
import { generateAIResponse } from '../services/aiService';
import { 
  Bot, 
  Send, 
  RotateCcw, 
  Copy, 
  Check, 
  Sparkles, 
  Code, 
  HelpCircle, 
  Briefcase, 
  Layers 
} from 'lucide-react';

const CATEGORIES = [
  { label: 'Interview Prep', icon: <HelpCircle size={14} /> },
  { label: 'Code Review', icon: <Code size={14} /> },
  { label: 'Technical Q&A', icon: <Sparkles size={14} /> },
  { label: 'Career Advice', icon: <Briefcase size={14} /> },
  { label: 'System Design', icon: <Layers size={14} /> },
];

const PROMPT_SUGGESTIONS = [
  "Explain the difference between SQL and NoSQL databases for a Senior Backend Interview.",
  "Review this code snippet for performance and memory leaks: const arr = new Array(10000);",
  "How do I optimize React component rendering using useMemo and useCallback?",
  "Design a high-availability URL shortener system like Bitly."
];

const AIAssistantPage = () => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Interview Prep');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResponse('');

    try {
      const data = await generateAIResponse(prompt, category);
      setResponse(data.response);
    } catch (err) {
      console.error("AI Generation Error:", err);
      const msg = err.response?.data?.message || err.message || 'Failed to generate AI response. Check backend connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPrompt('');
    setResponse('');
    setError(null);
  };

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="main-content">
      <Sidebar />
      <div className="page-container">
        <div className="page-header">
          <div className="badge badge-primary" style={{ marginBottom: '12px' }}>
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            Google Gemini 2.5 Flash Workspace
          </div>
          <h1 className="page-title">AI Technical Assistant</h1>
          <p className="page-subtitle">
            Get instant expert guidance for code reviews, technical interview prep, and system architecture.
          </p>
        </div>

        <ErrorMessage message={error} onClose={() => setError(null)} />

        <div className="ai-workspace">
          {/* Prompt Input Box */}
          <div className="glass-card prompt-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bot size={18} color="var(--primary)" />
                Select Scenario Category
              </span>
              {prompt && (
                <button 
                  onClick={handleClear} 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  <RotateCcw size={14} /> Clear
                </button>
              )}
            </div>

            {/* Category Chips */}
            <div className="category-chips">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setCategory(cat.label)}
                  className={`chip ${category === cat.label ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            <textarea
              className="prompt-textarea"
              placeholder="Ask any technical question, code review request, or system design problem..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />

            {/* Prompt Suggestions */}
            {!prompt && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
                  Suggested Questions:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PROMPT_SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPrompt(sug)}
                      style={{
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        textAlign: 'left'
                      }}
                    >
                      💡 {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="btn btn-primary"
                style={{ padding: '12px 24px' }}
              >
                {loading ? (
                  'Generating with Gemini...'
                ) : (
                  <>
                    <Send size={18} /> Generate Response
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Response Area */}
          {(loading || response) && (
            <div className="glass-card response-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="navbar-brand-icon" style={{ width: '28px', height: '28px' }}>
                    <Sparkles size={16} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Gemini Response</h3>
                  <span className="badge badge-primary">{category}</span>
                </div>

                {response && (
                  <button onClick={handleCopy} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
                  <p>Consulting Google Gemini AI engine...</p>
                </div>
              ) : (
                <div className="response-content">
                  {response}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;
