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

  useEffect(() => {
    if (searchLocation && !localAlerts.some(a => a.region === displayLocation)) {
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
            id: `local-alert-${displayLocation}-${Date.now()}`,
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
    }
  }, [searchLocation, displayLocation, localAlerts, addLocalAlert]);

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col font-sans overflow-hidden relative">
      {/* Atmospheric Video Background */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen pointer-events-none"
      >
        <source src="/bg_video.mp4" type="video/mp4" />
      </video>

      {/* Global gradient overlay for readability */}
      <div className="fixed inset-0 bg-linear-to-b from-[#0c0e14]/60 via-[#0c0e14]/40 to-[#0c0e14]/80 z-0 pointer-events-none" />

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <Header />
        
        <main className="flex-1 overflow-y-auto w-full relative">
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
