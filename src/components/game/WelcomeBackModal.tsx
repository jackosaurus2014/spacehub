'use client';

import { formatMoney } from '@/lib/game/formulas';
import type { OfflineEarnings } from '@/lib/game/offline-income';
import { playSound } from '@/lib/game/sound-engine';

interface WelcomeBackModalProps {
  earnings: OfflineEarnings;
  onCollect: () => void;
}

export default function WelcomeBackModal({ earnings, onCollect }: WelcomeBackModalProps) {
  const hours = Math.floor(earnings.timeAwayCapped / 3600000);
  const minutes = Math.floor((earnings.timeAwayCapped % 3600000) / 60000);
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const totalResources = Object.values(earnings.resourcesEarned).reduce((a, b) => a + b, 0);
  const topResources = Object.entries(earnings.resourcesEarned)
    .filter(([, qty]) => qty > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #0f1530 0%, #0a0a1a 100%)' }}>
        <div className="h-1 bg-gradient-to-r from-green-500 via-cyan-500 to-green-500" />

        <div className="p-6 text-center">
          <span className="text-4xl block mb-3">🌙</span>
          <h3 className="text-xl font-bold text-white mb-1">Welcome Back!</h3>
          <p className="text-slate-400 text-sm mb-5">
            Your empire ran for <span className="text-white font-medium">{timeStr}</span> while you were away.
          </p>

          {/* Earnings */}
          <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 mb-4">
            <p className="text-green-400 text-2xl font-bold font-mono mb-1">
              +{formatMoney(earnings.moneyEarned)}
            </p>
            <p className="text-slate-500 text-xs">Revenue earned offline</p>
          </div>

          {/* Resources */}
          {totalResources > 0 && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 mb-4">
              <p className="text-amber-400 text-sm font-semibold mb-2">
                +{totalResources.toLocaleString()} resources mined
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {topResources.map(([id, qty]) => (
                  <span key={id} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400">
                    {id.replace(/_/g, ' ')}: +{qty}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { playSound('milestone'); onCollect(); }}
            className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 rounded-xl transition-all"
          >
            Collect Earnings
          </button>

          <p className="text-slate-600 text-[10px] mt-3">
            Offline income capped at 8 hours. Keep your services running to earn while away!
          </p>
        </div>
      </div>
    </div>
  );
}
