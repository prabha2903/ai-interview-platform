import axios from 'axios';

// Auth now lives entirely in httpOnly cookies set by the server — the
// browser attaches them automatically on same-site requests as long as
// `withCredentials` is set, so there's no token to read/write in JS at all
// (which is the point: a cookie the page's own JS can't read can't be stolen
// by an XSS payload the way a localStorage token could).
const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tracks an in-flight refresh so concurrent 401s from multiple requests
// trigger only one refresh call, not one per request.
let refreshPromise = null;

const attemptRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = API.post('/auth/refresh')
      .catch((err) => {
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Response Interceptor: on a 401 (access token expired/missing), try once to
// silently refresh the session and replay the original request. If the
// refresh itself fails, the session really is over — let the 401 propagate
// so the UI can send the user to login.
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const isAuthEndpoint =
      config?.url?.includes('/auth/login') ||
      config?.url?.includes('/auth/register') ||
      config?.url?.includes('/auth/refresh');

    if (response?.status === 401 && config && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        await attemptRefresh();
        return API(config);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
