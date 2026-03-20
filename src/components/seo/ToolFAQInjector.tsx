'use client';

import { usePathname } from 'next/navigation';
import FAQSchema from './FAQSchema';
import { TOOL_FAQS } from '@/lib/tool-faqs';

/**
 * Auto-injects FAQ schema on tool pages based on the current pathname.
 * Drop this component anywhere in a tool page and it will render
 * the appropriate FAQ structured data for Google rich snippets.
 *
 * Also renders a visible FAQ accordion if showAccordion is true.
 */
export default function ToolFAQInjector({ showAccordion = false }: { showAccordion?: boolean }) {
  const pathname = usePathname();

  // Extract the tool slug from the pathname
  const slug = pathname?.replace(/^\//, '').split('/')[0] || '';
  const faqs = TOOL_FAQS[slug];

  if (!faqs || faqs.length === 0) return null;

  return (
    <>
      <FAQSchema items={faqs} />
      {showAccordion && (
        <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-white text-sm font-semibold mb-3">Frequently Asked Questions</h3>
          <div className="space-y-2">
            {faqs.map(faq => (
              <details key={faq.question} className="group">
                <summary className="flex items-center justify-between cursor-pointer py-2 text-white text-xs font-medium hover:text-cyan-300 transition-colors list-none">
                  {faq.question}
                  <svg className="w-3.5 h-3.5 text-slate-500 group-open:rotate-180 transition-transform shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="text-slate-400 text-xs leading-relaxed pb-2 pl-0">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
