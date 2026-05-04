import { useState } from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useUserStore } from '../../store/useUserStore';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ProfileModal } from './ProfileModal';
import { useWeatherAlerts } from '../../hooks/useWeatherAlerts';
import { supabase } from '../../lib/supabase';

export function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const toggleAlertsDrawer = useAppStore((state) => state.toggleAlertsDrawer);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const session = useUserStore((state) => state.session);
  const userMetadata = session?.user?.user_metadata;
  const initial = userMetadata?.name?.[0] || userMetadata?.full_name?.[0] || session?.user?.email?.[0] || 'U';
  const { data: alerts = [] } = useWeatherAlerts();
  const localAlerts = useAppStore((state) => state.localAlerts);
  const dismissedAlertIds = useAppStore((state) => state.dismissedAlertIds);
  
  const allAlerts = [...localAlerts, ...alerts].filter(a => !dismissedAlertIds.includes(a.id));

  const unreadAlerts = allAlerts.filter(a => a.severity === 'High' || a.severity === 'Critical').length;

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-white/10 bg-white/5 px-4 md:px-6 backdrop-blur-xl shadow-sm">
      <div className="flex items-center gap-4">
        {/* Hamburger menu for all sizes */}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white min-w-[48px] min-h-[48px]"
          onClick={toggleSidebar}
        >
          <Menu className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-3">
          <img src="/animated_logo.svg" alt="Logo" className="h-14 w-auto object-contain" />
          <span className="text-lg font-semibold tracking-tight text-white hidden sm:inline">
            Climate Justice Index
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="relative min-w-[48px] min-h-[48px] text-slate-400 hover:text-white hover:bg-white/6 transition-colors"
          onClick={toggleAlertsDrawer}
          id="alerts-bell"
        >
          <Bell className="h-6 w-6" />
          {unreadAlerts > 0 && (
            <span className="absolute right-3 top-3 flex h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-[#0f1117] animate-pulse" />
          )}
        </Button>

        <div className="flex items-center gap-3 ml-2">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all hover:ring-2 hover:ring-white/20"
          >
            <Avatar className="h-10 w-10 border border-white/8">
              <AvatarImage src={userMetadata?.avatar_url || ''} />
              <AvatarFallback className="bg-white/6 text-slate-300 text-sm font-medium">
                {initial.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-red-400 transition-colors min-w-[48px] min-h-[48px]"
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            id="sign-out-btn"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ProfileModal open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </header>
  );
}
