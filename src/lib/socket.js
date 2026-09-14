// ════════════════════════════════════════════════════════════
//  Socket.io client with auth + auto-reconnect
// ════════════════════════════════════════════════════════════
import { io } from 'socket.io-client';

function getCleanSocketUrl() {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    try {
      const parsed = new URL(envUrl.startsWith('http') ? envUrl : `https://${envUrl}`);
      return parsed.origin;
    } catch {
      // Fall through if parsing fails
    }
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:4000';
}

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
  socket = io(getCleanSocketUrl(), {
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
