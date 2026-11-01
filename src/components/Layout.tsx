import { useEffect, useState, type ReactNode } from 'react';
import { HeartPulse, Sun, Moon, Maximize2, Minimize2, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useDateRange } from '../context/DateRangeContext';
import { useTheme } from '../context/ThemeContext';
import { getPairedDevices, getUserInfo } from '../api/user';
import { AcrylicBackground } from './common/AcrylicBackground';

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

function BatteryIcon({ level, status }: { level: number | null; status: string }) {
  const color = batteryColor(level, status);
  const pct = level ?? (status.toLowerCase() === 'high' ? 85 : status.toLowerCase() === 'medium' ? 50 : 15);

  return (
    <svg width="20" height="11" viewBox="0 0 22 12" className="inline-block mr-1">
      <rect x="0.5" y="0.5" width="18" height="11" rx="2" fill="none" stroke={color} strokeWidth="1.2" />
      <rect x="19" y="3.5" width="2.5" height="5" rx="1" fill={color} opacity={0.7} />
      <rect x="2" y="2" width={Math.max(0, (pct / 100) * 14)} height="8" rx="1" fill={color} />
    </svg>
  );
}

export function Layout({
  children,
  onNavigate,
}: {
  children: ReactNode;
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
            battery: typeof trackerDevice.batteryLevel === 'number' ? trackerDevice.batteryLevel : null,
            batteryStatus: String(trackerDevice.batteryStatus || ''),
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
    <div className="relative min-h-screen bg-slate-100 dark:bg-[#0E1217] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-hidden">
      <AcrylicBackground />
      <header className="glass-header sticky top-0 z-40 bg-white/75 dark:bg-[#0C1016]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.06] px-4 md:px-8 py-3 transition-colors duration-200">
        <div className={`${fullWidth ? '' : 'max-w-7xl'} mx-auto flex flex-wrap items-center justify-between gap-3 relative z-10`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00B0B9] flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <HeartPulse className="w-5 h-5 drop-shadow-xs" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Rachaqa <span className="text-[#00B0B9] font-medium">Health</span>
                </h1>
                {tracker ? (
                  <span className="inline-flex items-center text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/90 dark:border-white/[0.08] rounded-full px-2.5 py-0.5 gap-1.5 font-semibold shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{tracker.name}</span>
                    {tracker.name.toLowerCase() === 'mobiletrack' ? (
                      <span className="text-[10px] text-slate-400 font-medium">Phone</span>
                    ) : (tracker.battery != null || (tracker.batteryStatus && tracker.batteryStatus.toLowerCase() !== 'empty' && tracker.batteryStatus.toLowerCase() !== 'unknown')) ? (
                      <>
                        <BatteryIcon level={tracker.battery} status={tracker.batteryStatus} />
                        <span style={{ color: batteryColor(tracker.battery, tracker.batteryStatus) }}>
                          {tracker.battery != null ? `${tracker.battery}%` : tracker.batteryStatus}
                        </span>
                      </>
                    ) : null}
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Cloud Sync
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Date range picker */}
            <div className="flex bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-0.5 text-xs">
              {[
                { label: '7d', val: 7 },
                { label: '30d', val: 30 },
                { label: '90d', val: 90 },
                { label: '6m', val: 180 },
                { label: '1y', val: 365 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setDaysBack(val)}
                  className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    daysBack === val
                      ? 'bg-white dark:bg-slate-800 text-[#00B0B9] dark:text-teal-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Glass / Acrylic toggle */}
            <button
              onClick={toggleGlassEffect}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                glassEffect
                  ? 'text-[#00B0B9] bg-teal-500/10 dark:bg-teal-500/20 ring-1 ring-[#00B0B9]/30'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800'
              }`}
              title={glassEffect ? 'Acrylic glass: Enabled (Click to disable)' : 'Acrylic glass: Disabled (Click to enable)'}
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Dark / Light mode toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Fullwidth toggle */}
            <button
              onClick={toggleFullWidth}
              className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={fullWidth ? 'Compact width' : 'Full width'}
            >
              {fullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* User profile / Sign out */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName || 'User'}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#00B0B9]/20 text-[#00B0B9] font-bold text-xs flex items-center justify-center">
                  {(userName || 'U')[0].toUpperCase()}
                </div>
              )}
              {userName && (
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden md:inline">
                  {userName}
                </span>
              )}
              <button
                onClick={logout}
                className="text-xs font-semibold text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`${fullWidth ? '' : 'max-w-7xl'} mx-auto p-4 md:p-6 lg:p-8 flex-1`}>
        {children}
      </main>

      <footer className={`${fullWidth ? '' : 'max-w-7xl'} mx-auto w-full px-4 md:px-6 lg:px-8 py-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto`}>
        <p>Rachaqa Health • Personal health intelligence</p>
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
