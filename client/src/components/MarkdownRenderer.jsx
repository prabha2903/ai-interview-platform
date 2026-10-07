import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renders AI-generated Markdown (headings, lists, tables, bold/italic, and
// fenced code blocks) with the platform's existing dark-glass visual style.
// Used anywhere raw Gemini output was previously dumped as plain text.
const MarkdownRenderer = ({ content, className = '' }) => {
  if (!content) return null;

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            // Fenced code blocks: react-markdown wraps these in <pre><code>.
            // We only need to style the <pre>; the inner <code> gets its
            // language className (if any) via the code() renderer below.
            return <pre className="md-code-block">{children}</pre>;
          },
          code({ className, children, ...props }) {
            // react-markdown v9 no longer passes an `inline` flag. Fenced
            // code blocks carry a `language-xxx` className from remark;
            // plain inline `code` spans do not, so that's what we key off.
            const isFencedBlock = Boolean(className);
            return (
              <code className={isFencedBlock ? className : 'md-inline-code'} {...props}>
                {children}
              </code>
            );
          },
          a({ children, ...props }) {
            return (
              <a target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
