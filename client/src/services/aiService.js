import API from './api';

export const generateAIResponse = async (prompt, category = 'General') => {
  const response = await API.post('/ai/generate', { prompt, category });
  return response.data;
};
