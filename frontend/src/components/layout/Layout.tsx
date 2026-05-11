import { useEffect, type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AlertsDrawer } from './AlertsDrawer';
import { useUserStore } from '../../store/useUserStore';
import { useAppStore } from '../../store/useAppStore';
import { fetchWeather } from '../../api';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const session = useUserStore(state => state.session);
  const addLocalAlert = useAppStore(state => state.addLocalAlert);
  const localAlerts = useAppStore(state => state.localAlerts);
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

    // Also skip if there's already an active local alert for this location in state
    if (localAlerts.some(a => a.region === displayLocation)) return;

    fetchWeather(searchLocation).then(weather => {
      if (weather && weather.temp) {
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

        // Mark this location+date as shown so it won't repeat on re-login
        localStorage.setItem(storageKey, today);
        localStorage.setItem('cji-alert-date', today);
      }
    });
  }, [searchLocation, displayLocation, localAlerts, addLocalAlert]);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col font-sans overflow-x-hidden relative">
      {/* Atmospheric Video Background */}
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

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col min-h-screen w-full" style={{ WebkitOverflowScrolling: 'touch' as any, touchAction: 'manipulation' }}>
        <Header />
        
        <main className="flex-1 w-full relative overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 md:p-8">
            {children}
          </div>
        </main>

        <Sidebar />
        <AlertsDrawer />
      </div>
    </div>
  );
}
