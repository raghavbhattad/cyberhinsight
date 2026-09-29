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

// Chat Endpoints
export const sendChat = (message, conversationId = null, useMemory = true) =>
  api.post('/chat', { message, conversation_id: conversationId, use_memory: useMemory });

export const listConversations = () => api.get('/chat');
export const getConversation = (id) => api.get(`/chat/${id}`);
export const deleteConversation = (id) => api.delete(`/chat/${id}`);

export const streamChat = async (message, conversationId = null, useMemory = true, callbacks = {}) => {
  const { onStatus, onToken, onFinal, onError } = callbacks;
  const apiKey = import.meta.env.VITE_API_KEY;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        use_memory: useMemory,
      }),
    });

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.detail || errorMsg;
      } catch (e) {
        const errTxt = await response.text();
        if (errTxt) errorMsg = errTxt;
      }
      throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop(); // keep trailing incomplete block

      for (const part of parts) {
        if (!part.trim()) continue;
        const lines = part.split('\n');
        let eventType = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.slice(5).trim();
          }
        }

        if (dataStr) {
          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'status' && onStatus) onStatus(data.status);
            else if (eventType === 'token' && onToken) onToken(data.token);
            else if (eventType === 'final' && onFinal) onFinal(data);
            else if (eventType === 'error' && onError) onError(new Error(data.message || 'Stream processing error'));
          } catch (pe) {
            console.error('Failed to parse SSE payload:', pe, dataStr);
          }
        }
      }
    }
  } catch (err) {
    if (onError) onError(err);
    else throw err;
  }
};

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
export const getMemoryIndexingStatus = (docId) => api.get(`/memory/status/${docId}`);

// SIEM ingestion
export const ingestAlert = (alert) => api.post('/ingest/alert', alert);

// Demo & Learning Curve
export const startNewDemoSession = () => api.post('/demo/new-session');
export const runLearningSequence = (numIncidents = 6) =>
  api.post('/demo/run-sequence', { num_incidents: numIncidents });
export const getSequenceResults = (sessionId) =>
  api.get(`/demo/sequence-results${sessionId ? `?session_id=${sessionId}` : ''}`);

export default api;
