const API_BASE_URL = 'http://localhost:3000';

export const interviewService = {
  uploadResume: async (formData) => {
    const response = await fetch(`${API_BASE_URL}/api/interview/upload-resume`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return response.json();
  },

  startInterview: async (sessionId, interviewType) => {
    const response = await fetch(`${API_BASE_URL}/api/interview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        interviewType
      })
    });
    
    if (!response.ok) {
      throw new Error(`Start interview failed: ${response.status}`);
    }
    
    return response.json();
  },

  getNextQuestion: async (sessionId, transcript, toneMatrix, round, code = null) => {
    const response = await fetch(`${API_BASE_URL}/api/interview/next-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        transcript,
        toneMatrix,
        round,
        code // Add code parameter
      })
    });
    
    if (!response.ok) {
      throw new Error(`Get next question failed: ${response.status}`);
    }
    
    return response.json();
  },

  uploadAudio: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'response.wav');

    const response = await fetch(`${API_BASE_URL}/api/interview/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Audio upload failed: ${response.status}`);
    }
    
    return response.json();
  },

  getSummary: async (sessionId) => {
    const response = await fetch(`${API_BASE_URL}/api/interview/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Get summary failed: ${response.status}`);
    }
    
    return response.json();
  },

  // DSA-specific endpoints
  getDSAProblems: async (sessionId) => {
    const response = await fetch(`${API_BASE_URL}/api/interview/dsa-problems?sessionId=${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Get DSA problems failed: ${response.status}`);
    }
    
    return response.json();
  },

  getCurrentProblem: async (sessionId) => {
    const response = await fetch(`${API_BASE_URL}/api/interview/current-problem?sessionId=${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Get current problem failed: ${response.status}`);
    }
    
    return response.json();
  },

  submitCode: async (sessionId, code, language = 'javascript') => {
    const response = await fetch(`${API_BASE_URL}/api/interview/submit-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        code,
        language
      })
    });
    
    if (!response.ok) {
      throw new Error(`Submit code failed: ${response.status}`);
    }
    
    return response.json();
  }
}; 