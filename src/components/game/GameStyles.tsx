'use client';

/**
 * Game-specific CSS styles and micro-interaction classes.
 * Import this component once in the game shell to inject styles.
 *
 * Based on research from:
 * - Game UI Database best practices
 * - Micro-interactions that boost engagement
 * - GPU-accelerated CSS animations for 60fps
 */
export default function GameStyles() {
  return (
    <style jsx global>{`
      /* ─── Button Press Effect ──────────────────────────────────────── */
      .game-btn {
        transition: transform 0.1s ease, box-shadow 0.2s ease;
      }
      .game-btn:active {
        transform: scale(0.96);
      }
      .game-btn:hover {
        box-shadow: 0 0 12px rgba(6, 182, 212, 0.15);
      }

      /* ─── Card Hover Lift ──────────────────────────────────────────── */
      .game-card {
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.3s ease;
      }
      .game-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      /* ─── Money Flash (green pulse when income received) ───────────── */
      @keyframes money-flash {
        0% { text-shadow: 0 0 0 transparent; }
        50% { text-shadow: 0 0 8px rgba(34, 197, 94, 0.5); }
        100% { text-shadow: 0 0 0 transparent; }
      }
      .money-flash {
        animation: money-flash 0.5s ease-out;
      }

      /* ─── Resource Gain Pulse ──────────────────────────────────────── */
      @keyframes resource-gain {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      .resource-gain {
        animation: resource-gain 0.3s ease-out;
      }

      /* ─── Progress Bar Shimmer ─────────────────────────────────────── */
      @keyframes bar-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .bar-shimmer {
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.1),
          transparent
        );
        background-size: 200% 100%;
        animation: bar-shimmer 2s linear infinite;
      }

      /* ─── Achievement Unlock Pop ───────────────────────────────────── */
      @keyframes achievement-pop {
        0% { transform: scale(0.3); opacity: 0; }
        60% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); }
      }
      .achievement-pop {
        animation: achievement-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      /* ─── Notification Slide In ────────────────────────────────────── */
      @keyframes slide-in-right {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .slide-in-right {
        animation: slide-in-right 0.3s ease-out;
      }

      /* ─── Glow Pulse for Active Items ──────────────────────────────── */
      @keyframes glow-pulse-cyan {
        0%, 100% { box-shadow: 0 0 4px rgba(6, 182, 212, 0.1); }
        50% { box-shadow: 0 0 12px rgba(6, 182, 212, 0.3); }
      }
      .glow-pulse-cyan {
        animation: glow-pulse-cyan 2s ease-in-out infinite;
      }

      @keyframes glow-pulse-green {
        0%, 100% { box-shadow: 0 0 4px rgba(34, 197, 94, 0.1); }
        50% { box-shadow: 0 0 12px rgba(34, 197, 94, 0.3); }
      }
      .glow-pulse-green {
        animation: glow-pulse-green 2s ease-in-out infinite;
      }

      @keyframes glow-pulse-amber {
        0%, 100% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.1); }
        50% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.3); }
      }
      .glow-pulse-amber {
        animation: glow-pulse-amber 2s ease-in-out infinite;
      }

      /* ─── Floating Number (shows +$5M above click) ─────────────────── */
      @keyframes float-up-fade {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-30px); opacity: 0; }
      }
      .float-up-fade {
        animation: float-up-fade 1s ease-out forwards;
        pointer-events: none;
        position: absolute;
      }

      /* ─── Tab Indicator ────────────────────────────────────────────── */
      .game-tab-active {
        position: relative;
      }
      .game-tab-active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 25%;
        right: 25%;
        height: 2px;
        background: linear-gradient(90deg, #06b6d4, #8b5cf6);
        border-radius: 2px;
      }

      /* ─── Tooltip ──────────────────────────────────────────────────── */
      .game-tooltip {
        position: relative;
      }
      .game-tooltip::before {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-4px);
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #e2e8f0;
        font-size: 10px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
        z-index: 50;
      }
      .game-tooltip:hover::before {
        opacity: 1;
      }

      /* ─── Scrollbar (game panels) ──────────────────────────────────── */
      .game-scroll::-webkit-scrollbar {
        width: 4px;
      }
      .game-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .game-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 2px;
      }
      .game-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      /* ─── Number Ticker ────────────────────────────────────────────── */
      .number-ticker {
        font-variant-numeric: tabular-nums;
        transition: color 0.3s ease;
      }

      /* ─── Construction Progress ────────────────────────────────────── */
      @keyframes construction-pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      .construction-pulse {
        animation: construction-pulse 1.5s ease-in-out infinite;
      }
    `}</style>
  );
}
