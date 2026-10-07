import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders nothing when content is empty', () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders markdown headings and lists as real HTML elements', () => {
    render(<MarkdownRenderer content={'## Heading\n\n- one\n- two'} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });

  it('renders inline code with the md-inline-code class', () => {
    render(<MarkdownRenderer content={'Use `npm install` to set up.'} />);
    const codeEl = screen.getByText('npm install');
    expect(codeEl.tagName).toBe('CODE');
    expect(codeEl).toHaveClass('md-inline-code');
  });

  it('opens links in a new tab safely', () => {
    render(<MarkdownRenderer content={'[docs](https://example.com)'} />);
    const link = screen.getByRole('link', { name: 'docs' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
