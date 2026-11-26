import { useCallback, useState } from 'react';
import { SPEECH_LOCALES } from '../i18n';

export function useVoiceSearch(language, onTranscript) {
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is unavailable in this browser.');
      return;
    }
    setError(null);
    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LOCALES[language] || 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (ev) => {
      setListening(false);
      setError(`Voice input failed (${ev.error || 'unknown'}). Please type your query.`);
    };
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      if (text && onTranscript) {
        onTranscript(text);
      }
    };

    try {
      recognition.start();
    } catch {
      setListening(false);
      setError('Unable to start microphone.');
    }
  }, [SpeechRecognition, language, onTranscript]);

  return {
    supported: Boolean(SpeechRecognition),
    listening,
    error,
    startListening,
  };
}
