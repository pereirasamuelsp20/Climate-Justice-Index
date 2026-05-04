import { useMemo, useState } from 'react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useClimateData } from '../../hooks/useClimateData';
import { useAppStore } from '../../store/useAppStore';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1d2e] border border-white/8 rounded-xl shadow-2xl p-4 text-sm">
        <div className="font-bold text-[15px] text-white mb-2">{label}</div>
        <div className="flex flex-col gap-1.5 text-slate-400">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-500" />
             <span>Emissions Share:</span>
             <span className="font-medium text-white">{payload[0]?.value}%</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-red-400" />
             <span>Injustice Score:</span>
             <span className="font-medium text-white">{payload[1]?.value}</span>
           </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function BarChart() {
  const { data: climateData } = useClimateData();
  const { regionFilter } = useAppStore();
  const [sortBy, setSortBy] = useState<'injustice' | 'alpha'>('injustice');

  const chartData = useMemo(() => {
    if (!climateData) return [];
    
    let filtered = regionFilter 
      ? climateData.filter(d => d.region === regionFilter)
      : [...climateData];
      
    if (sortBy === 'injustice') {
      filtered.sort((a, b) => {
        const scoreA = a.vulnerability_score / (a.emissions_share_pct || 1);
        const scoreB = b.vulnerability_score / (b.emissions_share_pct || 1);
        return scoreB - scoreA;
      });
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return filtered;
  }, [climateData, regionFilter, sortBy]);

  if (!climateData) return null;

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="flex justify-end text-xs mb-4 z-10 w-full pr-2">
        <button 
          onClick={() => setSortBy('injustice')}
          className={`px-3 py-1.5 border border-r-0 rounded-l-lg transition-all ${
            sortBy === 'injustice' 
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
              : 'bg-white/3 text-slate-500 border-white/8 hover:text-slate-300'
          }`}
        >
          By Injustice
        </button>
        <button 
          onClick={() => setSortBy('alpha')}
          className={`px-3 py-1.5 border rounded-r-lg transition-all ${
            sortBy === 'alpha' 
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
              : 'bg-white/3 text-slate-500 border-white/8 hover:text-slate-300'
          }`}
        >
          A-Z
        </button>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: 0, bottom: 100 }}
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            angle={-50}
            textAnchor="end"
            height={120}
            interval={0}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          <Legend 
            verticalAlign="top"
            wrapperStyle={{ paddingBottom: '20px', color: '#64748b' }} 
            iconType="circle" 
          />
          
          <Bar dataKey="emissions_share_pct" name="Emissions Share (%)" fill="#60a5fa" radius={[4, 4, 0, 0]} animationEasing="ease-out" maxBarSize={40} />
          <Bar dataKey="injustice_score" name="Injustice Score" fill="#f87171" radius={[4, 4, 0, 0]} animationEasing="ease-out" maxBarSize={40} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}
