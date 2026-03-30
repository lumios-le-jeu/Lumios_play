// ─── Lumios Play — Serveur Node.js ────────────────────────────────────────────
// Inspiré de QRGAME/qrshot-node/server.js (même architecture Express + Socket.IO)
// Cloudflare Tunnel expose ce serveur (port 3000) sur internet

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const path = require('path');
const QRCode = require('qrcode');

// ─── Static Files ──────────────────────────────────────────────────────────────
// Production: servir le build Vite
app.use(express.static(path.join(__dirname, 'public/client')));
app.use(express.json());

// ─── State en mémoire ─────────────────────────────────────────────────────────
const duels = {};     // { [code]: { host, guest, format, status, lat, lng } }
const arenas = {};    // { [code]: { name, creator, players, level, lat, lng, status } }
const socketMap = {}; // socket.id -> { type: 'duel'|'arena', code }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Haversine distance in km — même algo que QRGAME */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── REST API ──────────────────────────────────────────────────────────────────

/** Générer un QR code PNG encodé en base64 */
app.get('/api/qr/:data', async (req, res) => {
  try {
    const data = decodeURIComponent(req.params.data);
    const dataUrl = await QRCode.toDataURL(data, {
      width: 300,
      color: { dark: '#1e3a8a', light: '#ffffff' },
    });
    res.json({ qr: dataUrl });
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

/** Arènes à proximité (pour la section PlayScreen) */
app.get('/api/arenas', (req, res) => {
  const { lat, lng, radius = 20.0 } = req.query;
  const nearby = Object.values(arenas)
    .filter(a => a.status !== 'ended')
    .map(a => ({
      ...a,
      distance: getDistanceKm(Number(lat), Number(lng), a.lat, a.lng),
    }))
    .filter(a => a.distance < Number(radius))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);
  res.json(nearby);
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/client', 'index.html'));
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[CONNECT] ${socket.id}`);

  // ── DUEL: Créer ─────────────────────────────────────────────────────────────
  socket.on('duel:create', (data, callback) => {
    const code = data.code || generateCode();
    duels[code] = {
      code,
      hostId: socket.id,
      hostPseudo: data.pseudo,
      guestId: null,
      guestPseudo: null,
      format: data.format || 'BO1',
      lat: data.lat,
      lng: data.lng,
      status: 'waiting',
      createdAt: Date.now(),
    };
    socket.join(`duel-${code}`);
    socketMap[socket.id] = { type: 'duel', code };
    console.log(`[DUEL:CREATE] Code=${code} Host=${data.pseudo} Format=${data.format}`);
    callback({ success: true, code });
  });

  // ── DUEL: Rejoindre (scan du QR) ────────────────────────────────────────────
  socket.on('duel:join', (data, callback) => {
    const duel = duels[data.code];
    if (!duel) { callback({ error: 'Partie introuvable' }); return; }
    if (duel.status !== 'waiting') { callback({ error: 'Partie déjà commencée' }); return; }

    // Vérification de proximité (500m max, comme QRGAME)
    if (duel.lat && duel.lng && data.lat && data.lng) {
      const dist = getDistanceKm(duel.lat, duel.lng, data.lat, data.lng);
      if (dist > 0.5) {
        callback({ error: `Trop loin ! (${Math.round(dist * 1000)}m > 500m)` });
        return;
      }
    }

    duel.guestId = socket.id;
    duel.guestPseudo = data.pseudo;
    duel.status = 'active';
    socket.join(`duel-${data.code}`);
    socketMap[socket.id] = { type: 'duel', code: data.code };

    io.to(`duel-${data.code}`).emit('duel:matched', {
      host: { id: duel.hostId, pseudo: duel.hostPseudo },
      guest: { id: duel.guestId, pseudo: duel.guestPseudo },
      format: duel.format,
    });

    console.log(`[DUEL:JOIN] Code=${data.code} Guest=${data.pseudo}`);
    callback({ success: true, duel });
  });

  // ── DUEL: Score ─────────────────────────────────────────────────────────────
  socket.on('duel:score', (data) => {
    const info = socketMap[socket.id];
    if (!info || info.type !== 'duel') return;
    const duel = duels[info.code];
    if (!duel) return;
    io.to(`duel-${info.code}`).emit('duel:score', data);
    console.log(`[DUEL:SCORE] Code=${info.code} Winner=${data.winner}`);
  });

  // ── ARENA: Créer ─────────────────────────────────────────────────────────────
  socket.on('arena:create', (data, callback) => {
    const code = generateCode();
    arenas[code] = {
      id: code,
      name: data.name,
      creatorId: socket.id,
      creatorPseudo: data.pseudo,
      lat: data.lat,
      lng: data.lng,
      level: data.level || 'Tout niveau',
      type: data.type || 'Match libre',
      players: [{ id: socket.id, pseudo: data.pseudo }],
      status: 'open',
      createdAt: Date.now(),
    };
    socket.join(`arena-${code}`);
    socketMap[socket.id] = { type: 'arena', code };
    console.log(`[ARENA:CREATE] Code=${code} Name=${data.name}`);
    callback({ success: true, code });
  });

  // ── ARENA: Rejoindre ─────────────────────────────────────────────────────────
  socket.on('arena:join', (data, callback) => {
    const arena = arenas[data.code];
    if (!arena) { callback({ error: 'Arène introuvable' }); return; }
    if (arena.status === 'ended') { callback({ error: 'Arène terminée' }); return; }

    // Vérification de proximité (1km max pour arènes)
    if (arena.lat && arena.lng && data.lat && data.lng) {
      const dist = getDistanceKm(arena.lat, arena.lng, data.lat, data.lng);
      if (dist > 1.0) {
        callback({ error: `Trop loin de l'arène ! (${Math.round(dist * 1000)}m > 1km)` });
        return;
      }
    }

    arena.players.push({ id: socket.id, pseudo: data.pseudo });
    socket.join(`arena-${data.code}`);
    socketMap[socket.id] = { type: 'arena', code: data.code };
    io.to(`arena-${data.code}`).emit('arena:update', arena);
    console.log(`[ARENA:JOIN] Code=${data.code} Player=${data.pseudo}`);
    callback({ success: true, arena });
  });

  // ── ARENAS PROCHES ──────────────────────────────────────────────────────────
  socket.on('req:nearby_arenas', (coords) => {
    if (!coords?.lat || !coords?.lng) {
      socket.emit('res:nearby_arenas', []);
      return;
    }
    const nearby = Object.values(arenas)
      .filter(a => a.status !== 'ended')
      .map(a => ({
        name: a.name,
        code: a.id,
        distance: getDistanceKm(a.lat, a.lng, coords.lat, coords.lng),
        playerCount: a.players.length,
        status: a.status,
        level: a.level,
      }))
      .filter(a => a.distance < 20.0)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
    socket.emit('res:nearby_arenas', nearby);
  });

  // ── DISCONNECT ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const info = socketMap[socket.id];
    if (info?.type === 'arena') {
      const arena = arenas[info.code];
      if (arena) {
        arena.players = arena.players.filter(p => p.id !== socket.id);
        io.to(`arena-${info.code}`).emit('arena:update', arena);
        if (arena.players.length === 0) {
          arena.status = 'ended';
        }
      }
    }
    delete socketMap[socket.id];
    console.log(`[DISCONNECT] ${socket.id}`);
  });
});

// ─── Cleanup stale duels/arenas every 30min ────────────────────────────────────
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  Object.entries(duels).forEach(([code, d]) => {
    if (d.createdAt < cutoff) delete duels[code];
  });
  Object.entries(arenas).forEach(([code, a]) => {
    if (a.createdAt < cutoff || a.status === 'ended') delete arenas[code];
  });
}, 5 * 60 * 1000);

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('  ⚡ LUMIOS PLAY — Serveur démarré');
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log('');
  console.log('  🔗 Pour exposer via Cloudflare Tunnel :');
  console.log('     cloudflared tunnel run --token <VOTRE_TOKEN>');
  console.log('');
});
