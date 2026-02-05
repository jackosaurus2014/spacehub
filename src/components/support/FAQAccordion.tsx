'use client';

import { useState, useMemo } from 'react';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  categories: { id: string; label: string; icon: string }[];
  searchQuery?: string;
}

interface AccordionItemProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  searchQuery?: string;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-cyan-500/30 text-cyan-300 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function AccordionItem({ item, isOpen, onToggle, searchQuery }: AccordionItemProps) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-4 px-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-slate-900 pr-4">
          {searchQuery ? highlightText(item.question, searchQuery) : item.question}
        </span>
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <svg
            className="w-4 h-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-4 text-slate-500 leading-relaxed">
          {searchQuery ? highlightText(item.answer, searchQuery) : item.answer}
        </div>
      </div>
    </div>
  );
}

export default function FAQAccordion({ items, categories, searchQuery = '' }: FAQAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (activeCategory) {
      filtered = filtered.filter((item) => item.category === activeCategory);
    }

    return filtered;
  }, [items, searchQuery, activeCategory]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, FAQItem[]> = {};

    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    return groups;
  }, [filteredItems]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setOpenItems(new Set(filteredItems.map((item) => item.id)));
  };

  const collapseAll = () => {
    setOpenItems(new Set());
  };

  if (filteredItems.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No results found</h3>
        <p className="text-slate-500">
          Try adjusting your search or browse a different category.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeCategory === null
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:border-slate-300'
          }`}
        >
          All Categories
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeCategory === category.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <span>{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {/* Expand/Collapse Controls */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">
          {filteredItems.length} question{filteredItems.length !== 1 ? 's' : ''} found
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Expand All
          </button>
          <span className="text-slate-400">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* FAQ Groups */}
      {activeCategory ? (
        // Single category view
        <div className="card overflow-hidden">
          {filteredItems.map((item) => (
            <AccordionItem
              key={item.id}
              item={item}
              isOpen={openItems.has(item.id)}
              onToggle={() => toggleItem(item.id)}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      ) : (
        // Grouped by category view
        Object.entries(groupedItems).map(([categoryId, categoryItems]) => {
          const category = categories.find((c) => c.id === categoryId);
          return (
            <div key={categoryId} className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span className="text-xl">{category?.icon}</span>
                {category?.label || categoryId}
              </h3>
              <div className="card overflow-hidden">
                {categoryItems.map((item) => (
                  <AccordionItem
                    key={item.id}
                    item={item}
                    isOpen={openItems.has(item.id)}
                    onToggle={() => toggleItem(item.id)}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
