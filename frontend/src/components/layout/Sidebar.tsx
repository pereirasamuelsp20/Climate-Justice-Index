import { useState } from 'react';
import { useAppStore, type Screen } from '../../store/useAppStore';
import { Button } from '../ui/button';
import { Sheet, SheetContent } from '../ui/sheet';
import {
  LayoutDashboard,
  Trophy,
  BarChart3,
  Leaf,
  MapPin,
  ChevronDown,
  History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  label: string;
  screen?: Screen;
  icon: React.ReactNode;
  children?: { label: string; screen: Screen; icon: React.ReactNode }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    screen: 'dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: 'Ranking',
    screen: 'ranking-statistical',
    icon: <Trophy className="h-4 w-4" />,
  },
  {
    label: 'Graphical Views',
    screen: 'ranking-graphical',
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    label: 'Initiatives',
    icon: <Leaf className="h-4 w-4" />,
    children: [
      {
        label: 'Active Initiatives',
        screen: 'initiatives',
        icon: <Leaf className="h-4 w-4" />,
      },
      {
        label: 'Completed Initiatives',
        screen: 'completed-initiatives',
        icon: <History className="h-4 w-4" />,
      },
    ],
  },
  {
    label: 'Hot Spot Map',
    screen: 'hotspot-map',
    icon: <MapPin className="h-4 w-4" />,
  },
];

function SidebarNav() {
  const { currentScreen, setCurrentScreen, setSidebarOpen } = useAppStore();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    // Auto-expand if user is on a ranking screen
    currentScreen.startsWith('ranking') ? 'Ranking' : null
  );

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
    setSidebarOpen(false);
  };

  return (
    <div className="p-4 py-6 h-full flex flex-col">
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.screen === currentScreen;
          const hasChildren = !!item.children;
          const isExpanded = expandedGroup === item.label;
          const isChildActive = item.children?.some(
            (c) => c.screen === currentScreen
          );

          return (
            <div key={item.label}>
              <Button
                variant="ghost"
                className={`w-full justify-start font-medium min-h-[44px] text-sm transition-all gap-2.5
                  ${
                    isActive || isChildActive
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/4'
                  }`}
                onClick={() => {
                  if (hasChildren) {
                    setExpandedGroup(isExpanded ? null : item.label);
                  } else if (item.screen) {
                    handleNavigate(item.screen);
                  }
                }}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {hasChildren && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </motion.div>
                )}
              </Button>

              {/* Sub-items */}
              <AnimatePresence>
                {hasChildren && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 pl-3 border-l border-white/6 mt-1 mb-1 space-y-0.5">
                      {item.children!.map((child) => {
                        const childActive = child.screen === currentScreen;
                        return (
                          <Button
                            key={child.screen}
                            variant="ghost"
                            className={`w-full justify-start font-medium min-h-[38px] text-sm transition-all gap-2.5
                              ${
                                childActive
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'text-slate-500 hover:text-white hover:bg-white/4'
                              }`}
                            onClick={() => handleNavigate(child.screen)}
                          >
                            {child.icon}
                            {child.label}
                          </Button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Branding at bottom */}
      <div className="mt-auto pt-6 border-t border-white/6">
        <div className="text-[10px] text-slate-600 text-center leading-relaxed">
          Climate Justice Index
          <br />
          <span className="text-slate-700">v2.0 • Real-time Data</span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent
        side="left"
        className="w-72 bg-[#0c0e14]/70 backdrop-blur-2xl border-r border-white/10 p-0"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 h-14">
          <div className="flex items-center gap-2.5">
            <img src="/animated_logo.svg" alt="Logo" className="h-8 w-8 object-contain" />
            <span className="text-sm font-semibold text-white">Navigation</span>
          </div>
        </div>
        <SidebarNav />
      </SheetContent>
    </Sheet>
  );
}
