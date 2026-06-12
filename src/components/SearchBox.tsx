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
    <div className="fixed z-20 w-64 top-[4.2rem] left-3 md:top-3 md:left-[21.5rem]">
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
        className="w-full bg-gray-900/80 backdrop-blur border border-gray-700 text-white text-sm rounded-lg px-3 py-2 shadow-lg placeholder-gray-500 focus:outline-none focus:border-amber-400"
      />
      {open && (
        <ul
          role="listbox"
          className="mt-1 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg shadow-xl overflow-hidden"
        >
          {error && (
            <li className="px-3 py-2 text-xs text-rose-400">Search failed — try again</li>
          )}
          {!error && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500">No results</li>
          )}
          {results.map((r, i) => (
            <li
              key={`${r.lat}:${r.lon}:${r.label}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={(e) => {
                e.preventDefault();
                select(r);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-3 py-2 text-xs cursor-pointer truncate ${
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
