import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Scan, Check, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ChildProfile } from '../../lib/types';
import { generateGameCode } from '../../lib/utils';
import { getSocket } from '../../lib/socket';

interface FriendDuelModalProps {
  profile: ChildProfile;
  onClose: () => void;
}

type DuelStep = 'setup' | 'qr-host' | 'scanning' | 'matched' | 'playing';
type Format = 'BO1' | 'BO3';

export default function FriendDuelModal({ profile, onClose }: FriendDuelModalProps) {
  const [step, setStep] = useState<DuelStep>('setup');
  const [format, setFormat] = useState<Format>('BO1');
  const [gameCode, setGameCode] = useState('');
  const [opponentPseudo, setOpponentPseudo] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 'qr-host') {
      const code = generateGameCode();
      setGameCode(code);
      const socket = getSocket();

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          socket.emit('create-lobby', {
            hostId: profile.id,
            hostPseudo: profile.pseudo,
            mode: 'duel',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            maxPlayers: 2,
            isPrivate: true,
          });
        });
      }

      socket.on('player-joined', ({ playerId, pseudo }) => {
        setOpponentPseudo(pseudo);
        setStep('matched');
      });

      return () => {
        socket.off('player-joined');
      };
    }
  }, [step, profile]);

  useEffect(() => {
    if (step === 'scanning') {
      const socket = getSocket();
      
      const handleJoined = (lobby: any) => {
        if (lobby && lobby.hostPseudo) {
          setOpponentPseudo(lobby.hostPseudo);
          setStep('matched');
        }
      };
      
      socket.on('lobby-state', handleJoined);

      let scanner: any = null;
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        if (!scannerRef.current) return;
        scanner = new Html5QrcodeScanner(
          'qr-scanner-div',
          { fps: 10, qrbox: { width: 240, height: 240 } },
          false
        );
        scanner.render(
          (decodedText: string) => {
            try {
              const data = JSON.parse(decodedText);
              if (data.code) {
                setGameCode(data.code);
                socket.emit('join-lobby', { lobbyId: data.code, playerId: profile.id, pseudo: profile.pseudo });
              }
            } catch (e) {
              setGameCode(decodedText);
              socket.emit('join-lobby', { lobbyId: decodedText, playerId: profile.id, pseudo: profile.pseudo });
            }
          },
          () => { /* errors are normal */ }
        );
      }).catch(() => {
        // Fallback for demo if no scanner
      });
      return () => { 
        socket.off('lobby-state', handleJoined);
        if (scanner) {
          try { scanner.clear(); } catch(e) {}
        }
      };
    }
  }, [step, profile.id, profile.pseudo]);

  const qrPayload = JSON.stringify({ code: gameCode, host: profile.pseudo, format });

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--lumios-blue)/0.12)' }}>
              <QrCode className="w-5 h-5" style={{ color: 'hsl(var(--lumios-blue))' }} />
            </div>
            <h3 className="font-nunito font-black text-lg">Défi entre Amis</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ── SETUP ─────────────────────────────────────────────────────── */}
          {step === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <p className="text-muted-foreground text-sm mb-5">Affrontez un ami en personne, physiquement côte à côte.</p>

              {/* Format choice */}
              <div className="mb-5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Format</label>
                <div className="flex gap-3">
                  {(['BO1', 'BO3'] as Format[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-3 rounded-xl border-2 font-nunito font-bold text-sm transition-all ${format === f ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                    >
                      {f}
                      <span className="text-xs font-medium text-muted-foreground block">
                        {f === 'BO1' ? 'Best of 1' : 'Best of 3'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button className="btn-primary w-full py-3.5" onClick={() => setStep('qr-host')}>
                  <QrCode className="w-5 h-5" /> Afficher mon QR Code
                </button>
                <button className="btn-glass w-full py-3.5" onClick={() => setStep('scanning')}>
                  <Scan className="w-5 h-5" /> Scanner le QR de l'adversaire
                </button>
              </div>
            </motion.div>
          )}

          {/* ── QR HOST ───────────────────────────────────────────────────── */}
          {step === 'qr-host' && (
            <motion.div key="qr-host" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">Montrez ce QR code à votre adversaire pour rejoindre</p>

              <div className="p-5 bg-white rounded-3xl shadow-card-hover border border-border animate-pulse-glow">
                <QRCodeSVG
                  value={qrPayload}
                  size={200}
                  fgColor="hsl(217, 85%, 30%)"
                  level="M"
                />
              </div>

              <div className="text-center">
                <p className="text-3xl font-black font-nunito tracking-widest" style={{ color: 'hsl(var(--primary))' }}>{gameCode}</p>
                <p className="text-xs text-muted-foreground">Code de la partie</p>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">En attente de l'adversaire…</span>
              </div>
            </motion.div>
          )}

          {/* ── SCANNING ──────────────────────────────────────────────────── */}
          {step === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-muted-foreground mb-4 text-center">Pointez la caméra vers le QR code de votre adversaire</p>
              <div ref={scannerRef} id="qr-scanner-div" className="w-full rounded-2xl overflow-hidden min-h-[240px] bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Scan className="w-10 h-10 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm">Caméra en cours…</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── MATCHED ───────────────────────────────────────────────────── */}
          {step === 'matched' && (
            <motion.div key="matched" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-4">
              <motion.div className="w-16 h-16 gradient-lumios rounded-2xl flex items-center justify-center animate-bounce-in">
                <Check className="w-8 h-8 text-white" />
              </motion.div>
              <div className="text-center">
                <h4 className="font-nunito font-black text-xl">Adversaire trouvé !</h4>
                <p className="text-muted-foreground mt-1">
                  <span className="font-bold" style={{ color: 'hsl(var(--primary))' }}>{opponentPseudo}</span> rejoint la partie
                </p>
              </div>

              <div className="flex items-center gap-6 p-4 bg-muted rounded-2xl w-full">
                <div className="flex-1 text-center">
                  <p className="text-2xl">{profile.avatarEmoji}</p>
                  <p className="font-nunito font-bold text-sm mt-1">{profile.pseudo}</p>
                  <p className="text-xs text-muted-foreground">{profile.elo} ELO</p>
                </div>
                <div className="text-xl font-black text-muted-foreground font-nunito">VS</div>
                <div className="flex-1 text-center">
                  <p className="text-2xl">🐉</p>
                  <p className="font-nunito font-bold text-sm mt-1">{opponentPseudo}</p>
                  <p className="text-xs text-muted-foreground">850 ELO</p>
                </div>
              </div>

              <div className="text-center">
                <span className="badge-lumios badge-blue text-sm px-3 py-1">{format}</span>
              </div>

              <button className="btn-primary w-full py-4" onClick={onClose}>
                🎮 Lancer la partie !
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
