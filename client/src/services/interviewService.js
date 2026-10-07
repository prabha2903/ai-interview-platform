import API from './api';

export const createInterview = async (payload) => {
  const response = await API.post('/interviews', payload);
  return response.data;
};

export const parseResumeFile = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  const response = await API.post('/interviews/parse-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getInterviews = async () => {
  const response = await API.get('/interviews');
  return response.data;
};

export const getInterview = async (id) => {
  const response = await API.get(`/interviews/${id}`);
  return response.data;
};

export const submitInterviewAnswer = async (id, answer) => {
  const response = await API.post(`/interviews/${id}/answer`, { answer });
  return response.data;
};

export const completeInterview = async (id) => {
  const response = await API.post(`/interviews/${id}/complete`);
  return response.data;
};

export const deleteInterview = async (id) => {
  const response = await API.delete(`/interviews/${id}`);
  return response.data;
};

export const getInterviewStats = async () => {
  const response = await API.get('/interviews/stats');
  return response.data;
};
