import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

// Wraps the browser's SpeechRecognition API (Chrome/Edge support it as
// webkitSpeechRecognition; Firefox/Safari currently do not). Feature-detects
// on mount and simply doesn't render if unsupported, so the rest of the UI
// degrades gracefully to typing only.
const getSpeechRecognitionCtor = () =>
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const VoiceInputButton = ({ onTranscript, disabled = false }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    setIsSupported(Boolean(Ctor));
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // ignore — recognition may not have started
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isSupported) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // start() throws if already started; ignore
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? 'Stop voice input' : 'Answer by voice'}
        className="btn btn-secondary"
        style={{
          padding: '14px',
          height: 'fit-content',
          borderColor: isListening ? 'var(--danger)' : undefined,
          color: isListening ? 'var(--danger)' : undefined,
        }}
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
      {isListening && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Listening...
        </span>
      )}
      {interimText && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '120px', textAlign: 'center' }}>
          "{interimText}"
        </span>
      )}
    </div>
  );
};

export default VoiceInputButton;
