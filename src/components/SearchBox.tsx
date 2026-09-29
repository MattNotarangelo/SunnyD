import { useEffect, useState } from "react";
import { searchPlaces, type GeocodeResult } from "../api/geocode";

const DEBOUNCE_MS = 300;

interface Props {
  onSelect: (result: GeocodeResult) => void;
}

export function SearchBox({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [error, setError] = useState(false);

  const onChange = (value: string) => {
    setQuery(value);
    setError(false);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
    }
  };

  useEffect(() => {
    if (query.trim().length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((r) => {
          setResults(r);
          setHighlighted(0);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults([]);
          setOpen(true);
          setError(true);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const select = (result: GeocodeResult) => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(result);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlighted]) select(results[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search for a place..."
        aria-label="Search for a place"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="search-results"
        aria-activedescendant={open && results[highlighted] ? `search-option-${highlighted}` : undefined}
        className="h-11 w-full rounded-lg border border-gray-700 bg-gray-900/95 px-3 text-base text-white shadow-lg placeholder-gray-400 focus:border-amber-400 md:h-10 md:text-sm"
      />
      {open && (
        <ul
          role="listbox"
          id="search-results"
          aria-label="Places"
          className="absolute inset-x-0 mt-1 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
        >
          {error && (
            <li className="px-3 py-2 text-sm text-rose-400 md:text-xs">Search failed — try again</li>
          )}
          {!error && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400 md:text-xs">No results</li>
          )}
          {results.map((r, i) => (
            <li
              key={`${r.lat}:${r.lon}:${r.label}`}
              id={`search-option-${i}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={(e) => {
                e.preventDefault();
                select(r);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`cursor-pointer truncate px-3 py-2 text-sm pointer-coarse:py-3 md:text-xs ${
                i === highlighted ? "bg-gray-700 text-white" : "text-gray-300"
              }`}
            >
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
