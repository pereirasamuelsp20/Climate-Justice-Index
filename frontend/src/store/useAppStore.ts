import { create } from 'zustand';

type Region = 'Africa' | 'Asia' | 'Europe' | 'Latin America' | 'North America' | 'Oceania' | null;
export type Screen = 'dashboard' | 'ranking-statistical' | 'ranking-graphical' | 'initiatives' | 'completed-initiatives' | 'hotspot-map';

interface AppState {
  currentScreen: Screen;
  regionFilter: Region;
  alertsDrawerOpen: boolean;
  sidebarOpen: boolean;
  selectedCountry: string | null;
  localAlerts: any[];
  dismissedAlertIds: string[];
  setCurrentScreen: (screen: Screen) => void;
  setRegionFilter: (region: Region) => void;
  toggleAlertsDrawer: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedCountry: (country: string | null) => void;
  addLocalAlert: (alert: any) => void;
  removeLocalAlert: (id: string) => void;
  clearLocalAlerts: () => void;
  dismissAlert: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: (sessionStorage.getItem('cji_screen') as Screen) || 'dashboard',
  regionFilter: null,
  alertsDrawerOpen: false,
  sidebarOpen: false,
  selectedCountry: null,
  localAlerts: [],
  dismissedAlertIds: [],
  setCurrentScreen: (screen) => {
    sessionStorage.setItem('cji_screen', screen);
    set({ currentScreen: screen });
  },
  setRegionFilter: (region) => set({ regionFilter: region }),
  toggleAlertsDrawer: () => set((state) => ({ alertsDrawerOpen: !state.alertsDrawerOpen })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  addLocalAlert: (alert) => set((state) => ({ localAlerts: [alert, ...state.localAlerts] })),
  removeLocalAlert: (id) => set((state) => ({ localAlerts: state.localAlerts.filter((a) => a.id !== id) })),
  clearLocalAlerts: () => set({ localAlerts: [] }),
  dismissAlert: (id) => set((state) => ({ dismissedAlertIds: [...state.dismissedAlertIds, id] })),
}));
