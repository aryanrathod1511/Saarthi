import authService from './authService.js';

class InterviewService {
    constructor() {
        // Use relative URL since Vite proxy handles the routing
        this.baseURL = '';
    }

    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Upload resume
    async uploadResume(requestData) {
        const token = localStorage.getItem('token');
        const url = `${this.baseURL}/api/interview/upload-resume`;
        
        console.log('Uploading resume to:', url);
        console.log('Request data structure:', {
            hasResume: !!requestData.resume,
            hasCompanyInfo: !!requestData.companyInfo,
            interviewType: requestData.interviewType
        });
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                
                let errorData = {};
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: errorText };
                }
                
                throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Upload successful:', result);
            return result;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    // Upload audio
    async uploadAudio(blob) {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('audio', blob, 'audio.wav');
        
        const url = `${this.baseURL}/api/interview/process-audio`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to process audio');
        }

        return await response.json();
    }

    // Start interview
    async startInterview(sessionId) {
        return this.makeRequest('/api/interview/start-interview', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
        });
    }

    // Get next question
    async getNextQuestion(sessionId, transcript, toneMatrix, round, shouldMoveToNextProblem = false) {
        return this.makeRequest('/api/interview/next-question', {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                transcript,
                toneMatrix,
                round,
                shouldMoveToNextProblem
            })
        });
    }

    // Submit answer
    async submitAnswer(answerData) {
        return this.makeRequest('/api/interview/submit-answer', {
            method: 'POST',
            body: JSON.stringify(answerData)
        });
    }

    // Submit code
    async submitCode(sessionId, code, language = 'java') {
        return this.makeRequest('/api/interview/submit-code', {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                code,
                language
            })
        });
    }

    // Evaluate code
    async evaluateCode(codeData) {
        return this.makeRequest('/api/interview/evaluate-code', {
            method: 'POST',
            body: JSON.stringify(codeData)
        });
    }

    // End interview
    async endInterview(interviewId) {
        return this.makeRequest('/api/interview/end-interview', {
            method: 'POST',
            body: JSON.stringify({ interviewId })
        });
    }

    // Get final feedback
    async getSummary(sessionId) {
        return this.makeRequest('/api/interview/get-final-feedback', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
        });
    }

    // Terminate session
    async terminateSession(sessionId) {
        return this.makeRequest('/api/interview/terminate-session', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
        });
    }

    // Get DSA problems
    async getDSAProblems(sessionId) {
        return this.makeRequest(`/api/interview/dsa-problems?sessionId=${sessionId}`);
    }

    // Get current problem
    async getCurrentProblem(sessionId) {
        return this.makeRequest(`/api/interview/current-problem?sessionId=${sessionId}`);
    }

    // Get interview history
    async getInterviewHistory() {
        return this.makeRequest('/api/interview/history');
    }

    // Get specific interview
    async getInterview(interviewId) {
        return this.makeRequest(`/api/interview/${interviewId}`);
    }

    // Create new interview
    async createInterview(interviewData) {
        return this.makeRequest('/api/interview/create', {
            method: 'POST',
            body: JSON.stringify(interviewData)
        });
    }

    // Update interview status
    async updateInterviewStatus(interviewId, status) {
        return this.makeRequest(`/api/interview/${interviewId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    // Add question to interview
    async addQuestion(interviewId, questionData) {
        return this.makeRequest(`/api/interview/${interviewId}/questions`, {
            method: 'POST',
            body: JSON.stringify(questionData)
        });
    }
}

// Export both as default and named export for compatibility
const interviewService = new InterviewService();
export { interviewService };
export default interviewService; 