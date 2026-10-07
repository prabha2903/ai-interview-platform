import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import VoiceInputButton from './VoiceInputButton';

afterEach(() => {
  cleanup();
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
});

describe('VoiceInputButton', () => {
  it('renders nothing when the browser has no SpeechRecognition support', () => {
    const { container } = render(<VoiceInputButton onTranscript={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a mic button when SpeechRecognition is available', () => {
    class FakeRecognition {
      start() {}
      stop() {}
    }
    window.SpeechRecognition = FakeRecognition;

    render(<VoiceInputButton onTranscript={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('starts listening when clicked', () => {
    const start = vi.fn();
    class FakeRecognition {
      start() {
        start();
      }
      stop() {}
    }
    window.SpeechRecognition = FakeRecognition;

    render(<VoiceInputButton onTranscript={() => {}} />);
    act(() => {
      screen.getByRole('button').click();
    });
    expect(start).toHaveBeenCalled();
  });
});
