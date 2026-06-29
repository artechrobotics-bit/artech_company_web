// Dùng chính domain/IP đang mở frontend.
// Máy chủ mở localhost thì API đi localhost:5173/api.
// Máy khác mở 192.168.1.93:5173 thì API đi 192.168.1.93:5173/api.
// server.js sẽ proxy /api và /uploads sang backend port 3000.
window.ARTECH_API_BASE = window.location.origin;
window.ARTECH_API_BASE_URL = window.location.origin;
