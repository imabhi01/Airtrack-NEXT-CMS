import axios from 'axios';
import Cookies from 'js-cookie';
 
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000,
});
 
api.interceptors.request.use((config) => {
  const token = Cookies.get('airtrack_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
 
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('airtrack_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
 
export default api;
 