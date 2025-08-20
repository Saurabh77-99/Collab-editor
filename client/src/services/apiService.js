import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class ApiService {
  // Authentication endpoints
  async register(userData) {
    return apiClient.post('/api/auth/register', userData);
  }

  async login(credentials) {
    return apiClient.post('/api/auth/login', credentials);
  }

  async logout() {
    return apiClient.post('/api/auth/logout');
  }

  async getCurrentUser() {
    return apiClient.get('/api/auth/me');
  }

  async refreshToken() {
    return apiClient.post('/api/auth/refresh');
  }

  // Document endpoints
  async getDocuments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/api/documents${queryString ? `?${queryString}` : ''}`);
  }

  async createDocument(documentData) {
    return apiClient.post('/api/documents', documentData);
  }

  async getDocument(documentId) {
    return apiClient.get(`/api/documents/${documentId}`);
  }

  async updateDocument(documentId, updateData) {
    return apiClient.put(`/api/documents/${documentId}`, updateData);
  }

  async deleteDocument(documentId) {
    return apiClient.delete(`/api/documents/${documentId}`);
  }

  async shareDocument(documentId, shareOptions) {
    return apiClient.post(`/api/documents/${documentId}/share`, shareOptions);
  }

  async addCollaborator(documentId, collaboratorData) {
    return apiClient.post(`/api/documents/${documentId}/collaborators`, collaboratorData);
  }

  async getSharedDocument(token) {
    return apiClient.get(`/api/documents/shared/${token}`);
  }

  // AI endpoints
  async checkGrammar(text) {
    return apiClient.post('/api/ai/grammar-check', { text });
  }

  async enhanceText(text, options = {}) {
    return apiClient.post('/api/ai/enhance', { text, options });
  }

  async summarizeText(text, options = {}) {
    return apiClient.post('/api/ai/summarize', { text, options });
  }

  async completeText(text, options = {}) {
    return apiClient.post('/api/ai/complete', { text, options });
  }

  async getSuggestions(text, options = {}) {
    return apiClient.post('/api/ai/suggestions', { text, options });
  }

  async getAIStatus() {
    return apiClient.get('/api/ai/status');
  }
}

export default new ApiService();