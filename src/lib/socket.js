// ════════════════════════════════════════════════════════════
//  Socket.io client with auth + auto-reconnect
// ════════════════════════════════════════════════════════════
import { io } from 'socket.io-client';

function getSocketUrl() {
  const configuredUrl = String(import.meta.env.VITE_SOCKET_URL || '').trim();
  const fallbackUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (!configuredUrl) return fallbackUrl;

  let url = configuredUrl;
  let protocol = null;
  let protocolMatch;

  while ((protocolMatch = url.match(/^(https?)(?::?\/\/)/i))) {
    protocol ??= protocolMatch[1].toLowerCase();
    url = url.slice(protocolMatch[0].length);
  }

  return protocol ? `${protocol}://${url}` : configuredUrl;
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
  socket = io(getSocketUrl(), {
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
