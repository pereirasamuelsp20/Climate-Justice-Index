import { useMemo, useState } from 'react';
import { useClimateData } from '../../hooks/useClimateData';
import { motion } from 'framer-motion';
import { ArrowUpDown, Search } from 'lucide-react';

const countryFlag = (iso2: string) => {
  if (!iso2 || iso2.length !== 2) return '🌍';
  const codePoints = [...iso2.toUpperCase()].map(
    (c) => 0x1f1e6 + c.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
};

type SortKey = 'name' | 'emissions_per_capita' | 'vulnerability_score' | 'gdp_per_capita' | 'injustice_score' | 'composite_score';
type SortDir = 'asc' | 'desc';

export default function RankingStatisticalScreen() {
  const { data: climateData, isLoading } = useClimateData();
  const [sortKey, setSortKey] = useState<SortKey>('composite_score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // composite_score is now computed server-side with all 5 factors
  const enrichedData = climateData || [];

  const sortedData = useMemo(() => {
    let data = [...enrichedData];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.iso2.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      let aVal: number | string = a[sortKey] as number | string;
      let bVal: number | string = b[sortKey] as number | string;
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return data;
  }, [enrichedData, sortKey, sortDir, searchQuery]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 transition-colors ${sortKey === field ? 'text-blue-400' : 'text-slate-700'}`}
        />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-white">Statistical Ranking</h1>
            <p className="text-sm text-slate-500 mt-1">
              Country leaderboard sorted by composite climate score (lower is better)
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/4 border border-white/8 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 w-60"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/6 bg-white/2">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Country
                  </th>
                  <SortHeader label="Emissions (tCO₂/cap)" field="emissions_per_capita" />
                  <SortHeader label="Vulnerability" field="vulnerability_score" />
                  <SortHeader label="GDP/Capita" field="gdp_per_capita" />
                  <SortHeader label="Injustice Score" field="injustice_score" />
                  <SortHeader label="Composite Score" field="composite_score" />
                </tr>
              </thead>
              <tbody>
                {sortedData.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/4 hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{countryFlag(c.iso2)}</span>
                        <div>
                          <span className="text-sm font-medium text-white">{c.name}</span>
                          <span className="text-[10px] text-slate-600 block">{c.region}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${c.emissions_per_capita > 10 ? 'text-red-400' : c.emissions_per_capita > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {c.emissions_per_capita}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/6 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${c.vulnerability_score > 0.7 ? 'bg-red-500' : c.vulnerability_score > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${c.vulnerability_score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{c.vulnerability_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      ${c.gdp_per_capita.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${c.injustice_score > 5 ? 'text-red-400' : 'text-slate-300'}`}>
                        {c.injustice_score.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${c.composite_score < 0.3 ? 'bg-emerald-400' : c.composite_score < 0.6 ? 'bg-amber-400' : 'bg-red-400'}`}
                        />
                        <span className="text-sm font-bold text-white">{c.composite_score}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
