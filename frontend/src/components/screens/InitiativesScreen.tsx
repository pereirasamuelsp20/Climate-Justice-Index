import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchInitiatives, type Initiative } from '../../api';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { motion } from 'framer-motion';
import { Leaf, Clock, ArrowRight, CheckCircle2, Loader2, Calendar, History } from 'lucide-react';

const countryFlag = (iso2: string, className = "w-5 h-auto rounded-sm inline-block shadow-sm") => {
  if (!iso2 || iso2.length !== 2) return <span className={className}>🌍</span>;
  return (
    <img 
      src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`} 
      srcSet={`https://flagcdn.com/w80/${iso2.toLowerCase()}.png 2x`}
      alt={iso2} 
      className={className} 
      loading="lazy"
    />
  );
};

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  'in-progress': {
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-400',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  planned: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
    icon: <Clock className="w-3 h-3" />,
  },
  completed: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Renewable Energy': 'from-amber-500/10 to-amber-600/5',
  'Policy & Finance': 'from-blue-500/10 to-blue-600/5',
  'Carbon Trading': 'from-slate-500/10 to-slate-600/5',
  'Green Hydrogen': 'from-cyan-500/10 to-cyan-600/5',
  'Forest Conservation': 'from-emerald-500/10 to-emerald-600/5',
  Transport: 'from-purple-500/10 to-purple-600/5',
  'Grid Infrastructure': 'from-orange-500/10 to-orange-600/5',
  Reforestation: 'from-green-500/10 to-green-600/5',
  'Climate Adaptation': 'from-rose-500/10 to-rose-600/5',
  'Nuclear Energy': 'from-indigo-500/10 to-indigo-600/5',
  'Green Finance': 'from-teal-500/10 to-teal-600/5',
  'Energy Transition': 'from-red-500/10 to-red-600/5',
};

function formatDate(dateStr: string) {
  const [year, month] = dateStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export default function InitiativesScreen() {
  const [selectedInit, setSelectedInit] = useState<Initiative | null>(null);
  
  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: ['initiatives'],
    queryFn: fetchInitiatives,
    staleTime: 10_000,
    refetchInterval: 2 * 60_000,
  });

  const activeInitiatives = initiatives.filter(i => i.status !== 'completed');

  const renderInitiativeCard = (init: Initiative, i: number) => {
    const statusStyle = STATUS_STYLES[init.status] || STATUS_STYLES.planned;
    const categoryGradient = CATEGORY_COLORS[init.category] || 'from-slate-500/10 to-slate-600/5';
    const isCompleted = init.status === 'completed';

    return (
      <motion.div
        key={init.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05, duration: 0.3 }}
      >
        <Card className={`bg-white/5 backdrop-blur-md border border-white/10 shadow-lg overflow-hidden group hover:border-white/20 transition-all duration-300 h-full ${isCompleted ? 'border-emerald-500/20 hover:border-emerald-500/40' : ''}`}>
          <CardContent className="p-0 h-full flex flex-col">
            {/* Category gradient header */}
            <div className={`bg-linear-to-r ${isCompleted ? 'from-emerald-500/10 to-emerald-600/5' : categoryGradient} px-5 py-3 border-b border-white/4`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {init.category}
                </span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.icon}
                  {init.status}
                </div>
              </div>
            </div>

            <div className="p-5 flex flex-col flex-1">
              {/* Country + Title */}
              <div className="flex items-start gap-2.5 mb-3">
                <div className="shrink-0 mt-[3px]">{countryFlag(init.iso2, "w-6 rounded-sm shadow-sm border border-white/10")}</div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">
                    {init.title}
                  </h3>
                  <span className="text-[11px] text-slate-500">{init.country}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">
                {init.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/4">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  {isCompleted ? <History className="w-3 h-3 text-emerald-500/70" /> : <Calendar className="w-3 h-3" />}
                  <span className={isCompleted ? 'text-emerald-500/70' : ''}>
                    {isCompleted ? `Completed: ${formatDate(init.estimated_completion)}` : `Est. ${formatDate(init.estimated_completion)}`}
                  </span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInit(init);
                  }}
                  className={`flex items-center gap-1 text-[11px] sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer ${isCompleted ? 'text-emerald-400 hover:text-emerald-300' : 'text-blue-400 hover:text-blue-300'}`}
                >
                  <span>{isCompleted ? 'Historical Data' : 'Learn More'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <ArrowRight className={`w-3.5 h-3.5 hidden sm:block sm:group-hover:hidden transition-colors ${isCompleted ? 'text-emerald-900' : 'text-slate-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Active Initiatives Section */}
      <section className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Leaf className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white">Active Climate Initiatives</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Live updates on conservation efforts and climate action programs currently underway
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg p-6 animate-pulse">
                <div className="h-4 bg-white/6 rounded w-3/4 mb-3" />
                <div className="h-3 bg-white/6 rounded w-1/2 mb-6" />
                <div className="h-20 bg-white/4 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeInitiatives.map((init, i) => renderInitiativeCard(init, i))}
          </div>
        )}
      </section>

      {/* Detail Dialog */}
      <Dialog open={!!selectedInit} onOpenChange={(open) => !open && setSelectedInit(null)}>
        <DialogContent className="sm:max-w-4xl max-w-[95vw] bg-[#0c0e14]/80 backdrop-blur-2xl border border-white/10 text-white p-0 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
          <div className="p-6 sm:p-8 overflow-y-auto">
            <DialogHeader className="mb-6">
              <DialogTitle className="flex flex-col sm:flex-row sm:items-start gap-4 text-2xl font-bold">
                {selectedInit && <div className="shrink-0 mt-1">{countryFlag(selectedInit.iso2, "w-10 rounded shadow-md border border-white/10")}</div>}
                <div>
                  <span className="leading-tight block">{selectedInit?.title}</span>
                  <div className="flex flex-wrap items-center gap-2.5 mt-3">
                    <span className="bg-white/5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-300">
                      {selectedInit?.category}
                    </span>
                    <span className="bg-white/5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-300">
                      {selectedInit?.country}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${selectedInit ? STATUS_STYLES[selectedInit.status]?.bg : ''} ${selectedInit ? STATUS_STYLES[selectedInit.status]?.text : ''}`}>
                      {selectedInit?.status}
                    </span>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <p className="leading-relaxed text-[15px] text-slate-300 mb-8 border-l-2 border-white/10 pl-4">
              {selectedInit?.description}
            </p>

            {/* If Active/Planned */}
            {selectedInit && selectedInit.status !== 'completed' && (
              <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                <h4 className="text-blue-400 font-semibold text-xs uppercase tracking-wider mb-3 flex items-center gap-2 relative z-10">
                  <Leaf className="w-4 h-4" />
                  Project Scope & Targets
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed relative z-10">
                  This initiative represents a major milestone in <strong>{selectedInit?.country}</strong>'s commitment to global climate targets. 
                  By focusing heavily on <em>{selectedInit?.category.toLowerCase()}</em>, the project aims to significantly reduce carbon dependency and foster long-term environmental resilience within the region.
                </p>
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-blue-500/10 relative z-10">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>Target Completion</span>
                  </div>
                  <span className="font-semibold text-slate-200">
                    {selectedInit?.estimated_completion ? formatDate(selectedInit.estimated_completion) : 'TBD'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
