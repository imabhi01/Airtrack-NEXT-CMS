import api from './api';
import Cookies from 'js-cookie';

export async function loginAdmin(email: string, password: string) {
  const res = await api.post('/auth/login/admin', { email, password });
  Cookies.set('airtrack_token', res.data.token, { expires: 1 });
  return res.data.user;
}

export function logout() {
  Cookies.remove('airtrack_token');
  if (typeof window !== 'undefined') window.location.href = '/login';
}

export function getToken(): string | undefined {
  return Cookies.get('airtrack_token');
}

export function isAuthenticated(): boolean {
  return !!Cookies.get('airtrack_token');
}




