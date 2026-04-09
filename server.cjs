// ─── Lumios Play — Serveur Node.js ────────────────────────────────────────────
// Cloudflare Tunnel "lumios-play-server" expose ce serveur (port 3001) sur internet

require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

// ─── Supabase Client (Serveur) ────────────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// ─── Socket.IO avec CORS ouvert (Tunnel Cloudflare) ───────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',               // Accepte les connexions depuis l'URL Cloudflare
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── CORS headers pour l'API REST ─────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Production: servir le build Vite depuis le dossier dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.use('/assets', express.static(path.join(distPath, 'assets')));
app.use(express.json());

// ─── State en mémoire ─────────────────────────────────────────────────────────
const duels = {};     // { [code]: lobby }
const arenas = {};    // { [code]: lobby }
const socketMap = {}; // socket.id -> { type: 'duel'|'arena', code }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/** Haversine distance en km */
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

/** Arènes actives à proximité */
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

/** Health-check endpoint (utile pour Cloudflare zero-trust) */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    lobbies: {
      duels: Object.keys(duels).length,
      arenas: Object.keys(arenas).length,
    },
  });
});

// SPA fallback — doit être APRES les routes API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[CONNECT] ${socket.id}`);

  // ── CREATE LOBBY (Duel or Arena) ───────────────────────────────────────────
  socket.on('create-lobby', (data) => {
    // #14 — Utiliser le code proposé par le client (pour affichage QR instantané) ou en générer un
    const code = data.lobbyId || generateCode();
    const lobby = {
      id: code,
      hostId: socket.id,
      hostProfileId: data.hostProfileId, // Supabase Profile ID
      hostPseudo: data.hostPseudo,
      hostElo: data.hostElo || 800,
      mode: data.mode, // 'duel' or 'arena'
      lat: data.lat,
      lng: data.lng,
      maxPlayers: data.maxPlayers || (data.mode === 'duel' ? 2 : 10),
      isPrivate: !!data.isPrivate,
      status: 'open',
      players: { [socket.id]: { pseudo: data.hostPseudo, profileId: data.hostProfileId, elo: data.hostElo || 800, avatarEmoji: data.hostAvatarEmoji || '🎮' } },
      votes: {}, // Pour stocker les déclarations de vainqueur
      createdAt: Date.now(),
    };

    if (data.mode === 'arena') {
      arenas[code] = lobby;
    } else {
      duels[code] = lobby;
    }

    socket.join(`lobby-${code}`);
    socketMap[socket.id] = { type: data.mode, code };

    console.log(`[LOBBY:CREATE] Code=${code} Mode=${data.mode} Host=${data.hostPseudo}`);
    socket.emit('lobby-created', code);
  });

  // ── COMPETITION REGISTRATION ───────────────────────────────────────────────
  socket.on('create-comp-lobby', (code) => {
    socket.join(`comp-${code}`);
    console.log(`[COMP-LOBBY:CREATE] Code=${code}`);
  });

  socket.on('join-comp-lobby', (data) => {
    const { compId, profileInfo } = data;
    io.to(`comp-${compId}`).emit('comp-player-joined', profileInfo);
    socket.emit('comp-join-success');
    console.log(`[COMP-LOBBY:JOIN] Code=${compId} Player=${profileInfo?.pseudo}`);
  });

  // ── FIND LOBBIES (Nearby) ──────────────────────────────────────────────────
  socket.on('find-lobbies', (data) => {
    const { lat, lng, radius = 50 } = data;
    const allLobbies = [...Object.values(arenas), ...Object.values(duels)];

    const nearby = allLobbies
      .filter(l => l.status === 'open' && !l.isPrivate)
      .map(l => ({
        ...l,
        distance: getDistanceKm(lat, lng, l.lat, l.lng)
      }))
      .filter(l => l.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    socket.emit('lobbies-list', nearby);
  });

  // ── JOIN LOBBY BY CODE ─────────────────────────────────────────────────────
  socket.on('join-lobby', (data) => {
    const { lobbyId, pseudo } = data;
    const lobby = arenas[lobbyId] || duels[lobbyId];

    if (!lobby) {
      socket.emit('error', 'Lobby introuvable');
      return;
    }

    if (Object.keys(lobby.players).length >= lobby.maxPlayers) {
      socket.emit('error', 'Lobby plein');
      return;
    }

    lobby.players[socket.id] = { pseudo, profileId: data.profileId, elo: data.elo || 800, avatarEmoji: data.avatarEmoji || '🎮' };
    socket.join(`lobby-${lobbyId}`);
    socketMap[socket.id] = { type: lobby.mode, code: lobbyId };

    // Notifier tout le lobby
    io.to(`lobby-${lobbyId}`).emit('player-joined', { 
      playerId: socket.id, 
      pseudo, 
      profileId: data.profileId, 
      elo: data.elo || 800,
      avatarEmoji: data.avatarEmoji || '🎮'
    });

    // Envoyer l'état complet au nouveau joueur
    socket.emit('lobby-state', lobby);

    console.log(`[LOBBY:JOIN] Code=${lobbyId} Player=${pseudo}`);
  });

  // ── SUBMIT SCORE (double validation — les deux joueurs doivent voter le même vainqueur) ─
  socket.on('submit-score', async (data) => {
    const { lobbyId, voterId, winnerId } = data;
    const lobby = duels[lobbyId];
    if (!lobby) { socket.emit('error', 'Lobby introuvable'); return; }

    // Stocker le vote de ce joueur
    lobby.votes[voterId] = { winnerId, data };

    const voteEntries = Object.entries(lobby.votes);
    console.log(`[VOTE] Lobby=${lobbyId} Player=${voterId} Winner=${winnerId} (${voteEntries.length}/2 votes)`);

    if (voteEntries.length >= 2) {
      const [, vote1] = voteEntries[0];
      const [, vote2] = voteEntries[1];

      if (vote1.winnerId === vote2.winnerId && vote1.data.scoreDetail === vote2.data.scoreDetail) {
        // ✅ Consensus — on utilise les données du premier vote (hôte en priorité)
        const masterVote = lobby.votes[lobby.hostProfileId]?.data || vote1.data;

        lobby.status = 'ended';

        if (supabase) {
          try {
            // 1. Enregistrer le match
            await supabase.from('matches').insert([{
              player1_id: masterVote.p1Id,
              player2_id: masterVote.p2Id,
              winner_id: masterVote.winnerId,
              score: masterVote.score,
              score_detail: masterVote.scoreDetail,
              match_mode: masterVote.matchMode,
              match_type: 'duel',
              step_change_p1: masterVote.stepChangeP1,
              step_change_p2: masterVote.stepChangeP2,
              comment_winner: masterVote.commentWinner,
              comment_loser: masterVote.commentLoser,
              media_url: masterVote.mediaUrl,
              validated_by_loser: true,
            }]);

            // 2. Mettre à jour le profil P1 (hôte)
            if (masterVote.matchMode === 'competitive') {
              await supabase.from('profiles').update({
                rank_tier: masterVote.newTierP1,
                rank_step: masterVote.newRankStepP1,
              }).eq('id', masterVote.p1Id);

              // 3. Mettre à jour le profil P2 (scanner)
              await supabase.from('profiles').update({
                rank_tier: masterVote.newTierP2,
                rank_step: masterVote.newRankStepP2,
              }).eq('id', masterVote.p2Id);
            }

            console.log(`[DB:OK] Match enregistré Lobby=${lobbyId} Winner=${masterVote.winnerId}`);
          } catch (err) {
            console.error('[DB:ERROR]', err);
          }
        }

        // Notifier les deux joueurs
        io.to(`lobby-${lobbyId}`).emit('game-finished', {
          winnerId: masterVote.winnerId,
          stepChangeP1: masterVote.stepChangeP1,
          stepChangeP2: masterVote.stepChangeP2,
          xpP1: masterVote.xpP1,
          xpP2: masterVote.xpP2,
          bonuses: masterVote.bonuses || [],
        });

      } else {
        // ❌ Désaccord — on reset les votes et on demande de réessayer
        lobby.votes = {};
        console.log(`[MISMATCH] Lobby=${lobbyId} Vote1=${vote1.winnerId} Vote2=${vote2.winnerId}`);
        io.to(`lobby-${lobbyId}`).emit('result-mismatch', {
          message: 'Les scores ne correspondent pas. Vérifiez ensemble le résultat et re-saisissez.',
        });
      }
    }
    // Si seulement 1 vote, on attend le second silencieusement
  });

  // ── START GAME (host only) ─────────────────────────────────────────────────
  socket.on('start-game', (data) => {
    const { lobbyId } = data;
    const lobby = arenas[lobbyId] || duels[lobbyId];
    if (!lobby || lobby.hostId !== socket.id) return;

    lobby.status = 'playing';
    io.to(`lobby-${lobbyId}`).emit('game-started', { lobbyId, players: lobby.players });
    console.log(`[LOBBY:START] Code=${lobbyId}`);
  });

  // ── DECLARE WINNER & RECORD MATCH ──────────────────────────────────────────
  socket.on('declare-winner', async (data) => {
    const { lobbyId, winnerId, p1Id, p2Id, p1Elo, p2Elo, changeP1, changeP2 } = data;
    const lobby = arenas[lobbyId] || duels[lobbyId];
    if (!lobby) return;

    if (supabase) {
      try {
        // 1. Enregistrer le match
        await supabase.from('matches').insert([{
          player1_id: p1Id,
          player2_id: p2Id,
          winner_id: winnerId,
          elo_change_p1: changeP1,
          elo_change_p2: changeP2,
          type: lobby.mode === 'arena' ? 'arena' : 'ranked',
          format: 'BO1',
          code: lobbyId
        }]);

        // 2. Auto-Friend: Ajouter réciproquement en amis
        await supabase.from('friends').upsert([
          { profile_id: p1Id, friend_id: p2Id, status: 'accepted' },
          { profile_id: p2Id, friend_id: p1Id, status: 'accepted' }
        ], { onConflict: 'profile_id,friend_id' });

        // 3. Mettre à jour les profils (ELO)
        await supabase.from('profiles').update({ elo: p1Elo + changeP1 }).eq('id', p1Id);
        await supabase.from('profiles').update({ elo: p2Elo + changeP2 }).eq('id', p2Id);
        
        console.log(`[DB:UPDATE] Match enregistré pour Code=${lobbyId}`);
      } catch (err) {
        console.error('[DB:ERROR]', err);
      }
    }

    lobby.status = 'ended';
    io.to(`lobby-${lobbyId}`).emit('game-finished', { 
      winnerId, 
      changes: { [p1Id]: changeP1, [p2Id]: changeP2 } 
    });
  });

  // ── DISCONNECT ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const info = socketMap[socket.id];
    if (info) {
      const collection = info.type === 'arena' ? arenas : duels;
      const lobby = collection[info.code];
      if (lobby) {
        delete lobby.players[socket.id];
        if (Object.keys(lobby.players).length === 0) {
          delete collection[info.code];
          console.log(`[LOBBY:EMPTY] Code=${info.code} supprimé`);
        } else {
          // Si l'hôte part, le lobby est annulé
          if (lobby.hostId === socket.id) {
            lobby.status = 'ended';
            io.to(`lobby-${info.code}`).emit('lobby-closed', 'L\'hôte a quitté la partie');
          } else {
            io.to(`lobby-${info.code}`).emit('lobby-state', lobby);
          }
        }
      }
    }
    delete socketMap[socket.id];
    console.log(`[DISCONNECT] ${socket.id}`);
  });
});

// ─── Cleanup stale lobbies every 30min ────────────────────────────────────────
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  let cleaned = 0;
  Object.entries(duels).forEach(([code, d]) => {
    if (d.createdAt < cutoff) { delete duels[code]; cleaned++; }
  });
  Object.entries(arenas).forEach(([code, a]) => {
    if (a.createdAt < cutoff || a.status === 'ended') { delete arenas[code]; cleaned++; }
  });
  if (cleaned > 0) console.log(`[CLEANUP] ${cleaned} lobby(s) supprimé(s)`);
}, 5 * 60 * 1000);

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ⚡ LUMIOS PLAY — Serveur démarré');
  console.log(`  🌐 Local : http://127.0.0.1:${PORT}`);
  console.log(`  🔗 Tunnel : lumios-play-server (Connector: 2a0b9c52-7889-4e1d-ae13-ff2ddd882abf)`);
  console.log(`  📊 Health : http://localhost:${PORT}/api/health`);
  console.log('');
});
