import { useState } from 'react';
import { MessageSquare, Sparkles, X } from 'lucide-react';

export function CoachWelcomeCard() {
  const [showCoachModal, setShowCoachModal] = useState(false);

  return (
    <>
      <div className="relative rounded-[28px] bg-white dark:bg-[#181E24] border border-slate-200/90 dark:border-white/[0.08] p-5 shadow-xs flex flex-col justify-between overflow-hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Welcome</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
            Personalized journey
          </h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
            Tips to get the most from Rachaqa Health:
          </p>

          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pb-12 sm:pb-0">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>Ask Coach for recommendations and workout targets</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
              <span>Explore daily trend breakdowns across Fitness, Sleep, and Health tabs</span>
            </li>
          </ul>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => setShowCoachModal(true)}
            className="px-4 py-2 rounded-2xl bg-[#C2E7FF] dark:bg-[#2B4C7E] hover:bg-[#A8D8FA] dark:hover:bg-[#355B95] text-[#001D35] dark:text-[#E2EEFF] font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#005B9E] dark:text-blue-300" />
            <span>Ask Coach</span>
          </button>
        </div>
      </div>

      {/* Ask Coach Modal */}
      {showCoachModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white dark:bg-[#181E24] border border-slate-200 dark:border-white/[0.08] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#00B0B9] text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">Coach Intelligence</h4>
                  <p className="text-xs text-slate-400">Personalized biometric recommendations</p>
                </div>
              </div>
              <button
                onClick={() => setShowCoachModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-6 text-xs">
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
                <p className="font-bold text-teal-600 dark:text-teal-300 mb-1">Cardio & Daily Steps</p>
                <p className="text-slate-700 dark:text-slate-300">
                  You are tracking well towards your daily activity goal. A brisk 25-minute evening walk will help hit your target cardio load!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="font-bold text-emerald-600 dark:text-emerald-300 mb-1">Daily Recovery State</p>
                <p className="text-slate-700 dark:text-slate-300">
                  Your resting heart rate and autonomic balance indicate positive recovery. Today is prime for moderate-to-vigorous training.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <p className="font-bold text-purple-600 dark:text-purple-300 mb-1">Sleep Architecture</p>
                <p className="text-slate-700 dark:text-slate-300">
                  Deep and REM restorative sleep percentages are aligned with healthy baseline distributions. Keep consistent sleep hygiene!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCoachModal(false)}
              className="w-full py-3 rounded-full bg-[#00B0B9] text-white font-bold text-xs hover:bg-[#00969E] transition-colors cursor-pointer"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
