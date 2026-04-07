import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Retourne le socket Socket.io connecté au serveur Lumios Play.
 * - En développement (Vite proxy), se connecte à window.location.origin (proxié vers :3001).
 * - En production (via Cloudflare Tunnel), se connecte à window.location.origin
 *   car le HTML est servi par le même serveur Node.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connecté :', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Déconnecté :', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Erreur de connexion :', err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
