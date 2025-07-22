export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const typeWriter = (text, setDisplayedQuestion, speed = 50, onComplete = null) => {
  if (!text) return;
  
  setDisplayedQuestion('');
  let i = 0;
  function type() {
    if (i < text.length) {
      setDisplayedQuestion(prev => prev + text.charAt(i));
      i++;
      setTimeout(type, speed);
    } else {
      // Call the callback when typing is complete
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
    }
  }
  type();
};

export const speakText = (text, setIsPlaying) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.volume = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    return utterance;
  }
  return null;
}; 