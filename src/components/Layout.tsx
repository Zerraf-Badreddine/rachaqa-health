import { useEffect, useState, type ReactNode } from 'react';
import {
  HeartPulse,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  LogOut,
  Sparkles,
  Dumbbell,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useDateRange } from '../context/DateRangeContext';
import { useTheme } from '../context/ThemeContext';
import { getPairedDevices, getUserInfo } from '../api/user';
import { AcrylicBackground } from './common/AcrylicBackground';

export type GoogleHealthTab = 'today' | 'fitness' | 'sleep' | 'health';

const FULLWIDTH_KEY = 'dashboard_fullwidth';

function loadFullWidth(): boolean {
  try { return localStorage.getItem(FULLWIDTH_KEY) === 'true'; } catch { return false; }
}

interface TrackerInfo {
  name: string;
  battery: number | null;
  batteryStatus: string;
}

function batteryColor(level: number | null, status: string): string {
  if (level !== null) {
    if (level > 50) return '#10b981';
    if (level > 20) return '#f59e0b';
    return '#ef4444';
  }
  const s = status.toLowerCase();
  if (s === 'high') return '#10b981';
  if (s === 'medium') return '#f59e0b';
  if (s === 'low' || s === 'empty') return '#ef4444';
  return '#94a3b8';
}

function BatteryPill({ tracker }: { tracker: TrackerInfo | null }) {
  const level = tracker?.battery ?? 45;
  const status = tracker?.batteryStatus ?? 'medium';
  const color = batteryColor(tracker?.battery ?? null, status);

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 dark:bg-white/[0.08] border border-slate-200/90 dark:border-white/[0.12] text-xs font-bold text-slate-800 dark:text-slate-100 shadow-xs">
      <svg width="18" height="11" viewBox="0 0 22 12" className="inline-block flex-shrink-0">
        <rect x="0.5" y="0.5" width="18" height="11" rx="2.5" fill="none" stroke={color} strokeWidth="1.5" />
        <rect x="19" y="3.5" width="2.5" height="5" rx="1" fill={color} />
        <rect x="2" y="2" width={Math.max(2, (level / 100) * 15)} height="8" rx="1.5" fill={color} />
      </svg>
      <span className="tabular-nums font-mono">{level}%</span>
    </div>
  );
}

export function Layout({
  children,
  activeTab = 'today',
  onSelectTab,
  onNavigate,
}: {
  children: ReactNode;
  activeTab?: GoogleHealthTab;
  onSelectTab?: (tab: GoogleHealthTab) => void;
  onNavigate?: (path: string) => void;
}) {
  const { accessToken, logout } = useAuth();
  const { daysBack, setDaysBack } = useDateRange();
  const { toggleTheme, isDark, glassEffect, toggleGlassEffect } = useTheme();
  const [fullWidth, setFullWidth] = useState(loadFullWidth);
  const [tracker, setTracker] = useState<TrackerInfo | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    getPairedDevices(accessToken)
      .then((data) => {
        const devices = data.pairedDevices || [];
        const physicalTracker = devices.find(
          (d) => d.deviceType === 'TRACKER' && String(d.deviceVersion || '').toLowerCase() !== 'mobiletrack'
        );
        const trackerDevice = physicalTracker || devices.find((d) => d.deviceType === 'TRACKER') || devices[0];
        if (trackerDevice) {
          setTracker({
            name: String(trackerDevice.deviceVersion || 'Tracker'),
            battery: typeof trackerDevice.batteryLevel === 'number' ? trackerDevice.batteryLevel : 45,
            batteryStatus: String(trackerDevice.batteryStatus || 'high'),
          });
        }
      })
      .catch(() => {});
    getUserInfo(accessToken)
      .then((info) => {
        if (info.name) setUserName(info.name);
        if (info.picture) setUserAvatar(info.picture);
      })
      .catch(() => {});
  }, [accessToken]);

  function toggleFullWidth() {
    const next = !fullWidth;
    setFullWidth(next);
    localStorage.setItem(FULLWIDTH_KEY, String(next));
  }

  return (
    <div className="relative min-h-screen bg-[#F0F4F7] dark:bg-[#0D1115] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-hidden flex flex-col">
      <AcrylicBackground />

      {/* Top Header: Official Google Health / Fitbit status bar */}
      <header className="glass-header sticky top-0 z-40 bg-white/85 dark:bg-[#0D1115]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.06] px-4 md:px-8 py-2.5 transition-colors duration-200">
        <div className={`${fullWidth ? '' : 'max-w-7xl'} mx-auto flex items-center justify-between gap-3 relative z-10`}>
          {/* Left: Battery Capsule & Title */}
          <div className="flex items-center gap-3">
            <BatteryPill tracker={tracker} />
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Synced</span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-white/[0.1] hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#00B0B9] text-white flex items-center justify-center shadow-xs">
                <HeartPulse className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Rachaqa <span className="text-[#00B0B9] font-semibold">Health</span>
              </h1>
            </div>
          </div>

          {/* Center: Desktop 4-Tab Navigation (Screenshots 2, 3, & 4) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 dark:bg-white/[0.05] p-1 rounded-full border border-slate-200/80 dark:border-white/[0.08]">
            {[
              { id: 'today' as GoogleHealthTab, label: 'Today', icon: Sun },
              { id: 'fitness' as GoogleHealthTab, label: 'Fitness', icon: Dumbbell },
              { id: 'sleep' as GoogleHealthTab, label: 'Sleep', icon: Moon },
              { id: 'health' as GoogleHealthTab, label: 'Health', icon: HeartPulse },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab && onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#C2E7FF] dark:bg-[#004A77] text-[#001D35] dark:text-[#C2E7FF] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Date range picker */}
            <div className="hidden lg:flex bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-0.5 text-xs">
              {[
                { label: '7d', val: 7 },
                { label: '30d', val: 30 },
                { label: '90d', val: 90 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setDaysBack(val)}
                  className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    daysBack === val
                      ? 'bg-white dark:bg-slate-800 text-[#00B0B9] dark:text-teal-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Acrylic toggle */}
            <button
              onClick={toggleGlassEffect}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                glassEffect
                  ? 'text-[#00B0B9] bg-teal-500/10 dark:bg-teal-500/20 ring-1 ring-[#00B0B9]/30'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-white/[0.06]'
              }`}
              title={glassEffect ? 'Acrylic glass: Enabled' : 'Acrylic glass: Disabled'}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            {/* Dark / Light toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] transition-colors cursor-pointer"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>

            {/* Fullwidth toggle */}
            <button
              onClick={toggleFullWidth}
              className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] transition-colors cursor-pointer"
              title={fullWidth ? 'Compact width' : 'Full width'}
            >
              {fullWidth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Google Profile Avatar with 4-Color Rainbow Ring (Screenshot 2 & 3) */}
            <div className="flex items-center gap-1.5 pl-1">
              <div
                className="w-8 h-8 rounded-full p-[2px] shadow-sm flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'conic-gradient(#4285F4 0deg 90deg, #EA4335 90deg 180deg, #FBBC05 180deg 270deg, #34A853 270deg 360deg)',
                }}
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName || 'User'}
                    className="w-full h-full rounded-full object-cover bg-white"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 text-[#00B0B9] font-bold text-xs flex items-center justify-center">
                    {(userName || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>

              <button
                onClick={logout}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`${fullWidth ? '' : 'max-w-7xl'} mx-auto p-4 md:p-6 lg:p-8 flex-1 w-full pb-28 md:pb-12`}>
        {children}
      </main>

      {/* Official 4-Tab Bottom Navigation Bar (Mobile only, Screenshots 2, 3, & 4) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0D1115]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/[0.08] py-2 px-4 select-none">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {[
            { id: 'today' as GoogleHealthTab, label: 'Today', icon: Sun },
            { id: 'fitness' as GoogleHealthTab, label: 'Fitness', icon: Dumbbell },
            { id: 'sleep' as GoogleHealthTab, label: 'Sleep', icon: Moon },
            { id: 'health' as GoogleHealthTab, label: 'Health', icon: HeartPulse },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab && onSelectTab(tab.id)}
                className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-all group"
              >
                <div
                  className={`px-5 py-1 rounded-full transition-all flex items-center justify-center ${
                    isActive
                      ? 'bg-[#C2E7FF] dark:bg-[#004A77] text-[#001D35] dark:text-[#C2E7FF] scale-105'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                </div>
                <span
                  className={`text-[11px] font-bold tracking-tight mt-1 transition-colors ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className={`${fullWidth ? '' : 'max-w-7xl'} mx-auto w-full px-4 md:px-6 lg:px-8 py-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 pb-24 md:pb-8`}>
        <p>Rachaqa Health • Personal wellness intelligence</p>
        <div className="flex items-center gap-4 font-semibold">
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) onNavigate('/privacy');
              else window.location.href = '/privacy';
            }}
            className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Privacy Policy
          </a>
          <span>•</span>
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) onNavigate('/terms');
              else window.location.href = '/terms';
            }}
            className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}
