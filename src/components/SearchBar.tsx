'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, BookOpen, FolderTree, FileQuestion, Calendar } from 'lucide-react';

interface Suggestion {
  type: 'Discipline' | 'Subdiscipline' | 'Topic' | 'Question' | 'Year';
  label: string;
  href: string;
  meta?: string;
}

export function SearchBar({
  initialQuery = '',
  onQueryReset,
  className = '',
}: {
  initialQuery?: string;
  onQueryReset?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setOpen(true);
          setActiveIndex(-1);
        }
      } catch {}
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
    if (onQueryReset) onQueryReset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setOpen(false);
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/question-bank');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      setOpen(false);
      router.push(suggestions[activeIndex].href);
    } else if (e.key === 'Escape') {
      if (open) {
        setOpen(false);
      } else if (query) {
        handleClear();
      }
    }
  };

  const highlightMatch = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-blue-100 text-navy-900 font-semibold rounded px-0.5">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const iconForType = (type: Suggestion['type']) => {
    switch (type) {
      case 'Discipline':
        return <BookOpen className="w-4 h-4 text-medblue-600 shrink-0" />;
      case 'Subdiscipline':
      case 'Topic':
        return <FolderTree className="w-4 h-4 text-medblue-600 shrink-0" />;
      case 'Year':
        return <Calendar className="w-4 h-4 text-medblue-600 shrink-0" />;
      default:
        return <FileQuestion className="w-4 h-4 text-medblue-600 shrink-0" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
      <form
        onSubmit={handleSubmit}
        role="search"
        className="flex items-center w-full min-w-0 bg-white rounded-2xl sm:rounded-full shadow-lg border border-white/40 pl-3 sm:pl-4 pr-1.5 py-1.5 gap-1.5 sm:gap-2 focus-within:ring-2 focus-within:ring-medblue-400"
      >
        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0 ml-0.5 sm:ml-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search topics or keywords..."
          aria-label="Search medical revision topics and questions"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="medvault-search-listbox"
          className="flex-1 min-w-0 w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base truncate focus:outline-none"
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="w-9 h-9 sm:min-w-[44px] sm:min-h-[44px] sm:-my-1.5 flex items-center justify-center text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-medblue-500 rounded-full shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          className="bg-medblue-600 hover:bg-medblue-700 text-white font-semibold text-xs sm:text-base px-3.5 sm:px-6 py-2 rounded-xl sm:rounded-full transition-colors shrink-0"
        >
          Search
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          id="medvault-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-80 overflow-y-auto"
        >
          {suggestions.map((item, idx) => (
            <li
              key={`${item.type}-${item.href}-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={() => {
                setOpen(false);
                router.push(item.href);
              }}
              className={`flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer text-xs sm:text-sm border-b border-slate-100 last:border-none ${
                idx === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                {iconForType(item.type)}
                <span className="text-slate-800 truncate">{highlightMatch(item.label)}</span>
              </div>
              <span className="text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                {item.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}