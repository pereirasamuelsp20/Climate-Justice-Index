import { useClimateData } from '../../hooks/useClimateData';
import { useAppStore, type Screen } from '../../store/useAppStore';
import { Card, CardContent } from '../ui/card';
import {
  Trophy,
  BarChart3,
  Leaf,
  MapPin,
  TrendingDown,
  Shield,
  Zap,
  ArrowRight,
  History,
} from 'lucide-react';
import { motion } from 'framer-motion';

const countryFlag = (iso2: string) => {
  if (!iso2 || iso2.length !== 2) return '🌍';
  const codePoints = [...iso2.toUpperCase()].map(
    (c) => 0x1f1e6 + c.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
};

interface QuickAction {
  label: string;
  description: string;
  screen: Screen;
  icon: React.ReactNode;
  iconBg: string;
  hoverClass: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Statistical Ranking',
    description: 'Compare countries by emissions, vulnerability, and injustice score',
    screen: 'ranking-statistical',
    icon: <Trophy className="w-5 h-5" />,
    iconBg: 'bg-amber-500/15 text-amber-400',
    hoverClass: 'hover:shadow-[0_0_40px_-5px_rgba(245,158,11,0.25)] hover:border-amber-500/40',
  },
  {
    label: 'Graphical Ranking',
    description: 'Visual bar charts comparing country performance',
    screen: 'ranking-graphical',
    icon: <BarChart3 className="w-5 h-5" />,
    iconBg: 'bg-blue-500/15 text-blue-400',
    hoverClass: 'hover:shadow-[0_0_40px_-5px_rgba(59,130,246,0.25)] hover:border-blue-500/40',
  },
  {
    label: 'Climate Initiatives',
    description: 'Live updates on conservation efforts worldwide',
    screen: 'initiatives',
    icon: <Leaf className="w-5 h-5" />,
    iconBg: 'bg-emerald-500/15 text-emerald-400',
    hoverClass: 'hover:shadow-[0_0_40px_-5px_rgba(16,185,129,0.25)] hover:border-emerald-500/40',
  },
  {
    label: 'Hot Spot Map',
    description: 'Interactive map with vulnerability & AQI data',
    screen: 'hotspot-map',
    icon: <MapPin className="w-5 h-5" />,
    iconBg: 'bg-red-500/15 text-red-400',
    hoverClass: 'hover:shadow-[0_0_40px_-5px_rgba(239,68,68,0.25)] hover:border-red-500/40',
  },
  {
    label: 'Completed Initiatives',
    description: 'Review timelines & justice outcomes of completed projects',
    screen: 'completed-initiatives',
    icon: <History className="w-5 h-5" />,
    iconBg: 'bg-teal-500/15 text-teal-400',
    hoverClass: 'hover:shadow-[0_0_40px_-5px_rgba(20,184,166,0.25)] hover:border-teal-500/40',
  },
];

export default function DashboardScreen() {
  const { data: climateData, isLoading } = useClimateData();
  const setCurrentScreen = useAppStore((s) => s.setCurrentScreen);

  // Compute best/worst countries
  const sorted = climateData
    ? [...climateData].sort((a, b) => a.emissions_per_capita - b.emissions_per_capita)
    : [];
  const lowestEmitters = sorted.slice(0, 5);
  const leastVulnerable = climateData
    ? [...climateData].sort((a, b) => a.vulnerability_score - b.vulnerability_score).slice(0, 5)
    : [];
  const highestGdp = climateData
    ? [...climateData].sort((a, b) => b.gdp_per_capita - a.gdp_per_capita).slice(0, 5)
    : [];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl p-8 md:p-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10">
            <img src="/dash_logo.svg" alt="Climate Justice Index" className="w-full max-w-xl mb-6" />
            <p className="text-slate-400 max-w-2xl text-base leading-relaxed">
              Track global climate equity in real-time. Monitor emissions, vulnerability scores, and
              conservation initiatives across nations to identify where climate injustice is greatest
              and where action is being taken.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="flex items-center gap-2 text-xs bg-white/4 px-3 py-1.5 rounded-full text-slate-400 border border-white/6">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Data
              </div>
              <div className="flex items-center gap-2 text-xs bg-white/4 px-3 py-1.5 rounded-full text-slate-400 border border-white/6">
                <Shield className="w-3 h-3" />
                {climateData?.length || '—'} Countries Tracked
              </div>
              <div className="flex items-center gap-2 text-xs bg-white/4 px-3 py-1.5 rounded-full text-slate-400 border border-white/6">
                <Zap className="w-3 h-3" />
                Real-Time AQI
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {QUICK_ACTIONS.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <Card
                className={`h-full bg-white/5 backdrop-blur-md border border-white/10 shadow-lg cursor-pointer group transition-all duration-300 overflow-hidden hover:-translate-y-1.5 ${action.hoverClass}`}
                onClick={() => setCurrentScreen(action.screen)}
              >
                <CardContent className="p-5 relative">
                  <div className="relative z-10">
                    <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center mb-3`}>
                      {action.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {action.description}
                    </p>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 mt-3 transition-all group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Best Countries Leaderboards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Top Performers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lowest Emitters */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Lowest Emissions</h3>
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-6 bg-white/4 rounded animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lowestEmitters.map((c, i) => (
                      <div key={c.iso2} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                          <span>{countryFlag(c.iso2)}</span>
                          <span className="text-slate-300">{c.name}</span>
                        </div>
                        <span className="text-emerald-400 font-medium text-xs">
                          {c.emissions_per_capita} tCO₂
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Least Vulnerable */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Most Resilient</h3>
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-6 bg-white/4 rounded animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leastVulnerable.map((c, i) => (
                      <div key={c.iso2} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                          <span>{countryFlag(c.iso2)}</span>
                          <span className="text-slate-300">{c.name}</span>
                        </div>
                        <span className="text-blue-400 font-medium text-xs">
                          {c.vulnerability_score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Highest GDP */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Highest GDP/Capita</h3>
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-6 bg-white/4 rounded animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {highestGdp.map((c, i) => (
                      <div key={c.iso2} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                          <span>{countryFlag(c.iso2)}</span>
                          <span className="text-slate-300">{c.name}</span>
                        </div>
                        <span className="text-amber-400 font-medium text-xs">
                          ${c.gdp_per_capita.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
