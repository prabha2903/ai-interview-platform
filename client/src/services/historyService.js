import API from './api';

export const getHistory = async (params = {}) => {
  const response = await API.get('/history', { params });
  return response.data;
};

export const deleteHistoryItem = async (id) => {
  const response = await API.delete(`/history/${id}`);
  return response.data;
};

export const clearHistory = async () => {
  const response = await API.delete('/history');
  return response.data;
};
