const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class AuthService {
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

    // Get current user
    async getCurrentUser() {
        return this.makeRequest('/api/auth/me');
    }

    // Logout
    async logout() {
        return this.makeRequest('/api/auth/logout', { method: 'POST' });
    }

    // Refresh token
    async refreshToken() {
        return this.makeRequest('/api/auth/refresh', { method: 'POST' });
    }

    // Update preferences
    async updatePreferences(preferences) {
        return this.makeRequest('/api/auth/preferences', {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
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
const authService = new AuthService();
export { authService };
export default authService; 