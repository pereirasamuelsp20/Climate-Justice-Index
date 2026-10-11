import { useEffect, useState, useRef, type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AlertsDrawer } from './AlertsDrawer';
import { useUserStore } from '../../store/useUserStore';
import { useAppStore } from '../../store/useAppStore';
import { fetchWeather } from '../../api';

const IS_MOBILE = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/* ─── Subtle ambient audio for the dashboard — desktop only ─── */
function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const startedRef = useRef(false);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (IS_MOBILE) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Very low volume — background presence, not prominent
    const targetVolume = 0.06;

    const fadeIn = () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audio.volume = 0;
      fadeIntervalRef.current = setInterval(() => {
        if (audio.volume < targetVolume - 0.005) {
          audio.volume = Math.min(audio.volume + 0.005, targetVolume);
        } else {
          audio.volume = targetVolume;
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        }
      }, 150);
    };

    const startAudio = () => {
      if (startedRef.current) return;
      audio.play()
        .then(() => {
          startedRef.current = true;
          fadeIn();
        })
        .catch(() => {
          // Will retry on next user interaction
        });
    };

    // Try autoplay immediately
    startAudio();

    // Fallback: user gesture to unlock audio
    const handleInteraction = () => {
      startAudio();
      if (startedRef.current) {
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      }
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      if (audio) { audio.pause(); audio.currentTime = 0; }
      startedRef.current = false;
    };
  }, []);

  if (IS_MOBILE) return null;

  return (
    <audio
      ref={audioRef}
      loop
      preload="auto"
      src="/audio/ocean_calm.mp3"
    />
  );
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const session = useUserStore(state => state.session);
  const addLocalAlert = useAppStore(state => state.addLocalAlert);
  const country = session?.user?.user_metadata?.country;
  const region = session?.user?.user_metadata?.region;

  // Prioritize region (city) if available, fallback to country
  const searchLocation = [region, country].filter(Boolean).join(', ');
  const displayLocation = region || country || 'Unknown';

  /**
   * Get today's date string in IST (UTC+5:30).
   * This ensures notifications reset at midnight IST regardless of user's local timezone.
   */
  const getISTDateKey = () => {
    const now = new Date();
    // IST is UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    return istTime.toISOString().slice(0, 10); // e.g. "2026-05-05"
  };

  // Clear stale local alerts on fresh mount (prevents carryover from previous sessions)
  useEffect(() => {
    const clearLocalAlerts = useAppStore.getState().clearLocalAlerts;
    const today = getISTDateKey();
    const lastAlertDate = localStorage.getItem('cji-alert-date');
    
    // If the stored date is from a previous IST day, clear all old alerts
    if (lastAlertDate && lastAlertDate !== today) {
      clearLocalAlerts();
      localStorage.removeItem('cji-alert-date');
    }
  }, []);

  useEffect(() => {
    if (!searchLocation) return;

    const today = getISTDateKey();
    const storageKey = `cji-weather-alert-${displayLocation}`;
    const lastShown = localStorage.getItem(storageKey);

    // Already showed a notification for this location today (IST) — skip
    if (lastShown === today) return;

    fetchWeather(searchLocation).then(weather => {
      if (weather && weather.temp) {
        // Double-check localStorage again (guards against async race)
        if (localStorage.getItem(storageKey) === today) return;

        // Also skip if there's already an active local alert for this location in state
        const currentAlerts = useAppStore.getState().localAlerts;
        if (currentAlerts.some(a => a.region === displayLocation)) return;

        const temp = Math.round(weather.temp);
        const isHot = temp >= 25;
        const isCold = temp < 15;
        
        const funnyLinesHot = [
          "Beware, it's too hot outside! A sweet person like you might melt. 🫠",
          "It's boiling! Don't forget your SPF 5000. ☀️",
          "Global warming is showing off today. Grab an ice cream! 🍦"
        ];
        const funnyLinesCold = [
          "Brrr! It's freezing. You might turn into a popsicle! 🥶",
          "Sweater weather! Or should I say, three-sweater weather. 🧥",
          "Perfect day to stay inside and write code! ☕"
        ];
        const funnyLinesMild = [
          "Weather is nice! Perfect for a walk... or just sitting and coding. 🚶",
          "A beautiful day! You should definitely look out a window. 🪟"
        ];
        
        let message = funnyLinesMild[Math.floor(Math.random() * funnyLinesMild.length)];
        if (isHot) message = funnyLinesHot[Math.floor(Math.random() * funnyLinesHot.length)];
        else if (isCold) message = funnyLinesCold[Math.floor(Math.random() * funnyLinesCold.length)];

        // Set localStorage BEFORE adding alert — synchronous guard prevents duplicates
        localStorage.setItem(storageKey, today);
        localStorage.setItem('cji-alert-date', today);

        addLocalAlert({
          id: `local-alert-${displayLocation}-${today}`,
          alert_type: isHot ? 'Extreme Heat' : isCold ? 'Cold Wave' : 'Weather Update',
          severity: isHot ? 'High' : isCold ? 'Medium' : 'Low',
          region: displayLocation,
          source_data: { 
            OpenWeatherMap: `Temp: ${temp}°C, ${weather.condition}`, 
            TomorrowIO: message 
          },
          confidence_score: 1.0,
          created_at: new Date().toISOString()
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocation, displayLocation]);

  const [isMobile] = useState(() =>
    typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col font-sans overflow-x-hidden relative">
      {/* Ambient Audio — desktop only, very low volume */}
      <AmbientAudio />

      {/* Background: Video on desktop, static gradient on mobile (prevents mix-blend-screen jank) */}
      {!isMobile ? (
        <>
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="fixed inset-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen pointer-events-none"
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          >
            <source src="/bg_video.mp4" type="video/mp4" />
          </video>

          {/* Global gradient overlay for readability */}
          <div className="fixed inset-0 bg-linear-to-b from-[#0c0e14]/60 via-[#0c0e14]/40 to-[#0c0e14]/80 z-0 pointer-events-none" />
        </>
      ) : (
        /* Mobile: lightweight static gradient instead of GPU-heavy video */
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, #0c0e14 0%, #111422 40%, #0f1117 100%)',
          }}
        />
      )}

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <Header />
        
        <main className="flex-1 w-full relative">
          <div className="mx-auto max-w-7xl p-3 md:p-8">
            {children}
          </div>
        </main>

        <Sidebar />
        <AlertsDrawer />
      </div>
    </div>
  );
}
