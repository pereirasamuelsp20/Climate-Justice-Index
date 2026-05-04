import { useState, useRef, useEffect, useCallback } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  label?: string;
  id?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  label,
  id,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter suggestions based on input
  const filtered = inputValue.trim()
    ? suggestions.filter((s) =>
        s.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 8) // Limit to 8 results for performance
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const selectItem = useCallback((item: string) => {
    setInputValue(item);
    onChange(item);
    setIsOpen(false);
    setHighlightIndex(-1);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) {
      if (e.key === 'ArrowDown' && filtered.length > 0) {
        setIsOpen(true);
        setHighlightIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          selectItem(filtered[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setIsOpen(val.trim().length > 0);
    setHighlightIndex(-1);
  };

  // Highlight matching text in suggestion
  const highlightMatch = (text: string) => {
    if (!inputValue.trim()) return text;
    const idx = text.toLowerCase().indexOf(inputValue.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-blue-400 font-semibold">{text.slice(idx, idx + inputValue.length)}</span>
        {text.slice(idx + inputValue.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={() => {
          if (inputValue.trim() && filtered.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
      />

      {/* Dropdown */}
      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1d2e] shadow-xl shadow-black/40"
          role="listbox"
        >
          {filtered.map((item, i) => (
            <li
              key={item}
              role="option"
              aria-selected={i === highlightIndex}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                i === highlightIndex
                  ? 'bg-blue-600/20 text-white'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur before click
                selectItem(item);
              }}
            >
              {highlightMatch(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
