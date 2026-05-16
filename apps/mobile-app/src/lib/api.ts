export const API_BASE_URL = 'http://10.0.2.2:4000';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('logshield_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};