import axios from 'axios';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:10100').replace(/\/$/, '');
const TOKEN_KEY = 'shoppulse_token';

// Browser storage can be blocked (private windows, strict settings), so every access is guarded.
export function getToken() {
  try { return window.localStorage.getItem(TOKEN_KEY); } catch (_) { return null; }
}
export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch (_) { /* ignore */ }
}

const http = axios.create({ baseURL: `${API_URL}/api`, timeout: 60000 });

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // A 401 on a signed-in call means the session ended. Login calls are excluded so wrong passwords show their own message.
    const url = (err.config && err.config.url) || '';
    if (err.response && err.response.status === 401 && getToken() && !url.startsWith('/auth/login')) onUnauthorized();
    return Promise.reject(err);
  }
);

/** Turns any failure into one plain sentence for the UI. */
export function errorMessage(err) {
  if (err && err.response && err.response.data && err.response.data.error) return err.response.data.error;
  if (err && err.code === 'ECONNABORTED') return 'That took too long. Please try again.';
  if (err && err.message === 'Network Error') return 'Could not reach the server. Check your internet connection and try again.';
  return 'Something went wrong. Please try again.';
}

export const api = {
  // auth
  sendOtp: (email) => http.post('/auth/send-otp', { email }).then((r) => r.data),
  register: (body) => http.post('/auth/register', body).then((r) => r.data),
  login: (email, password) => http.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => http.get('/auth/me').then((r) => r.data),
  forgotPassword: (email) => http.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token, password) => http.post('/auth/reset-password', { token, password }).then((r) => r.data),
  changePassword: (oldPassword, newPassword) => http.post('/auth/change-password', { oldPassword, newPassword }).then((r) => r.data),
  updateSettings: (body) => http.patch('/auth/settings', body).then((r) => r.data),
  deleteAccount: (password) => http.delete('/auth/account', { data: { password } }).then((r) => r.data),
  // data
  dataStatus: () => http.get('/data/status').then((r) => r.data),
  uploadCsv: (type, file) => {
    const form = new FormData();
    form.append('file', file);
    return http.post(`/data/upload/${type}`, form).then((r) => r.data);
  },
  loadSample: () => http.post('/data/sample').then((r) => r.data),
  deleteData: () => http.delete('/data').then((r) => r.data),
  templateUrl: (type) => `${API_URL}/api/data/template/${type}`,
  // analytics
  overview: (range) => http.get('/analytics/overview', { params: { range } }).then((r) => r.data),
  report: () => http.get('/analytics/report').then((r) => r.data),
  emailReport: () => http.post('/analytics/report/email').then((r) => r.data),
  ask: (question) => http.post('/analytics/ask', { question }).then((r) => r.data),
  history: () => http.get('/analytics/history').then((r) => r.data),
  // billing
  plans: () => http.get('/billing/plans').then((r) => r.data),
  credits: () => http.get('/billing/credits').then((r) => r.data),
  createOrder: (plan) => http.post('/billing/create-order', { plan }).then((r) => r.data),
  verifyPayment: (body) => http.post('/billing/verify', body).then((r) => r.data),
  paymentHistory: () => http.get('/billing/history').then((r) => r.data),
};
