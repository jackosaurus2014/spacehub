'use client';

/**
 * AAA-quality game CSS styles, animations, and visual effects.
 * Implements glassmorphism, neon glow, particle shimmer, and
 * cinematic micro-interactions for a premium game feel.
 */
export default function GameStyles() {
  return (
    <style jsx global>{`
      /* ═══════════════════════════════════════════════════════════════════
         GLASSMORPHISM PANELS — frosted glass effect for game panels
         ═══════════════════════════════════════════════════════════════════ */
      .game-panel {
        background: rgba(10, 10, 20, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 16px;
      }

      .game-panel-glow {
        background: rgba(10, 10, 20, 0.85);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(6, 182, 212, 0.15);
        border-radius: 16px;
        box-shadow: 0 0 30px rgba(6, 182, 212, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      /* ═══════════════════════════════════════════════════════════════════
         CARD SYSTEM — hover lift, glow states, interactive cards
         ═══════════════════════════════════════════════════════════════════ */
      .game-card {
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                    border-color 0.2s ease,
                    box-shadow 0.3s ease;
        will-change: transform;
      }
      .game-card:hover {
        transform: translateY(-3px) scale(1.005);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06);
      }

      .game-card-interactive {
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      .game-card-interactive::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(6, 182, 212, 0.05), transparent 60%);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      .game-card-interactive:hover::before {
        opacity: 1;
      }

      /* ═══════════════════════════════════════════════════════════════════
         GLOW EFFECTS — neon accents for active/highlighted elements
         ═══════════════════════════════════════════════════════════════════ */
      .game-glow-cyan {
        box-shadow: 0 0 15px rgba(6, 182, 212, 0.2), 0 0 40px rgba(6, 182, 212, 0.05);
      }
      .game-glow-purple {
        box-shadow: 0 0 15px rgba(139, 92, 246, 0.2), 0 0 40px rgba(139, 92, 246, 0.05);
      }
      .game-glow-green {
        box-shadow: 0 0 15px rgba(34, 197, 94, 0.2), 0 0 40px rgba(34, 197, 94, 0.05);
      }
      .game-glow-amber {
        box-shadow: 0 0 15px rgba(245, 158, 11, 0.2), 0 0 40px rgba(245, 158, 11, 0.05);
      }

      @keyframes glow-pulse {
        0%, 100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.15); }
        50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1); }
      }
      .game-glow-pulse {
        animation: glow-pulse 2s ease-in-out infinite;
      }

      @keyframes glow-pulse-cyan {
        0%, 100% { box-shadow: 0 0 8px rgba(6, 182, 212, 0.15); }
        50% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1); }
      }
      .glow-pulse-cyan { animation: glow-pulse-cyan 2s ease-in-out infinite; }

      @keyframes glow-pulse-green {
        0%, 100% { box-shadow: 0 0 8px rgba(34, 197, 94, 0.15); }
        50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
      }
      .glow-pulse-green { animation: glow-pulse-green 2s ease-in-out infinite; }

      @keyframes glow-pulse-amber {
        0%, 100% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.15); }
        50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
      }
      .glow-pulse-amber { animation: glow-pulse-amber 2s ease-in-out infinite; }

      /* ═══════════════════════════════════════════════════════════════════
         BUTTON EFFECTS — press, glow, gradient
         ═══════════════════════════════════════════════════════════════════ */
      .game-btn {
        transition: transform 0.1s ease, box-shadow 0.25s ease, background 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      .game-btn:active {
        transform: scale(0.95);
      }
      .game-btn:hover {
        box-shadow: 0 0 20px rgba(6, 182, 212, 0.2);
      }
      .game-btn::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }
      .game-btn:hover::after {
        opacity: 1;
      }

      .game-btn-primary {
        background: linear-gradient(135deg, #06b6d4, #8b5cf6);
        border: none;
        color: white;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
      .game-btn-primary:hover {
        background: linear-gradient(135deg, #22d3ee, #a78bfa);
        box-shadow: 0 0 25px rgba(6, 182, 212, 0.3), 0 0 50px rgba(139, 92, 246, 0.1);
      }

      /* ═══════════════════════════════════════════════════════════════════
         PROGRESS BARS — shimmer, gradient, animated
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .game-progress-shimmer {
        position: relative;
        overflow: hidden;
      }
      .game-progress-shimmer::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        background-size: 200% 100%;
        animation: shimmer 2s linear infinite;
      }

      /* ═══════════════════════════════════════════════════════════════════
         ANIMATIONS — reveal, pop, pulse, float
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes money-flash {
        0% { text-shadow: 0 0 0 transparent; }
        50% { text-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 24px rgba(34, 197, 94, 0.2); }
        100% { text-shadow: 0 0 0 transparent; }
      }
      .money-flash { animation: money-flash 0.6s ease-out; }

      @keyframes resource-gain {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      .resource-gain { animation: resource-gain 0.3s ease-out; }

      @keyframes achievement-pop {
        0% { transform: scale(0.3); opacity: 0; }
        60% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); }
      }
      .achievement-pop {
        animation: achievement-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      @keyframes slide-in-right {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .slide-in-right { animation: slide-in-right 0.3s ease-out; }

      @keyframes float-up-fade {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-40px); opacity: 0; }
      }
      .float-up-fade {
        animation: float-up-fade 1.2s ease-out forwards;
        pointer-events: none;
        position: absolute;
      }

      @keyframes construction-pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      .construction-pulse { animation: construction-pulse 1.5s ease-in-out infinite; }

      /* ═══════════════════════════════════════════════════════════════════
         TAB SYSTEM — active indicator, hover states
         ═══════════════════════════════════════════════════════════════════ */
      .game-tab-active {
        position: relative;
        background: rgba(255, 255, 255, 0.06) !important;
      }
      .game-tab-active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 15%;
        right: 15%;
        height: 2px;
        background: linear-gradient(90deg, #06b6d4, #8b5cf6);
        border-radius: 2px;
        box-shadow: 0 0 8px rgba(6, 182, 212, 0.3);
      }

      /* ═══════════════════════════════════════════════════════════════════
         TOOLTIPS — game-style with neon border
         ═══════════════════════════════════════════════════════════════════ */
      .game-tooltip {
        position: relative;
      }
      .game-tooltip::before {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-6px);
        padding: 6px 10px;
        background: rgba(5, 5, 20, 0.95);
        border: 1px solid rgba(6, 182, 212, 0.2);
        border-radius: 8px;
        color: #e2e8f0;
        font-size: 11px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
        z-index: 50;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 15px rgba(6, 182, 212, 0.05);
      }
      .game-tooltip:hover::before {
        opacity: 1;
      }

      /* ═══════════════════════════════════════════════════════════════════
         SCROLLBAR — slim, themed
         ═══════════════════════════════════════════════════════════════════ */
      .game-scroll::-webkit-scrollbar { width: 4px; }
      .game-scroll::-webkit-scrollbar-track { background: transparent; }
      .game-scroll::-webkit-scrollbar-thumb {
        background: rgba(6, 182, 212, 0.15);
        border-radius: 4px;
      }
      .game-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(6, 182, 212, 0.3);
      }

      /* Tab bar — horizontal scroll with hidden scrollbar */
      .game-tab-bar {
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
      }
      .game-tab-bar::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
      }

      /* ═══════════════════════════════════════════════════════════════════
         TYPOGRAPHY — game display text
         ═══════════════════════════════════════════════════════════════════ */
      .game-heading {
        font-weight: 800;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .game-number {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        letter-spacing: -0.01em;
      }

      .game-label {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #64748b;
      }

      /* ═══════════════════════════════════════════════════════════════════
         SECTION DIVIDERS — gradient line separators
         ═══════════════════════════════════════════════════════════════════ */
      .game-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.15), transparent);
        border: none;
        margin: 16px 0;
      }

      /* ═══════════════════════════════════════════════════════════════════
         STATUS BADGES — tier, rarity, state indicators
         ═══════════════════════════════════════════════════════════════════ */
      .game-badge-t1 { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); }
      .game-badge-t2 { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); }
      .game-badge-t3 { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
      .game-badge-t4 { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.2); }
      .game-badge-t5 { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }

      /* ═══════════════════════════════════════════════════════════════════
         BACKGROUND EFFECTS — subtle animated nebula
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes nebula-drift {
        0% { transform: translate(0, 0) rotate(0deg); }
        33% { transform: translate(20px, -10px) rotate(2deg); }
        66% { transform: translate(-15px, 15px) rotate(-1deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }
      .game-nebula-bg {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
      }
      .game-nebula-bg::before {
        content: '';
        position: absolute;
        top: 20%;
        left: 30%;
        width: 600px;
        height: 400px;
        background: radial-gradient(ellipse, rgba(6, 182, 212, 0.03), transparent 70%);
        animation: nebula-drift 30s ease-in-out infinite;
      }
      .game-nebula-bg::after {
        content: '';
        position: absolute;
        bottom: 30%;
        right: 20%;
        width: 500px;
        height: 350px;
        background: radial-gradient(ellipse, rgba(139, 92, 246, 0.02), transparent 70%);
        animation: nebula-drift 25s ease-in-out infinite reverse;
      }

      /* ═══════════════════════════════════════════════════════════════════
         TUTORIAL — pulsing tab highlight for onboarding
         ═══════════════════════════════════════════════════════════════════ */
      @keyframes tutorial-pulse {
        0%, 100% {
          background-color: rgba(6, 182, 212, 0.06);
          box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
        }
        50% {
          background-color: rgba(6, 182, 212, 0.18);
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.25), inset 0 0 8px rgba(6, 182, 212, 0.08);
        }
      }
      .game-tutorial-pulse {
        animation: tutorial-pulse 1.8s ease-in-out infinite;
        border-radius: 8px;
      }

      /* ═══════════════════════════════════════════════════════════════════
         MOBILE OPTIMIZATIONS
         ═══════════════════════════════════════════════════════════════════ */
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

      @media (max-width: 640px) {
        .game-card:hover {
          transform: none; /* Disable hover lift on touch devices */
        }
      }
    `}</style>
  );
}
