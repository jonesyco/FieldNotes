import { usePOIStore } from '../../store/poiStore';

interface SearchBarProps {
  disabled?: boolean;
}

export default function SearchBar({ disabled = false }: SearchBarProps) {
  const { filter, setFilter } = usePOIStore();
  return (
    <div className="search-bar">
      <span className="search-icon">⌕</span>
      <input
        type="text"
        className="search-input"
        placeholder={disabled ? 'SEQUENCE MODE LOCKS SEARCH' : 'SEARCH TITLE, TAG, NEIGHBORHOOD...'}
        value={filter.search}
        onChange={(e) => setFilter({ search: e.target.value })}
        aria-label="Search points of interest"
        disabled={disabled}
      />
      {filter.search && (
        <button
          className="search-clear"
          onClick={() => setFilter({ search: '' })}
          aria-label="Clear search"
          disabled={disabled}
        >
          ✕
        </button>
      )}
    </div>
  );
}
