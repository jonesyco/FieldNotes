import { useState, useRef, useEffect, useCallback } from 'react';
import { searchPlace, type GeoResult } from '../../lib/geocode';
import { usePOIStore } from '../../store/poiStore';

export default function LocationSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const setFlyTo = usePOIStore((s) => s.setFlyTo);
  const setSearchPreview = usePOIStore((s) => s.setSearchPreview);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await searchPlace(q);
      setResults(res);
      setOpen(res.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 350);
  };

  const handleSelect = (result: GeoResult) => {
    setFlyTo({ center: [parseFloat(result.lon), parseFloat(result.lat)], zoom: 14, saveReturn: true });
    setSearchPreview({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), label: result.display_name });
    setQuery(result.display_name.split(',').slice(0, 2).join(','));
    setOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    setSearchPreview(null);
    inputRef.current?.focus();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="location-search" ref={containerRef}>
      <div className="location-search__input-row">
        <span className="location-search__icon" aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          className="location-search__input"
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="SEARCH LOCATION…"
          aria-label="Search for a location"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <span className="location-search__spinner" aria-hidden="true" />}
        {query && !loading && (
          <button className="location-search__clear" onClick={handleClear} aria-label="Clear search">✕</button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="location-search__results" role="listbox">
          {results.map((r) => {
            const parts = r.display_name.split(', ');
            const primary = parts[0];
            const secondary = parts.slice(1, 3).join(', ');
            return (
              <li
                key={r.place_id}
                className="location-search__result"
                role="option"
                onMouseDown={() => handleSelect(r)}
              >
                <span className="location-search__result-primary">{primary}</span>
                {secondary && <span className="location-search__result-secondary">{secondary}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
