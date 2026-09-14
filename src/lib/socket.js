// ════════════════════════════════════════════════════════════
//  Socket.io client with auth + auto-reconnect
// ════════════════════════════════════════════════════════════
import { io } from 'socket.io-client';

const BACKEND_URL = 'https://skillnova-5g99.onrender.com';
const socketUrl = (import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL.trim() !== '')
  ? import.meta.env.VITE_SOCKET_URL
  : BACKEND_URL;

let socket = null;
let activeToken = null;

export function connectSocket(token) {
  if (socket) {
    if (token && token !== activeToken) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
      activeToken = null;
    } else {
      return socket;
    }
  }

  activeToken = token ?? null;
  socket = io(socketUrl, {
    autoConnect: true,
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.info('[socket] connected', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.warn('[socket] disconnected:', reason);
  });
  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    activeToken = null;
  }
}

export function getSocket() {
  return socket;
}

export default { connectSocket, disconnectSocket, getSocket };
