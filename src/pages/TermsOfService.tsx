import { ArrowLeft, FileText, AlertTriangle, Scale, ShieldAlert } from 'lucide-react';
import { AcrylicBackground } from '../components/common/AcrylicBackground';

export function TermsOfService({ onBack }: { onBack?: () => void }) {
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
              <FileText className="w-4 h-4" />
              Legal & Terms
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Terms of Service
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
              Last updated: November 1, 2026
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold mb-1">
              <AlertTriangle className="w-4 h-4" />
              Important Medical Disclaimer
            </div>
            <p>
              Fitbit Health Dashboard is an informational analytics visualization tool designed solely for personal wellness exploration. It does <strong>not</strong> provide medical diagnoses, clinical guidance, or health treatment plans. Never disregard professional medical advice or delay seeking medical attention because of information viewed on this dashboard.
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-[#00B0B9]" />
              1. Acceptance of Terms
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              By accessing or using the Fitbit Health Dashboard (&quot;Service&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use this application.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              2. User Authorization & API Access
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              To utilize the Service, you must log in using your Google account and grant read-only permissions to retrieve your fitness, biometric, and sleep records. You represent and warrant that you are the lawful owner of the Google account used to access this application.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. Intellectual Property Rights
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Fitbit, Google Health, Google Fit, and associated logotypes are trademarks of Google LLC. This application is an independent client-side visualization tool and is not endorsed, sponsored, or certified by Google LLC or Fitbit Inc.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              4. Disclaimer of Warranties
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis, without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or uninterrupted availability.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Limitation of Liability
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              To the fullest extent permitted by applicable law, the author and maintainers shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or inability to use the Service or any biometric data rendered therein.
            </p>
          </section>

          <section className="space-y-4 border-t border-slate-200 dark:border-white/[0.08] pt-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              6. Contact
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              For any questions regarding these Terms, please reach out to{' '}
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

