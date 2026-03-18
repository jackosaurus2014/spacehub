'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Daily Space Quiz — one question per day from a rotating pool       */
/* ------------------------------------------------------------------ */

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'Approximately how many active Starlink satellites are currently in orbit?',
    options: ['1,000', '3,500', '7,000', '12,000'],
    correctIndex: 2,
    explanation:
      'SpaceX has launched over 7,000 operational Starlink satellites as of early 2026, making it the largest satellite constellation ever deployed.',
  },
  {
    question: 'What is the primary fuel used by the SpaceX Raptor engine?',
    options: ['Kerosene (RP-1)', 'Liquid Hydrogen', 'Liquid Methane', 'Solid Propellant'],
    correctIndex: 2,
    explanation:
      'The Raptor engine uses liquid methane (CH4) and liquid oxygen (LOX), enabling full-flow staged combustion and potential in-situ fuel production on Mars.',
  },
  {
    question: 'Which orbit type is the International Space Station in?',
    options: [
      'Geostationary (GEO)',
      'Low Earth Orbit (LEO)',
      'Medium Earth Orbit (MEO)',
      'Sun-Synchronous Orbit (SSO)',
    ],
    correctIndex: 1,
    explanation:
      'The ISS orbits in Low Earth Orbit at roughly 408 km (253 mi) altitude, completing about 16 orbits per day.',
  },
  {
    question: 'What was the first privately-funded spacecraft to reach orbit?',
    options: ['SpaceShipOne', 'Falcon 1', 'Electron', 'New Shepard'],
    correctIndex: 1,
    explanation:
      "SpaceX's Falcon 1 became the first privately developed liquid-fueled rocket to reach orbit on September 28, 2008.",
  },
  {
    question: 'How long does it take light to travel from the Sun to Earth?',
    options: ['About 1 minute', 'About 8 minutes', 'About 30 minutes', 'About 1 hour'],
    correctIndex: 1,
    explanation:
      'Light takes approximately 8 minutes and 20 seconds to travel the ~150 million km from the Sun to Earth.',
  },
  {
    question: 'What is the estimated size of the global space economy?',
    options: ['$150 billion', '~$630 billion', '~$1.2 trillion', '~$3 trillion'],
    correctIndex: 1,
    explanation:
      'The global space economy is valued at approximately $630 billion, with projections to exceed $1 trillion by 2030.',
  },
  {
    question: 'Which company is building the Kuiper satellite constellation?',
    options: ['SpaceX', 'OneWeb', 'Amazon', 'Telesat'],
    correctIndex: 2,
    explanation:
      'Amazon is deploying Project Kuiper, a planned constellation of 3,236 LEO satellites to provide global broadband connectivity.',
  },
  {
    question: 'What altitude defines the Karman Line (edge of space)?',
    options: ['50 km', '80 km', '100 km', '200 km'],
    correctIndex: 2,
    explanation:
      'The Karman Line at 100 km (62 miles) above sea level is the internationally recognized boundary of space, defined by the FAI.',
  },
  {
    question: 'Which planet has the tallest known volcano in our solar system?',
    options: ['Earth', 'Venus', 'Mars', 'Jupiter'],
    correctIndex: 2,
    explanation:
      'Olympus Mons on Mars stands at about 21.9 km (13.6 miles) high, nearly 2.5 times the height of Mount Everest above sea level.',
  },
  {
    question: 'What is the primary mission of the Artemis program?',
    options: [
      'Mars colonization',
      'Return humans to the Moon',
      'Build a space hotel',
      'Launch a solar probe',
    ],
    correctIndex: 1,
    explanation:
      "NASA's Artemis program aims to return humans to the Moon, establish a sustainable presence, and prepare for future crewed missions to Mars.",
  },
  {
    question: 'How many countries have independently launched satellites into orbit?',
    options: ['5', '11', '15', '25+'],
    correctIndex: 1,
    explanation:
      'Approximately 11 countries have independently launched satellites using their own launch vehicles, though over 90 countries operate satellites.',
  },
  {
    question: 'What does GEO stand for in satellite orbits?',
    options: [
      'Global Earth Observation',
      'Geostationary Earth Orbit',
      'General Equatorial Orbit',
      'Geocentric Elliptical Orbit',
    ],
    correctIndex: 1,
    explanation:
      'Geostationary Earth Orbit (GEO) is at ~35,786 km altitude where satellites match Earth\'s rotation, appearing stationary over one point.',
  },
  {
    question: 'Which rocket holds the record for most launches?',
    options: ['Atlas V', 'Ariane 5', 'Falcon 9', 'Soyuz'],
    correctIndex: 3,
    explanation:
      'The Soyuz family of rockets has conducted over 1,900 launches since the 1960s, making it the most-launched orbital rocket in history.',
  },
  {
    question: 'What is orbital debris commonly called?',
    options: ['Star dust', 'Space junk', 'Cosmic waste', 'Void particles'],
    correctIndex: 1,
    explanation:
      'Orbital debris, commonly known as "space junk," includes defunct satellites, spent rocket stages, and fragmentation debris. Over 36,000 objects larger than 10 cm are tracked.',
  },
  {
    question: 'What is the approximate cost per kg to LEO on Falcon 9?',
    options: ['$500', '$2,700', '$10,000', '$25,000'],
    correctIndex: 1,
    explanation:
      "SpaceX's Falcon 9 offers roughly $2,700 per kg to LEO, a dramatic reduction from the $54,500/kg of the Space Shuttle era.",
  },
];

const STORAGE_KEY = 'spacenexus-quiz-state';

interface QuizState {
  lastAnsweredDate: string; // ISO date string (YYYY-MM-DD)
  streak: number;
  totalCorrect: number;
  totalAnswered: number;
  selectedIndex: number | null;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTodayQuestionIndex(): number {
  // Deterministic daily rotation based on date
  const today = new Date();
  const daysSinceEpoch = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % QUIZ_QUESTIONS.length;
}

function loadQuizState(): QuizState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {
    lastAnsweredDate: '',
    streak: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    selectedIndex: null,
  };
}

function saveQuizState(state: QuizState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export default function SpaceQuiz() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<QuizState>({
    lastAnsweredDate: '',
    streak: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    selectedIndex: null,
  });
  const [animateResult, setAnimateResult] = useState(false);

  const todayKey = useMemo(() => getTodayKey(), []);
  const questionIndex = useMemo(() => getTodayQuestionIndex(), []);
  const question = QUIZ_QUESTIONS[questionIndex];
  const alreadyAnswered = state.lastAnsweredDate === todayKey;
  const isCorrect = state.selectedIndex === question.correctIndex;

  useEffect(() => {
    const loaded = loadQuizState();
    // Reset selectedIndex if answered on a different day
    if (loaded.lastAnsweredDate !== getTodayKey()) {
      loaded.selectedIndex = null;
    }
    setState(loaded);
    setMounted(true);
  }, []);

  function handleAnswer(idx: number) {
    if (alreadyAnswered) return;

    const correct = idx === question.correctIndex;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streakContinues = state.lastAnsweredDate === yesterday;

    const newState: QuizState = {
      lastAnsweredDate: todayKey,
      streak: correct ? (streakContinues ? state.streak + 1 : 1) : 0,
      totalCorrect: state.totalCorrect + (correct ? 1 : 0),
      totalAnswered: state.totalAnswered + 1,
      selectedIndex: idx,
    };

    setState(newState);
    saveQuizState(newState);
    setAnimateResult(true);
  }

  if (!mounted) {
    return (
      <div className="card p-5 border border-white/[0.06] bg-white/[0.03]">
        <div className="h-5 w-40 bg-white/[0.08] rounded animate-pulse mb-3" />
        <div className="h-4 w-full bg-white/[0.06] rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-white/[0.05] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-indigo-500/[0.04] relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-violet-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
          <h3 className="text-sm font-bold text-white">Daily Space Quiz</h3>
        </div>
        {state.streak > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/25">
            <span className="text-amber-400 text-xs">&#x1F525;</span>
            <span className="text-xs font-bold text-amber-300">{state.streak}</span>
            <span className="text-[10px] text-amber-400/70">streak</span>
          </div>
        )}
      </div>

      {/* Question */}
      <p className="text-sm text-white/90 font-medium mb-4 leading-relaxed">
        {question.question}
      </p>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {question.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx); // A, B, C, D
          let optionClasses =
            'w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all duration-200 border ';

          if (!alreadyAnswered) {
            optionClasses +=
              'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/15 text-white/80 hover:text-white cursor-pointer';
          } else if (idx === question.correctIndex) {
            optionClasses +=
              'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
          } else if (idx === state.selectedIndex) {
            optionClasses +=
              'bg-red-500/15 border-red-500/30 text-red-300';
          } else {
            optionClasses +=
              'bg-white/[0.02] border-white/[0.04] text-white/30';
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={alreadyAnswered}
              className={optionClasses}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  alreadyAnswered && idx === question.correctIndex
                    ? 'bg-emerald-500/30 text-emerald-300'
                    : alreadyAnswered && idx === state.selectedIndex
                      ? 'bg-red-500/30 text-red-300'
                      : 'bg-white/[0.08] text-white/50'
                }`}
              >
                {letter}
              </span>
              <span>{option}</span>
              {alreadyAnswered && idx === question.correctIndex && (
                <svg
                  className="w-4 h-4 ml-auto text-emerald-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
              {alreadyAnswered && idx === state.selectedIndex && idx !== question.correctIndex && (
                <svg
                  className="w-4 h-4 ml-auto text-red-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Result / Explanation */}
      {alreadyAnswered && (
        <div
          className={`rounded-lg p-3.5 text-xs leading-relaxed ${
            animateResult ? 'animate-fade-in' : ''
          } ${
            isCorrect
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-bold text-sm">
              {isCorrect ? 'Correct!' : 'Not quite!'}
            </span>
            {isCorrect && state.streak > 1 && (
              <span className="text-[10px] text-amber-400 font-semibold">
                &#x1F525; {state.streak}-day streak!
              </span>
            )}
          </div>
          <p className="text-white/60">{question.explanation}</p>
        </div>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-500">
            {state.totalCorrect}/{state.totalAnswered} correct
          </span>
          {state.totalAnswered > 0 && (
            <span className="text-[10px] text-slate-500">
              {Math.round((state.totalCorrect / state.totalAnswered) * 100)}% accuracy
            </span>
          )}
        </div>
        {alreadyAnswered && (
          <span className="text-[10px] text-slate-500">
            New question tomorrow
          </span>
        )}
      </div>

      {/* Daily Digest CTA */}
      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <Link
          href="/daily-digest"
          className="inline-flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300 font-medium transition-colors"
        >
          Read today&apos;s Space Digest
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
