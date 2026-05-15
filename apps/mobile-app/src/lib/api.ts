// src/lib/api.ts

// Ganti dengan IP WiFi Anda jika menggunakan HP Fisik (misal: http://192.168.1.15:4000)
// Gunakan http://10.0.2.2:4000 jika menggunakan Android Emulator
export const API_BASE_URL = 'http://10.0.2.2:4000';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('logshield_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};