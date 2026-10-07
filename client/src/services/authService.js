import API from './api';

export const registerUser = async (name, email, password) => {
  const response = await API.post('/auth/register', { name, email, password });
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await API.post('/auth/login', { email, password });
  return response.data;
};

export const getMe = async () => {
  const response = await API.get('/auth/me');
  return response.data;
};

// Ends the current session only (revokes this device's refresh token and
// clears the auth cookies).
export const logoutUser = async () => {
  const response = await API.post('/auth/logout');
  return response.data;
};

// Ends every session for this account across all devices — use for a
// "log out everywhere" / "this wasn't me" security action.
export const logoutAllSessions = async () => {
  const response = await API.post('/auth/logout-all');
  return response.data;
};

export const requestPasswordReset = async (email) => {
  const response = await API.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await API.put(`/auth/reset-password/${token}`, { password });
  return response.data;
};
