import { ArrowLeft, ShieldCheck, Lock, EyeOff, Trash2, ExternalLink } from 'lucide-react';
import { AcrylicBackground } from '../components/common/AcrylicBackground';

export function PrivacyPolicy({ onBack }: { onBack?: () => void }) {
  function handleGoHome() {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-100 dark:bg-[#0A0E13] text-slate-800 dark:text-slate-200 transition-colors duration-200 py-12 px-4 sm:px-6 lg:px-8">
      <AcrylicBackground />

      <div className="relative z-10 max-w-4xl mx-auto">
        <button
          onClick={handleGoHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-8 px-4 py-2 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-md cursor-pointer transition-all hover:scale-[1.02] shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="glass-card bg-white/85 dark:bg-[#121820]/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.08] rounded-[32px] p-8 sm:p-12 shadow-2xl space-y-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-teal-500/10 text-[#00B0B9] text-xs font-extrabold uppercase tracking-wider mb-4 border border-teal-500/20">
              <ShieldCheck className="w-4 h-4" />
              Privacy & Data Policy
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Privacy Policy
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
              Last updated: November 1, 2026
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
            <p className="font-semibold text-slate-900 dark:text-white mb-1">
              Google API Services User Data Policy Disclosure
            </p>
            <p>
              Fitbit Health Dashboard&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-[#00B0B9] hover:underline font-semibold inline-flex items-center gap-1"
              >
                Google API Services User Data Policy
                <ExternalLink className="w-3 h-3" />
              </a>
              , including the Limited Use requirements.
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-[#00B0B9]" />
              1. Overview & Architecture
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Fitbit Health Dashboard is designed as a client-side visualization application. We believe your personal biometric and wellness records belong strictly to you. All API requests made to Google Health and Fitbit services are executed directly from your personal web browser.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We do not maintain a remote database of health logs, nor do we run a centralized application server that inspects, stores, or processes your personal biometric records.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              2. Google User Data Accessed
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              When you authenticate with Google, our application requests read-only authorization for specific wellness scopes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <strong className="text-slate-900 dark:text-white">Sleep data:</strong> Historical sleep sessions, stages (deep, light, REM, awake), duration, and sleep efficiency scores.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Activity & fitness records:</strong> Daily step counts, active minutes, calories burned, and recorded physical workouts.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Health metrics & measurements:</strong> Heart rate time series, resting heart rate, heart rate variability (HRV), body weight, height, and BMI.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Nutrition logs:</strong> Logged food entries and hydration/water intake.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Profile & device settings:</strong> Display name and connected tracker metadata (e.g., sync timestamps, battery status) to identify active wearables.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. Purpose & How We Use Data
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We access user data exclusively to provide the following user-facing features:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>Visualizing your health metrics through interactive charts, dials, and historical trends.</li>
              <li>Calculating personal wellness summaries such as weekly step averages, resting heart rate patterns, and sleep regularity.</li>
              <li>Allowing you to customize and reorder dashboard cards according to your personal health priorities.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <EyeOff className="w-5 h-5 text-rose-500" />
              4. No Data Sharing, Sale, or AI Training
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                <strong className="text-slate-900 dark:text-white block mb-1">Zero Third-Party Sharing</strong>
                Your Google Health information is never transferred, shared, or distributed to data brokers, advertisers, or any external third parties.
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                <strong className="text-slate-900 dark:text-white block mb-1">No AI / LLM Training</strong>
                Your biometric metrics are never ingested, evaluated, or utilized to train general artificial intelligence or machine learning models.
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Trash2 className="w-5 h-5 text-amber-500" />
              5. Data Storage, Retention, & Deletion
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              OAuth access tokens and temporary data are held strictly in your browser&apos;s ephemeral session memory (<code className="text-xs bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded">sessionStorage</code>).
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <strong className="text-slate-900 dark:text-white">Immediate Deletion:</strong> Clicking the &quot;Sign Out&quot; button immediately wipes all access tokens, refresh tokens, and cached biometric samples from your browser.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-white">Revoking Access:</strong> You can permanently revoke this application&apos;s permission to access your Google account at any time by visiting{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00B0B9] hover:underline font-semibold inline-flex items-center gap-1"
                >
                  Google Account Third-Party Permissions
                  <ExternalLink className="w-3 h-3" />
                </a>.
              </li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-slate-200 dark:border-white/[0.08] pt-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              6. Contact Information
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              If you have any questions or concerns regarding this Privacy Policy or your data, please contact the maintainer at{' '}
              <a
                href="mailto:badro.zerraf05@gmail.com"
                className="text-[#00B0B9] hover:underline font-semibold"
              >
                badro.zerraf05@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

