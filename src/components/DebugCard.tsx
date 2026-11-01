import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getIdentity, getProfile, getSettings, getPairedDevices } from '../api/user';
import { Card, LoadingCard, ErrorCard } from './Card';

interface DebugData {
  identity: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  pairedDevices: Array<Record<string, unknown>>;
}

function Section({ title, data }: { title: string; data: unknown }) {
  if (!data) return null;
  return (
    <div className="mb-3">
      <p className="text-[11px] font-bold text-[#00B0B9] uppercase tracking-wider mb-1.5">{title}</p>
      <pre className="text-xs text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export function DebugCard() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    Promise.allSettled([
      getIdentity(accessToken),
      getProfile(accessToken),
      getSettings(accessToken),
      getPairedDevices(accessToken),
    ])
      .then(([identity, profile, settings, devices]) => {
        setData({
          identity: identity.status === 'fulfilled' ? identity.value : { error: String(identity.reason) },
          profile: profile.status === 'fulfilled' ? profile.value : { error: String(profile.reason) },
          settings: settings.status === 'fulfilled' ? settings.value : { error: String(settings.reason) },
          pairedDevices: devices.status === 'fulfilled' ? (devices.value.pairedDevices || []) : [{ error: String(devices.reason) }],
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) return <LoadingCard title="Debug: User Info" />;
  if (error) return <ErrorCard title="Debug: User Info" error={error} />;
  if (!data) return null;

  const content = (
    <>
      <Section title="Identity" data={data.identity} />
      <Section title="Profile" data={data.profile} />
      <Section title="Settings" data={data.settings} />
      {data.pairedDevices.map((device, i) => (
        <Section key={i} title={`Paired Device ${i + 1}`} data={device} />
      ))}
    </>
  );

  return (
    <Card
      title="Debug: User Info"
      subtitle="Raw API responses"
      category="SYSTEM TELEMETRY"
      accentColor="#64748B"
      expandedContent={content}
    >
      {content}
    </Card>
  );
}
