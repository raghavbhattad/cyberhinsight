import axios from 'axios';

const api = axios.create({ 
  baseURL: '/api', 
  timeout: 120000,
});

// Add API key header if configured
api.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  return config;
});

// Health & status
export const healthCheck = () => api.get('/health');

// Incidents
export const investigateIncident = (description, useMemory = true) =>
  api.post('/incidents/investigate', { description, use_memory: useMemory });
export const getIncidentHistory = () => api.get('/incidents/history');
export const getIncidentStats = () => api.get('/incidents/stats');
export const getIncidentById = (id) => api.get(`/incidents/${id}`);
export const seedDemoIncidents = (count = 5) => api.post(`/incidents/seed?count=${count}`);
export const resetIncidentHistory = () => api.post('/incidents/reset');

// Feedback (outcome learning)
export const submitFeedback = (incidentId, feedback) =>
  api.post(`/incidents/${incidentId}/feedback`, feedback);

// Memory
export const searchMemory = (query) => api.post('/memory/search', { query });
export const getMemoryStats = () => api.get('/memory/stats');
export const reflectMemory = (query) => api.post('/memory/reflect', { query });
export const getPlaybook = (category) => api.get(`/memory/playbook?category=${encodeURIComponent(category)}`);

// SIEM ingestion
export const ingestAlert = (alert) => api.post('/ingest/alert', alert);

// Demo & Learning Curve
export const startNewDemoSession = () => api.post('/demo/new-session');
export const runLearningSequence = (numIncidents = 6) =>
  api.post('/demo/run-sequence', { num_incidents: numIncidents });
export const getSequenceResults = (sessionId) =>
  api.get(`/demo/sequence-results${sessionId ? `?session_id=${sessionId}` : ''}`);

export default api;
