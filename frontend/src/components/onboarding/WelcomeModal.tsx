import { useState, useEffect } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';
import { Map, BarChart3, BellRing } from 'lucide-react';

const WELCOME_TEXT = "Welcome to Climate Justice — where the data tells the story the world forgets.";

const STEPS = [
  {
    title: "What we measure",
    description: "The Climate Justice Index compares per-capita carbon emissions against a nation's vulnerability to climate change.",
    icon: <Map className="w-12 h-12 text-blue-400 mb-4" />
  },
  {
    title: "How to read the data",
    description: "Bubble size represents population. Color indicates GDP quartile. Find the 'injustice zone': high vulnerability, low emissions.",
    icon: <BarChart3 className="w-12 h-12 text-amber-400 mb-4" />
  },
  {
    title: "Real-time alerts",
    description: "We monitor global weather phenomena across 3 different APIs to bring you high-confidence severity alerts for your region.",
    icon: <BellRing className="w-12 h-12 text-red-400 mb-4" />
  }
];

export function WelcomeModal() {
  const { hasSeenOnboarding, setHasSeenOnboarding } = useUserStore();
  const [open, setOpen] = useState(false);
  
  const [phase, setPhase] = useState<'typing' | 'carousel'>('typing');
  const [stepIndex, setStepIndex] = useState(0);

  // We delay the opening slightly for effect, if we haven't seen it yet.
  useEffect(() => {
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [hasSeenOnboarding]);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(c => c + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = () => {
    setHasSeenOnboarding(true);
    setOpen(false);
  };

  // We render standard characters in a staggered manner
  const container = {
    hidden: { opacity: 0 },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.2 * i },
    }),
  };

  const child = {
    visible: { opacity: 1, y: 0 },
    hidden: { opacity: 0, y: 10 },
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) finishOnboarding();
    }}>
      <DialogContent className="sm:max-w-xl p-0 border-none bg-transparent shadow-none [&>button]:hidden flex items-center justify-center min-h-[400px]">
        {/* Transparent container removes default Dialog borders */}
        
        <AnimatePresence mode="wait">
          {phase === 'typing' && (
            <motion.div 
              key="typing"
              className="glass-card p-12 rounded-2xl shadow-2xl text-center flex flex-col items-center justify-center min-h-[300px] w-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            >
              <motion.div
                className="text-2xl md:text-3xl font-medium tracking-tight text-white leading-relaxed max-w-sm"
                variants={container}
                initial="hidden"
                animate="visible"
                onAnimationComplete={() => {
                  setTimeout(() => setPhase('carousel'), 1200);
                }}
              >
                {WELCOME_TEXT.split('').map((char, index) => (
                  <motion.span key={index} variants={child}>
                    {char}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          )}

          {phase === 'carousel' && (
            <motion.div
              key="carousel"
              className="bg-[#161923] border border-white/6 p-8 md:p-12 rounded-2xl shadow-2xl flex flex-col min-h-[400px] w-full"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.1, ease: 'easeOut', duration: 0.4 }}
            >
               <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={stepIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center"
                    >
                      {STEPS[stepIndex].icon}
                      <h2 className="text-2xl font-bold text-white mb-3">{STEPS[stepIndex].title}</h2>
                      <p className="text-slate-400 text-base leading-relaxed max-w-sm">
                        {STEPS[stepIndex].description}
                      </p>
                    </motion.div>
                  </AnimatePresence>
               </div>

               <div className="flex items-center justify-between mt-12">
                 <div className="flex gap-2">
                   {STEPS.map((_, i) => (
                     <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/10'}`} />
                   ))}
                 </div>
                 
                 <div className="flex gap-3">
                   <Button 
                     variant="ghost" 
                     className="text-slate-500 hover:text-white min-w-[48px] min-h-[44px]" 
                     onClick={finishOnboarding}
                   >
                     Skip
                   </Button>
                   <Button 
                     onClick={handleNext} 
                     className="bg-blue-600 hover:bg-blue-500 text-white min-w-[48px] min-h-[44px] shadow-lg shadow-blue-500/20"
                   >
                     {stepIndex === STEPS.length - 1 ? 'Get Started' : 'Next'}
                   </Button>
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

      </DialogContent>
    </Dialog>
  );
}
