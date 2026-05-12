import { useMemo, useState } from 'react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useClimateData } from '../../hooks/useClimateData';
import { useAppStore } from '../../store/useAppStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

const METRICS = [
  { id: 'emissions_per_capita', label: 'Emissions (tCO₂/cap)', color: '#34d399' },
  { id: 'vulnerability_score', label: 'Vulnerability', color: '#f87171' },
  { id: 'gdp_per_capita', label: 'GDP/Capita', color: '#fbbf24' },
  { id: 'injustice_score', label: 'Injustice Score', color: '#f472b6' },
  { id: 'composite_score', label: 'Composite Score', color: '#a78bfa' },
] as const;

type MetricId = typeof METRICS[number]['id'];

const CustomTooltip = ({ active, payload, label, selectedMetric }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    let formatted: string;
    if (typeof val === 'number') {
      if (selectedMetric.id === 'gdp_per_capita') {
        formatted = `$${val.toLocaleString()}`;
      } else if (val % 1 !== 0) {
        formatted = val.toFixed(4);
      } else {
        formatted = val.toLocaleString();
      }
    } else {
      formatted = String(val);
    }
    return (
      <div className="bg-[#1a1d2e] border border-white/8 rounded-xl shadow-2xl p-4 text-sm">
        <div className="font-bold text-[15px] text-white mb-2">{label}</div>
        <div className="flex flex-col gap-1.5 text-slate-400">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedMetric.color }} />
             <span>{selectedMetric.label}:</span>
             <span className="font-medium text-white">{formatted}</span>
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
  const [selectedMetricId, setSelectedMetricId] = useState<MetricId>('emissions_per_capita');
  const [page, setPage] = useState(0);

  const selectedMetric = METRICS.find(m => m.id === selectedMetricId) || METRICS[0];

  // composite_score is now computed server-side with all 5 factors
  const chartData = useMemo(() => {
    if (!climateData) return [];

    let filtered = regionFilter 
      ? climateData.filter(d => d.region === regionFilter)
      : [...climateData];
      
    // Sort by selected metric descending
    filtered.sort((a, b) => {
      const valA = (a[selectedMetricId as keyof typeof a] as number) || 0;
      const valB = (b[selectedMetricId as keyof typeof b] as number) || 0;
      return valB - valA;
    });
    
    return filtered;
  }, [climateData, regionFilter, selectedMetricId]);

  // Reset page when metric or filter changes
  const totalPages = Math.ceil(chartData.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));
  const pagedData = chartData.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const rangeStart = safePage * PAGE_SIZE + 1;
  const rangeEnd = Math.min((safePage + 1) * PAGE_SIZE, chartData.length);

  if (!climateData) return null;

  return (
    <div className="flex flex-col h-full w-full relative" style={{ minHeight: 300 }}>
      {/* Controls row */}
      <div className="flex flex-wrap justify-between items-center gap-3 text-xs mb-4 z-10 w-full pr-2">
        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-400 font-medium min-w-[100px] text-center">
            {rangeStart}–{rangeEnd} of {chartData.length}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Metric selector */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-medium">Factor:</span>
          <select 
            value={selectedMetricId} 
            onChange={(e) => { setSelectedMetricId(e.target.value as MetricId); setPage(0); }}
            className="bg-[#1a1d2e] border border-white/10 text-slate-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-2 outline-none cursor-pointer"
          >
            {METRICS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%" minHeight={250}>
        <ReBarChart
          data={pagedData}
          margin={{ top: 20, right: 10, left: 0, bottom: 80 }}
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            angle={-35}
            textAnchor="end"
            height={90}
            interval={0}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => {
              if (selectedMetricId === 'gdp_per_capita') {
                return val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`;
              }
              return val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val;
            }}
          />
          <Tooltip 
            content={<CustomTooltip selectedMetric={selectedMetric} />} 
            cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
          />
          
          <Bar 
            dataKey={selectedMetric.id} 
            name={selectedMetric.label} 
            fill={selectedMetric.color} 
            radius={[4, 4, 0, 0]} 
            animationEasing="ease-out" 
            maxBarSize={60} 
          />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}
