import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, CheckCircle2 } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import type { ChildProfile } from '../../lib/types';

interface JoinCompModalProps {
  profile: ChildProfile;
  onClose: () => void;
}

type Step = 'scanning' | 'success';

export default function JoinCompModal({ profile, onClose }: JoinCompModalProps) {
  const [step, setStep] = useState<Step>('scanning');
  const [joinCode, setJoinCode] = useState('');

  // S'abonner à l'événement de réussite si le serveur l'envoie (facultatif car on peut le forcer en side-effect)
  useEffect(() => {
    const socket = getSocket();
    const onSuccess = () => setStep('success');
    socket.on('comp-join-success', onSuccess);
    return () => {
      socket.off('comp-join-success', onSuccess);
    };
  }, []);

  useEffect(() => {
    if (step !== 'scanning') return;
    let html5QrCode: any = null;
    const socket = getSocket();

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const element = document.getElementById('comp-qr-scanner');
        if (!element) return;
        html5QrCode = new Html5Qrcode('comp-qr-scanner');

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            html5QrCode.stop().then(() => {
              let parsed: any = {};
              try {
                parsed = JSON.parse(decodedText);
              } catch (e) {
                // Si le format JSON est invalide, on remet le scanner
                html5QrCode.start({ facingMode: 'environment' }, { fps: 15, qrbox: { width: 250, height: 250 } }, startScanner as any, () => {});
                return;
              }

              if (parsed && parsed.type === 'comp-join' && parsed.code) {
                setJoinCode(parsed.code);
                socket.emit('join-comp-lobby', {
                  compId: parsed.code,
                  profileInfo: {
                    id: profile.id,
                    pseudo: profile.pseudo,
                    elo: profile.elo,
                    avatarEmoji: profile.avatarEmoji,
                    rankTier: profile.rankTier,
                    rankStep: profile.rankStep
                  }
                });
                // Le serveur répondra par 'comp-join-success' qui changera l'état
              } else {
                // Mauvais code
                alert("Ce code QR n'est pas un code de compétition valide.");
                onClose();
              }
            }).catch(() => {});
          }
        );
      } catch (err: any) {
        if (err?.toString().includes("NotAllowedError")) {
          alert('Accès à la caméra refusé. Vérifiez vos permissions.');
          onClose();
        }
      }
    };

    const timer = setTimeout(startScanner, 400);
    return () => {
      clearTimeout(timer);
      if (html5QrCode?.isScanning) html5QrCode.stop().catch(() => {});
    };
  }, [step, profile, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-card rounded-3xl shadow-xl overflow-hidden border border-border"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-nunito font-black text-lg">Rejoindre le tournoi</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center min-h-[300px] justify-center">
          <AnimatePresence mode="wait">
            {step === 'scanning' && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <QrCode className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-nunito font-bold text-center mb-2">Scannez le code du créateur</h4>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Placez le QR Code de la compétition dans le cadre.
                </p>

                <div className="relative w-full aspect-square max-w-[250px] mx-auto rounded-3xl overflow-hidden bg-black shadow-inner border-[6px] border-card">
                  <div id="comp-qr-scanner" className="w-full h-full" />
                  <div className="absolute inset-0 border-2 border-primary/50 pointer-events-none rounded-2xl m-2" />
                  
                  {/* Effet de balayage */}
                  <motion.div
                    animate={{ y: ['0%', '100%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute top-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary-color)/0.8)] z-10 pointer-events-none opacity-60"
                  />
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </motion.div>
                
                <h3 className="font-nunito font-black text-2xl mb-2">Inscription validée !</h3>
                <p className="text-muted-foreground mb-6">
                  Vous avez rejoint la compétition <strong>{joinCode}</strong>.<br />
                  <span className="text-xs">Regardez l'écran du créateur pour suivre le tournoi.</span>
                </p>
                
                <button onClick={onClose} className="btn-primary w-full py-3.5">
                  Terminer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
