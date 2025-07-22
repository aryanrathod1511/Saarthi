// Session management utilities
const SESSION_KEY = 'interviewSessionId';

export const sessionManager = {
  // Get session ID from localStorage
  getSessionId: () => {
    return localStorage.getItem(SESSION_KEY);
  },

  // Set session ID in localStorage
  setSessionId: (sessionId) => {
    if (sessionId) {
      localStorage.setItem(SESSION_KEY, sessionId);
    }
  },

  // Clear session ID from localStorage
  clearSessionId: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  // Check if session exists
  hasSession: () => {
    return !!localStorage.getItem(SESSION_KEY);
  },

  // Get session data with validation
  getValidSessionId: () => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      throw new Error('No session found. Please upload resume first.');
    }
    return sessionId;
  }
}; 