'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

const QUESTIONS = [
  { q: 'What altitude is geostationary orbit (GEO)?', options: ['2,000 km', '20,200 km', '35,786 km', '400,000 km'], answer: 2 },
  { q: 'Which was the first artificial satellite?', options: ['Explorer 1', 'Sputnik 1', 'Vanguard 1', 'Luna 1'], answer: 1 },
  { q: 'How fast does the ISS orbit Earth?', options: ['8,000 km/h', '17,500 km/h', '28,000 km/h', '40,000 km/h'], answer: 2 },
  { q: 'What fuel does SpaceX Starship use?', options: ['RP-1 + LOX', 'Hydrogen + LOX', 'Methane + LOX', 'Hydrazine'], answer: 2 },
  { q: 'Who was the first human in space?', options: ['Alan Shepard', 'John Glenn', 'Yuri Gagarin', 'Neil Armstrong'], answer: 2 },
  { q: 'What does LEO stand for?', options: ['Light Earth Orbit', 'Low Earth Orbit', 'Lunar Exploration Orbit', 'Linear Elliptical Orbit'], answer: 1 },
  { q: 'How many GPS satellites are operational?', options: ['12', '24', '31', '48'], answer: 2 },
  { q: 'What year did humans first walk on the Moon?', options: ['1965', '1967', '1969', '1971'], answer: 2 },
  { q: 'What is the Kp index used to measure?', options: ['Solar luminosity', 'Geomagnetic activity', 'Orbital velocity', 'Rocket thrust'], answer: 1 },
  { q: 'Which company operates the largest satellite constellation?', options: ['OneWeb', 'Amazon', 'SpaceX', 'Planet Labs'], answer: 2 },
  { q: 'What is ITAR?', options: ['A rocket engine type', 'A satellite bus standard', 'US export control regulations', 'An orbital trajectory algorithm'], answer: 2 },
  { q: 'How long does it take the ISS to orbit Earth once?', options: ['45 minutes', '90 minutes', '2 hours', '24 hours'], answer: 1 },
  { q: 'What is delta-v?', options: ['Change in velocity', 'Orbital decay rate', 'Atmospheric drag coefficient', 'Fuel mass ratio'], answer: 0 },
  { q: 'Which planet has the most known moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 1 },
  { q: 'What is the Karman line?', options: ['Edge of the solar system', 'Boundary of space at 100 km', 'Geostationary orbit altitude', 'Van Allen belt boundary'], answer: 1 },
];

export default function SpaceQuizPage() {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);

  // Shuffle and pick 10 questions on mount
  const [questions] = useState(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  });

  const handleSelect = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === questions[current].answer) {
      setScore((s) => s + 1);
    }
  }, [selected, current, questions]);

  const handleNext = useCallback(() => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowResult(false);
    }
  }, [current, questions.length]);

  const handleRestart = useCallback(() => {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setShowResult(false);
    setFinished(false);
  }, []);

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const emoji = pct >= 80 ? '🚀' : pct >= 50 ? '🛰️' : '🔭';
    return (
      <div className="min-h-screen bg-space-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <span className="text-6xl block mb-4">{emoji}</span>
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h1>
          <p className="text-2xl text-cyan-400 font-bold mb-1">{score}/{questions.length}</p>
          <p className="text-slate-400 mb-6">
            {pct >= 80 ? 'Impressive! You really know your space.' :
             pct >= 50 ? 'Good knowledge! Keep learning.' :
             'Keep exploring — there\'s always more to learn.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={handleRestart} className="px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors">
              Play Again
            </button>
            <Link href="/glossary" className="px-5 py-2.5 text-sm font-medium text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors">
              Study the Glossary
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="min-h-screen bg-space-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-slate-500 text-sm">Question {current + 1}/{questions.length}</span>
          <span className="text-cyan-400 text-sm font-medium">Score: {score}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/[0.06] rounded-full mb-8">
          <div
            className="h-1 bg-cyan-500 rounded-full transition-all duration-300"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <h2 className="text-xl font-semibold text-white mb-6 leading-relaxed">{q.q}</h2>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {q.options.map((opt, idx) => {
            let style = 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] text-slate-300';
            if (showResult && idx === q.answer) {
              style = 'border-green-500/40 bg-green-500/10 text-green-400';
            } else if (showResult && idx === selected && idx !== q.answer) {
              style = 'border-red-500/40 bg-red-500/10 text-red-400';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-xl border transition-all text-sm font-medium ${style} ${showResult ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
              >
                <span className="text-slate-500 mr-3">{String.fromCharCode(65 + idx)}</span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        {showResult && (
          <button
            onClick={handleNext}
            className="w-full py-3 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors"
          >
            {current + 1 >= questions.length ? 'See Results' : 'Next Question'}
          </button>
        )}

        {/* Home link */}
        <div className="text-center mt-6">
          <Link href="/discover" className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
            Back to Discover
          </Link>
        </div>
      </div>
    </div>
  );
}
