import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchInitiatives, type Initiative } from '../../api';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Calendar, Scale, TrendingUp, TrendingDown, History, Award } from 'lucide-react';

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

function formatDate(dateStr: string) {
  const [year, month] = dateStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

/* ── Horizontal Timeline ── */
const HorizontalTimeline = ({ timeline }: { timeline: NonNullable<Initiative['timeline']> }) => {
  return (
    <div className="relative mt-8 pt-24 pb-12 overflow-x-auto">
      <div className="flex items-center w-max mx-auto px-24">
        {timeline.map((event, index) => (
          <div key={index} className="flex items-center">
            {/* Node */}
            <div className="relative flex flex-col items-center group cursor-pointer">
              {/* Hover tooltip */}
              <div className="absolute bottom-full mb-3 w-44 bg-[#1e2330] text-xs p-3 rounded-lg shadow-xl z-10 border border-white/10 text-center transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1">
                <span className="text-slate-200 block mb-1.5 leading-snug">{event.event}</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${event.isNegative ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {event.isNegative ? '' : '+'}{event.impact} Impact
                </span>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e2330] border-b border-r border-white/10 rotate-45" />
              </div>

              {/* Dot */}
              <div className={`w-7 h-7 rounded-full border-[5px] border-[#161923] shadow-sm z-10 transition-transform group-hover:scale-125 ${event.isNegative ? 'bg-red-400' : 'bg-emerald-400'}`} />

              {/* Date label */}
              <div className="absolute top-full mt-3 text-[11px] text-slate-400 font-semibold whitespace-nowrap">
                {formatDate(event.date)}
              </div>
            </div>

            {/* Connecting line */}
            {index < timeline.length - 1 && (
              <div className={`w-56 h-[3px] ${timeline[index + 1].isNegative ? 'bg-red-500/20' : 'bg-emerald-500/20'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Main Screen ── */
export default function CompletedInitiativesScreen() {
  const [selectedInit, setSelectedInit] = useState<Initiative | null>(null);

  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: ['initiatives'],
    queryFn: fetchInitiatives,
    staleTime: 5 * 60 * 1000,
  });

  const completedInitiatives = initiatives.filter(i => i.status === 'completed');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <History className="w-6 h-6 text-emerald-500" />
          <h1 className="text-2xl font-bold text-white">Completed Initiatives</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Review the timeline, before &amp; after metrics, and justice evaluation of completed climate projects
        </p>
      </motion.div>

      {/* Loading skeleton */}
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
      ) : completedInitiatives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <History className="w-12 h-12 text-slate-700 mb-4" />
          <p className="text-slate-500 text-sm">No completed initiatives yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedInitiatives.map((init, i) => {
            return (
              <motion.div
                key={init.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Card className="bg-white/5 backdrop-blur-md shadow-lg border-emerald-500/20 overflow-hidden group hover:border-emerald-500/40 transition-all duration-300 h-full cursor-pointer"
                  onClick={() => setSelectedInit(init)}
                >
                  <CardContent className="p-0 h-full flex flex-col">
                    {/* Header */}
                    <div className={`bg-linear-to-r from-emerald-500/10 to-emerald-600/5 px-5 py-3 border-b border-white/4`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {init.category}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          completed
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

                      {/* Justice badge preview */}
                      {init.evaluation && (
                        <div className="mb-3">
                          {init.evaluation.justiceServed ? (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                              <Scale className="w-3 h-3" />
                              Justice Served
                            </span>
                          ) : (
                            <span className="bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              Targets Missed
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/4">
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-500/70">
                          <Calendar className="w-3 h-3" />
                          <span>Completed: {formatDate(init.estimated_completion)}</span>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          View Timeline
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-900 group-hover:hidden transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Detail Dialog ── */}
      <Dialog open={!!selectedInit} onOpenChange={(open) => !open && setSelectedInit(null)}>
        <DialogContent className="sm:max-w-4xl max-w-[95vw] bg-[#0c0e14]/80 backdrop-blur-2xl shadow-2xl border border-white/10 text-white p-0 overflow-hidden max-h-[90vh] flex flex-col">
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
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                      completed
                    </span>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <p className="leading-relaxed text-[15px] text-slate-300 mb-8 border-l-2 border-white/10 pl-4">
              {selectedInit?.description}
            </p>

            {selectedInit && (
              <div className="space-y-8">

                {/* 1. Evaluation Summary */}
                {selectedInit.evaluation && (
                  <div className={`p-5 rounded-2xl border ${selectedInit.evaluation.wasHelpful ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Award className={`w-4 h-4 ${selectedInit.evaluation.wasHelpful ? 'text-emerald-400' : 'text-red-400'}`} />
                        Historical Evaluation
                      </h4>
                      {selectedInit.evaluation.justiceServed ? (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                          <Scale className="w-3 h-3" />
                          Justice Served
                        </span>
                      ) : (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                          <TrendingDown className="w-3 h-3" />
                          Targets Missed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {selectedInit.evaluation.summary}
                    </p>
                  </div>
                )}

                {/* 2. Before / After Metrics */}
                {selectedInit.metrics && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-inner">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        Before Initiative
                      </h5>
                      <div className="space-y-4">
                        {selectedInit.metrics.before.map((metric, idx) => (
                          <div key={idx}>
                            <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
                            <div className="text-lg font-semibold text-white">{metric.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-emerald-500/5 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/20 relative overflow-hidden shadow-inner">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        After Initiative
                      </h5>
                      <div className="space-y-4 relative z-10">
                        {selectedInit.metrics.after.map((metric, idx) => (
                          <div key={idx}>
                            <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
                            <div className="text-lg font-semibold text-white">{metric.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Chronological Timeline */}
                {selectedInit.timeline && (
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      Chronological Impact Timeline
                    </h4>
                    <p className="text-xs text-slate-400 mb-2">
                      Hover over nodes to view detailed milestones.
                    </p>
                    <HorizontalTimeline timeline={selectedInit.timeline} />
                  </div>
                )}

              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
