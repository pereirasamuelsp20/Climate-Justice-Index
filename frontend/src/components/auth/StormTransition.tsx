import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../store/useUserStore';

interface StormTransitionProps {
  onComplete: () => void;
}

export default function StormTransition({ onComplete }: StormTransitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [phase, setPhase] = useState<'playing' | 'fading'>('playing');
  const [showText, setShowText] = useState(false);
  const session = useUserStore((state) => state.session);
  const userName = session?.user?.user_metadata?.name || 'Champion';

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Start video
    video.play().catch(() => { });

    // Start calming ocean audio with smooth fade-in
    const startAudio = () => {
      if (!audio) return;
      // On mobile, load the audio source now (preload was "none")
      if (isMobile && audio.preload === 'none') {
        audio.preload = 'auto';
        audio.load();
      }
      audio.volume = 0;
      audio.play().then(() => {
        // Smooth fade-in to target volume
        let vol = 0;
        const targetVol = isMobile ? 0.2 : 0.35;
        const fadeIn = setInterval(() => {
          vol = Math.min(vol + 0.015, targetVol);
          if (audio) audio.volume = vol;
          if (vol >= targetVol) clearInterval(fadeIn);
        }, 100);
      }).catch(() => { });
    };

    // On desktop, start audio immediately; on mobile, wait for gesture
    if (!isMobile) {
      startAudio();
    }

    // User gesture listener for mobile audio unlock
    const handleInteraction = () => {
      startAudio();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction, { passive: true });

    // Show text after 1.5s
    const textTimer = setTimeout(() => setShowText(true), 1500);

    // Handle video end — we let it play once fully then fade
    const handleEnded = () => {
      setPhase('fading');
      // Fade audio out
      if (audio) {
        let vol = audio.volume;
        const fadeOut = setInterval(() => {
          vol = Math.max(vol - 0.03, 0);
          if (audio) audio.volume = vol;
          if (vol <= 0) {
            clearInterval(fadeOut);
            audio.pause();
          }
        }, 50);
      }
      // Complete after fade animation
      setTimeout(onComplete, 1200);
    };

    video.addEventListener('ended', handleEnded);

    // Safety timeout — if video somehow doesn't end in 15s, force complete
    const safetyTimer = setTimeout(() => {
      setPhase('fading');
      setTimeout(onComplete, 1200);
    }, 15000);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(safetyTimer);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [onComplete]);

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <AnimatePresence>
      {phase !== 'fading' ? (
        <motion.div
          key="storm-transition"
          className="fixed inset-0 z-100 bg-black flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        >
          {/* Video */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover storm-video-bg"
            muted={false}
            playsInline
            preload="auto"
            src="/storm_clearing.mp4"
          />

          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/30 z-10" />

          {/* Text overlay with personalized greeting */}
          <AnimatePresence>
            {showText && (
              <motion.div
                className="relative z-20 text-center px-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                <p className="text-white/90 text-3xl md:text-4xl font-light tracking-wide leading-relaxed">
                  The skies are clearing, {userName}...
                </p>
                <p className="text-white/50 text-sm mt-4 tracking-widest uppercase">
                  Preparing your dashboard
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Calming ocean audio — local file */}
          <audio
            ref={audioRef}
            preload={isMobile ? 'none' : 'auto'}
            loop
            src="/audio/ocean_calm.mp3"
          />
        </motion.div>
      ) : (
        <motion.div
          key="storm-fade"
          className="fixed inset-0 z-100 bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      )}
    </AnimatePresence>
  );
}
