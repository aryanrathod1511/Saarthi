import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility function to merge Tailwind classes
export const cn = (...inputs) => {
  return twMerge(clsx(inputs));
};

// Other utility functions can be added here
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const typeWriter = (text, setDisplayedQuestion, speed = 50, onComplete = null) => {
  if (!text) return;
  
  let i = 0;
  function type() {
    if (i < text.length) {
      setDisplayedQuestion(prev => prev + text.charAt(i));
      i++;
      setTimeout(type, speed);
    } else {
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
    }
  }
  type();
};

export const speakText = (text, setIsPlaying = null) => {
  if (!text || !('speechSynthesis' in window)) {
    return null;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.volume = 1;
    
    utterance.onstart = () => {
      if (setIsPlaying) setIsPlaying(true);
    };
    
    utterance.onend = () => {
      if (setIsPlaying) setIsPlaying(false);
    };
    
    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (error) {
    console.error('Speech synthesis error:', error);
    return null;
  }
}; 