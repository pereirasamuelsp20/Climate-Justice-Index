import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';

const BarChart = lazy(() => import('../dashboard/BarChart'));

export default function RankingGraphicalScreen() {
  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="shrink-0">
        <h1 className="text-2xl font-bold text-white">Graphical Ranking</h1>
        <p className="text-sm text-slate-500 mt-1">
          Visual comparison of emissions share and injustice scores
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#161923] rounded-2xl p-6 border border-white/6 relative flex-1 min-h-[400px]"
      >
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          }
        >
          <div className="h-full w-full min-w-0">
            <BarChart />
          </div>
        </Suspense>
      </motion.div>
    </div>
  );
}
