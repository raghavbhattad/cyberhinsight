import axios from 'axios';
const api = axios.create({ baseURL: '/api', timeout: 60000 });

export const healthCheck = () => api.get('/health');
export const investigateIncident = (description, useMemory = true) => 
  api.post('/incidents/investigate', { description, use_memory: useMemory });
export const getIncidentHistory = () => api.get('/incidents/history');
export const getIncidentStats = () => api.get('/incidents/stats');
export const getIncidentById = (id) => api.get(`/incidents/${id}`);
export const searchMemory = (query) => api.post('/memory/search', { query });
export const getMemoryStats = () => api.get('/memory/stats');
export const reflectMemory = (query) => api.post('/memory/reflect', { query });
export const seedDemoIncidents = (count = 5) => api.post(`/incidents/seed?count=${count}`);
export const resetIncidentHistory = () => api.post('/incidents/reset');
export default api;

